"""Heritage asset checks + photo-registered renders.

blender -b <master.blend> --python-exit-code 1 -P blender/heritage_validate.py -- <profile.json> <out_dir>

Writes geometry-checks.json, silhouette.png (all meshes, flat white) and overlay-render.png
(workbench material colours), both on the reference photo's own pixel grid. The camera is
derived from the calibration only; no post-render alignment is applied.
"""
import bpy, bmesh, math, json, sys, os
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

args = sys.argv[sys.argv.index('--') + 1:]
P = json.load(open(args[0])); out = args[1]; os.makedirs(out, exist_ok=True)
CAL = P['calibration']; S = CAL['mm_per_px'] / 1000
RP = Vector(CAL['wheels']['rear']['centre']); FP = Vector(CAL['wheels']['front']['centre'])
U = (FP - RP).normalized(); ND = Vector((-U.y, U.x)); R = CAL['tyre_outer_diameter_mm'] / 2000
bb_px = Vector(P['points_px']['bb'])
bb_a, bb_b = (bb_px - RP).dot(U) * S, (bb_px - RP).dot(ND) * S
sc = bpy.context.scene; checks = {}; issues = []


def px_to_world(px):
    d = Vector(px) - RP
    return Vector((d.dot(U) * S - bb_a, 0, R - d.dot(ND) * S))


for name in ('frame', 'fork', 'seatpost'):
    o = bpy.data.objects[name]; bm = bmesh.new(); bm.from_mesh(o.data)
    d = {'vertices': len(bm.verts), 'triangles': sum(len(f.verts) - 2 for f in bm.faces),
         'boundary_edges': sum(e.is_boundary for e in bm.edges), 'nonmanifold_edges': sum(not e.is_manifold for e in bm.edges),
         'finite': all(math.isfinite(c) for v in bm.verts for c in v.co), 'dimensions_m': [round(x, 4) for x in o.dimensions]}
    checks[name] = d; bm.free()
    if not d['finite'] or d['nonmanifold_edges'] or d['boundary_edges']:
        issues.append(name + ' mesh topology')

bpy.context.view_layer.update()
front = bpy.data.objects['wheel_front'].matrix_world.translation
rear = bpy.data.objects['wheel_rear'].matrix_world.translation
bb = bpy.data.objects['crankset'].matrix_world.translation
g = {'wheelbase': 1000 * (front.x - rear.x), 'chainstay': 1000 * (bb - rear).length, 'bb_drop': 1000 * (rear.z - bb.z),
     'axle_height_difference': 1000 * abs(front.z - rear.z), 'axle_lateral_difference': 1000 * abs(front.y - rear.y)}
checks['geometry_mm'] = {k: round(v, 2) for k, v in g.items()}
# Contract: the model must reproduce the calibrated photo measurements exactly (same transform).
want_wb = CAL['measured_wheelbase_mm']
if abs(g['wheelbase'] - want_wb) > 0.5: issues.append('wheelbase differs from calibration')
if g['axle_height_difference'] > .01 or g['axle_lateral_difference'] > .01: issues.append('axle alignment')

pub = P['published']['geometry']
size = CAL['matched_size']; i = pub['sizes'].index(size)
cmp = {}
wb = pub['wheelbase_mm'][i]
cmp['wheelbase_published'] = wb
cs = pub.get('chainstay_mm')
if cs is not None:
    lo, hi = (cs, cs) if isinstance(cs, (int, float)) else cs
    cmp['chainstay_published'] = cs
    cmp['chainstay_within_published'] = lo - 3 <= g['chainstay'] <= hi + 3
checks['published_comparison'] = cmp

# Component centres (world-space bounds, not pivots).
checks['component_centres_mm'] = {}
for name, anchor in (('chainrings', bb), ('cassette', rear)):
    o = bpy.data.objects[name]; v = [o.matrix_world @ p.co for p in o.data.vertices]
    c = Vector([(min(p[k] for p in v) + max(p[k] for p in v)) / 2 for k in range(3)])
    err = 1000 * math.hypot(c.x - anchor.x, c.z - anchor.z)
    checks['component_centres_mm'][name] = round(err, 3)
    if err > 3: issues.append(name + ' misplaced')

# Photo-registered orthographic camera.
W_px, H_px = P['photo']['size']  # written by tools/heritage_calibrate.py
cam = bpy.data.cameras.new('PhotoRegistered'); cam.type = 'ORTHO'; cam.ortho_scale = W_px * S
co = bpy.data.objects.new('PhotoRegistered', cam); sc.collection.objects.link(co)
centre = px_to_world((W_px / 2, H_px / 2))
co.location = centre + Vector((0, -5, 0))
roll = math.atan2(U.y, U.x)  # image y down; positive = axle line descends to the right
co.rotation_euler = (math.pi / 2, 0, 0)
co.matrix_world = Matrix.Translation(co.location) @ Matrix.Rotation(-roll, 4, 'Y') @ Matrix.Rotation(math.pi / 2, 4, 'X')
sc.camera = co
sc.render.resolution_x = W_px; sc.render.resolution_y = H_px; sc.render.resolution_percentage = 100
bpy.context.view_layer.update()
proj = {}
for name, wp, px in (('rear_axle', rear, RP), ('front_axle', front, FP), ('bb', bb, bb_px)):
    v = world_to_camera_view(sc, co, wp)
    q = Vector((v.x * W_px, (1 - v.y) * H_px))
    proj[name] = round((q - Vector(px)).length, 3)
checks['projection_residual_px'] = proj
if max(proj.values()) > .5: issues.append('camera registration')

sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.film_transparent = True
sh = sc.display.shading
sh.light = 'FLAT'; sh.color_type = 'SINGLE'; sh.single_color = (1, 1, 1)
sh.show_shadows = False; sh.show_cavity = False; sh.show_specular_highlight = False
for o in sc.objects: o.hide_render = bool(o.get('baked') or o.get('obsolete'))
sc.render.filepath = os.path.join(out, 'silhouette.png'); bpy.ops.render.render(write_still=True)
# Hardware-only silhouette: everything except frame, fork and their graphics. The comparison skips
# frame edges within 10 mm of hardware, as the 2027 CFR check excludes BB, derailleur and accessories.
frame_like = {'frame', 'fork'}
def is_frame(o):
    while o is not None:
        if o.name in frame_like: return True
        o = o.parent
    return False
for o in sc.objects: o.hide_render = bool(o.get('baked') or o.get('obsolete')) or is_frame(o)
sc.render.filepath = os.path.join(out, 'hardware.png'); bpy.ops.render.render(write_still=True)
for o in sc.objects: o.hide_render = bool(o.get('baked') or o.get('obsolete'))
sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'
sc.render.filepath = os.path.join(out, 'overlay-render.png'); bpy.ops.render.render(write_still=True)
checks['issues'] = issues
with open(os.path.join(out, 'geometry-checks.json'), 'w') as f: json.dump(checks, f, indent=2)
print(json.dumps(checks, indent=2))
if issues: raise RuntimeError('Heritage validation failed: ' + str(issues))
