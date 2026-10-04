"""Watch forge: a parametric sports chronograph, built for inspection and explosion.

A deterministic study of the Endurance Pro family's public specification (44 mm case, 12.5 mm thick, bidirectional
compass bezel, three-counter quartz chronograph, 22/20 mm rubber strap). It is a geometry study, not a replica: no
logo, no IRONMAN mark, no product photograph. When a brand supplies CAD, that replaces this file, and the room
needs no other change (same part names and materials).

  PYTHONPATH=<bpyenv> python3 blender/watch_build.py            (bpy as a module: pip install bpy)

Output: assets/watches/endurance-pro-study/watch.glb (hero: with the quartz movement for the exploded view),
        watch-lite.glb (no movement, fewer segments, for phones and vitrines), build-meta.json.
Every object carries machine-inspection extras: part + explode (Blender space; +Z = out of the dial).
Dial, bezel top and caseback have planar UVs so the room can print scales per edition.
"""
import bpy, bmesh, json, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
OUT = os.path.join(ROOT, 'assets/watches/endurance-pro-study')
TAU = math.tau
mm = .001
HERO = True
Q = lambda n: n if HERO else max(12, n // 2)

MATS = {}
def mat(name, rgb, metal=0.0, rough=0.5, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    MATS[name] = m
    return m

def materials():
    MATS.clear()
    return dict(
        ti=mat('titanium', (.55, .56, .57), 1, .38), polish=mat('steel_polished', (.8, .8, .82), 1, .12),
        dial=mat('dial', (.3, .31, .33), 0, .45), print=mat('bezel_print', (.12, .12, .13), .2, .35),
        hands=mat('hands', (.85, .86, .88), 1, .15), lume=mat('lume', (.9, .95, .88), 0, .5), accent=mat('accent', (.75, .1, .1), 0, .4),
        glass=mat('crystal', (.9, .95, 1), 0, .02, .15), strap=mat('strap', (.1, .45, .5), 0, .65), back=mat('caseback', (.55, .56, .57), 1, .3),
        brass=mat('brass', (.78, .6, .3), 1, .3), pcb=mat('pcb', (.05, .25, .12), .1, .4), copper=mat('copper', (.75, .35, .15), 1, .3), cell=mat('battery', (.75, .76, .78), 1, .2))

def obj(name, bm, m, part, explode=None, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    me.materials.append(m)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o['part'] = part
    if explode: o['explode'] = [round(v, 5) for v in explode]
    return o

def planar_uv(bm, R):
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for l in f.loops:
            l[uv].uv = (l.vert.co.x / (2 * R) + .5, l.vert.co.y / (2 * R) + .5)

def revolve(name, profile, m, part, explode=None, seg=96, radial=None, smooth=True, uvR=None):
    """profile: [(r, z)] in mm, revolved about +Z. radial(angle, r) may modulate the radius (knurling, scallops)."""
    seg = Q(seg); bm = bmesh.new(); rings = []
    for r, z in profile:
        ring = []
        for k in range(seg):
            a = TAU * k / seg; rr = radial(a, r) if radial else r
            ring.append(bm.verts.new((math.cos(a) * rr * mm, math.sin(a) * rr * mm, z * mm)))
        rings.append(ring)
    for A, B in zip(rings, rings[1:]):
        for k in range(seg):
            try: bm.faces.new((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
            except ValueError: pass
    if uvR: planar_uv(bm, uvR * mm)
    return obj(name, bm, m, part, explode, smooth)

def disc(name, r, z, m, part, explode=None, seg=96, rings=3, uv=True, up=True):
    seg = Q(seg); bm = bmesh.new(); c = bm.verts.new((0, 0, z * mm)); prev = None
    for i in range(1, rings + 1):
        rr = r * i / rings
        ring = [bm.verts.new((math.cos(TAU * k / seg) * rr * mm, math.sin(TAU * k / seg) * rr * mm, z * mm)) for k in range(seg)]
        for k in range(seg):
            j = (k + 1) % seg
            f = (c, ring[k], ring[j]) if prev is None else (prev[k], ring[k], ring[j], prev[j])
            bm.faces.new(f if up else tuple(reversed(f)))
        prev = ring
    if uv: planar_uv(bm, r * mm)
    return obj(name, bm, m, part, explode)

def block(name, centre, size, m, part, explode=None, rot=0.0, bevel=.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        x, y, z = v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]
        x, y = x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)
        v.co = Vector((x + centre[0], y + centre[1], z + centre[2])) * mm
    if bevel: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel * mm, segments=2, affect='EDGES')
    return obj(name, bm, m, part, explode, smooth=bevel > 0)

def tube(name, pts, w, h, m, part, explode=None, closed=False):
    """A rounded-rectangle band (w × h mm) swept through pts (mm): straps."""
    n = Q(16); bm = bmesh.new(); P = [Vector(p) for p in pts]; rings = []
    for i, p in enumerate(P):
        a = P[(i + 1) % len(P)] if closed or i < len(P) - 1 else P[i]; b = P[i - 1] if closed or i > 0 else P[i]
        t = (a - b).normalized(); side = Vector((1, 0, 0)); nrm = t.cross(side).normalized()
        ring = []
        for k in range(n):
            th = TAU * k / n; cx, cy = math.cos(th), math.sin(th)
            sx = math.copysign(abs(cx) ** .35, cx) * w / 2; sy = math.copysign(abs(cy) ** .35, cy) * h / 2
            ring.append(bm.verts.new((p + side * sx + nrm * sy) * mm))
        rings.append(ring)
    pairs = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if closed else [])
    for A, B in pairs:
        for k in range(n): bm.faces.new((A[k], A[(k + 1) % n], B[(k + 1) % n], B[k]))
    if not closed:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    return obj(name, bm, m, part, explode)

def hand(name, length, w0, w1, z, angle, m, part, explode, tail=0.0, thick=.25):
    bm = bmesh.new(); pts = [(-w0 / 2, -tail), (w0 / 2, -tail), (w1 / 2, length * .92), (0, length), (-w1 / 2, length * .92)]
    top = [bm.verts.new((x, y, z + thick)) for x, y in pts]; bot = [bm.verts.new((x, y, z)) for x, y in pts]
    bm.faces.new(top); bm.faces.new(list(reversed(bot)))
    for k in range(len(pts)): bm.faces.new((bot[k], bot[(k + 1) % len(pts)], top[(k + 1) % len(pts)], top[k]))
    for v in bm.verts:
        x, y = v.co.x, v.co.y; ca, sa = math.cos(-angle), math.sin(-angle)
        v.co = Vector((x * ca - y * sa, x * sa + y * ca, v.co.z)) * mm
    return obj(name, bm, m, part, explode, smooth=False)

def gear(name, r, teeth, z, thick, centre, m, part, explode):
    bm = bmesh.new(); n = teeth * 4
    rr = lambda k: r + (.35 if k % 4 in (1, 2) else -.25)
    top = [bm.verts.new(((centre[0] + math.cos(TAU * k / n) * rr(k)) * mm, (centre[1] + math.sin(TAU * k / n) * rr(k)) * mm, (z + thick) * mm)) for k in range(n)]
    bot = [bm.verts.new(((centre[0] + math.cos(TAU * k / n) * rr(k)) * mm, (centre[1] + math.sin(TAU * k / n) * rr(k)) * mm, z * mm)) for k in range(n)]
    bm.faces.new(top); bm.faces.new(list(reversed(bot)))
    for k in range(n): bm.faces.new((bot[k], bot[(k + 1) % n], top[(k + 1) % n], top[k]))
    return obj(name, bm, m, part, explode, smooth=False)

def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = materials(); E = lambda z: (0, 0, z)
    # case middle: a softly bowed flank, 44 mm over the bezel, 12.5 mm overall
    revolve('case_middle', [(19.0, 0.6), (20.6, 1.0), (21.1, 3.0), (21.2, 6.0), (20.9, 8.6), (20.2, 9.4), (17.8, 9.4), (17.8, 8.0), (18.6, 8.0)], M['ti'], 'case')
    # lugs: four bevelled horns with a slight downward sweep, 22 mm between
    for sx in (-1, 1):
        for sy in (-1, 1):
            block(f'lug_{"l" if sx < 0 else "r"}{"t" if sy > 0 else "b"}', (sx * 12.6, sy * 22.0, 4.6), (3.6, 9.0, 6.6), M['ti'], 'case', bevel=.9)
    # crown at 3 o'clock with knurling, pushers at 2 and 4
    revolve('crown', [(0.0, 0.0), (3.2, 0.0), (3.3, 0.6), (3.3, 3.2), (3.0, 3.6), (0, 3.6)], M['ti'], 'crown', (.025, 0, 0), seg=48,
            radial=lambda a, r: r * (1 + .05 * math.cos(a * 18)) if r > 3 else r)
    bpy.context.scene.objects['crown'].rotation_euler = (0, math.pi / 2, 0); bpy.context.scene.objects['crown'].location = (21.0 * mm, 0, 4.8 * mm)
    for k, ang in ((0, math.radians(35)), (1, math.radians(-35))):
        o = revolve(f'pusher_{k}', [(0, 0), (1.8, 0), (1.8, 3.4), (1.5, 3.8), (0, 3.8)], M['ti'], 'pusher', (.024 * math.cos(ang), .024 * math.sin(ang), 0), seg=32)
        o.rotation_euler = (0, math.pi / 2, ang); o.location = (20.8 * math.cos(ang) * mm, 20.8 * math.sin(ang) * mm, 4.8 * mm)
    # bezel: 60 grip scallops round the edge, a flat printed top ring (compass scale lives in the texture)
    revolve('bezel', [(17.6, 9.4), (21.9, 9.4), (22.0, 10.6), (21.4, 11.4), (17.6, 11.4)], M['ti'], 'bezel', E(.032), seg=240,
            radial=lambda a, r: r - (.28 * max(0, math.cos(a * 60)) ** 2 if r > 21.5 else 0))
    revolve('bezel_top', [(17.7, 11.42), (21.3, 11.42)], M['print'], 'bezel', E(.032), seg=120, uvR=21.3)
    # crystal and dial (with rehaut), hands at 10:08:32
    revolve('crystal', [(0, 12.5), (17.6, 12.3), (17.6, 11.3), (0, 11.4)], M['glass'], 'crystal', E(.05), seg=96)
    disc('dial', 17.6, 7.9, M['dial'], 'dial', E(.016), seg=120, rings=6)
    revolve('rehaut', [(16.4, 7.9), (17.7, 9.3)], M['print'], 'dial', E(.016), seg=120, uvR=17.7)
    for k, (x, y) in enumerate(((0, -8.2), (-8.2, 0), (8.2, 0))):      # three counters, slightly sunk
        o = revolve(f'counter_{k}', [(0, 7.86), (4.6, 7.86), (4.8, 7.95)], M['dial'], 'dial', E(.016), seg=64)
        o.location = (x * mm, y * mm, 0)
    hand('hand_hour', 10.0, 1.9, 1.5, 9.0, math.radians(10 / 12 * 360 + 8 / 60 * 30), M['hands'], 'hands', E(.026), tail=2)
    hand('hand_minute', 14.6, 1.6, 1.2, 9.4, math.radians(8 / 60 * 360), M['hands'], 'hands', E(.028), tail=2.2)
    hand('hand_hour_lume', 7.8, 1.0, .8, 9.25, math.radians(10 / 12 * 360 + 8 / 60 * 30), M['lume'], 'hands', E(.0262), thick=.06)
    hand('hand_minute_lume', 12.4, .9, .7, 9.65, math.radians(8 / 60 * 360), M['lume'], 'hands', E(.0282), thick=.06)
    hand('hand_chrono', 17.0, .5, .3, 9.8, math.radians(32 / 60 * 360), M['accent'], 'hands', E(.03), tail=4.5, thick=.15)
    for k, (x, y, a) in enumerate(((0, -8.2, 1.1), (-8.2, 0, 4.0), (8.2, 0, 2.2))):
        o = hand(f'hand_counter_{k}', 3.9, .5, .35, 8.2, a, M['hands'], 'hands', E(.022), tail=1, thick=.12); o.location = (x * mm, y * mm, 0)
    revolve('hand_cap', [(0, 10.05), (1.1, 10.05), (1.1, 9.0), (0, 9.0)], M['hands'], 'hands', E(.03), seg=24)
    # caseback: screwed, with an engraving ring (texture) and six notches
    revolve('caseback', [(0, -0.6), (17.5, -0.6), (19.0, 0.0), (19.0, 0.7), (0, 0.7)], M['back'], 'caseback', E(-.045), seg=96,
            radial=lambda a, r: r - (.6 * max(0, math.cos(a * 6)) ** 40 if r > 18.5 else 0))
    disc('caseback_engraving', 15.5, -0.62, M['print'], 'caseback', E(-.045), seg=96, rings=3, up=False)
    # strap on a display loop: two rubber halves meeting at the tang buckle under the case
    def loop(sign):
        pts = []
        for i in range(22):
            t = i / 21; a = math.pi / 2 - t * math.pi
            pts.append((0, sign * (22.0 + 6 + math.cos(a) * 12 * t), 4.0 - (1 - math.sin(a)) * 23 - t * 2))
        return pts
    tube('strap_top', [(0, 22.6, 5.2)] + loop(1)[1:], 21.0, 4.2, M['strap'], 'strap', E(-.06))
    tube('strap_bottom', [(0, -22.6, 5.2)] + loop(-1)[1:], 21.0, 4.2, M['strap'], 'strap', E(-.06))
    for k, (y, z) in enumerate(((10.0, -41.0), (14.0, -40.6))):       # keeper loops
        block(f'strap_keeper_{k}', (0, y, z), (23.5, 3.0, 6.2), M['strap'], 'strap', E(-.065), bevel=.8)
    block('buckle_frame', (0, 4.0, -43.0), (23.6, 4.2, 2.2), M['polish'], 'buckle', E(-.08), bevel=.7)
    block('buckle_tang', (0, 0.5, -42.2), (1.2, 7.0, 1.0), M['polish'], 'buckle', E(-.082), bevel=.3)
    if HERO:
        # Caliber-82-style quartz chronograph module (illustrative): main plate, board, cell, quartz, coils, wheels
        revolve('movement_plate', [(0, 1.2), (16.8, 1.2), (16.8, 3.0), (0, 3.0)], M['brass'], 'movement', E(-.012), seg=96)
        revolve('circuit_board', [(0, 3.05), (15.6, 3.05), (15.6, 3.6), (0, 3.6)], M['pcb'], 'movement', E(.002), seg=96)
        o = revolve('battery_cell', [(0, 0), (5.8, 0), (5.8, 2.0), (0, 2.0)], M['cell'], 'movement', (-.012, -.008, -.024), seg=48); o.location = (-7.5 * mm, -6.0 * mm, 3.6 * mm)
        o = revolve('quartz_crystal', [(0, 0), (.9, 0), (.9, 5.0), (0, 5.0)], M['polish'], 'movement', (.014, .01, .02), seg=24); o.rotation_euler = (0, math.pi / 2, .4); o.location = (5.0 * mm, 6.5 * mm, 4.3 * mm)
        for k, (x, y) in enumerate(((9.0, -6.0), (-3.0, 9.5), (2.0, -11.0))):
            o = revolve(f'stepper_coil_{k}', [(0, 0), (1.6, 0), (1.6, 4.6), (0, 4.6)], M['copper'], 'movement', (x * .0014, y * .0014, .03), seg=32); o.rotation_euler = (0, math.pi / 2, k); o.location = (x * mm, y * mm, 4.4 * mm)
        for k, (r, t, x, y) in enumerate(((5.2, 60, 0, 0), (3.2, 40, 6.5, 3.0), (2.4, 30, -6.0, 4.5), (2.0, 24, 4.0, -6.5), (2.8, 36, -2.0, -7.5), (1.6, 18, 9.5, 2.0))):
            gear(f'wheel_{k}', r, t, 6.0 + (k % 2) * .5, .35, (x, y), M['brass'], 'movement', (x * .0012, y * .0012, .006 + k * .0025))
        for k, (x, y, rot) in enumerate(((5.5, 2.5, .3), (-5.5, 3.0, -.4))):
            block(f'bridge_{k}', (x, y, 7.2), (10.0, 3.2, .5), M['ti'], 'movement', (x * .0015, y * .0015, .011), rot=rot, bevel=.4)

def export(name):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, use_selection=False, export_extras=True)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
    return path, tris

def main():
    global HERO
    meta = {'schema_version': 1, 'id': 'endurance-pro-study', 'type': 'watch', 'brand': 'Breitling (subject)', 'model': 'Endurance Pro family — geometry study',
            'representation': 'geometry-study', 'source_records': ['pitch/breitling-kona/collection-v1.json'], 'generator': 'blender', 'generator_script': 'blender/watch_build.py',
            'notes': 'Public specification only (44 mm, 12.5 mm, compass bezel, three-counter quartz chronograph, 22/20 mm strap). No logo, IRONMAN mark or product photograph. Movement is illustrative.',
            'lods': {}}
    for name, hero in (('watch.glb', True), ('watch-lite.glb', False)):
        HERO = hero; build()
        parts = sorted({o['part'] for o in bpy.context.scene.objects if o.type == 'MESH'})
        path, tris = export(name)
        meta['lods'][name] = {'tris': tris, 'bytes': os.path.getsize(path), 'objects': len(bpy.context.scene.objects), 'semantic_parts': parts}
        print('built', name, meta['lods'][name])
    meta['tris'] = meta['lods']['watch.glb']['tris']; meta['bytes'] = meta['lods']['watch.glb']['bytes']; meta['semantic_parts'] = meta['lods']['watch.glb']['semantic_parts']
    json.dump(meta, open(os.path.join(OUT, 'build-meta.json'), 'w'), indent=1)

main()
