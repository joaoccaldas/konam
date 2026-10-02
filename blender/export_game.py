"""Game-ready (Zwift-style) export from the master scene.

blender -b assets/speedmax_cfr_master.blend -P blender/export_game.py -- export/zwift

Produces, per LOD (0/1/2): one FBX + one GLB containing five rigid pieces with pivots
(Frame, Steering, Wheel_Front, Wheel_Rear, Crankset) plus a baked Chain, a reduced material
set, and a JSON manifest (pivots, axes, triangle counts, dimensions).
"""
import bpy, bmesh, sys, os, json, math
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'export/zwift'
os.makedirs(OUT, exist_ok=True)
info = json.loads(bpy.context.scene['speedmax'])
AXF = Vector(info['axles_m']['front']); AXR = Vector(info['axles_m']['rear']); BBp = Vector(info['axles_m']['bb'])
STEER = Vector(info['steer_axis']['top']); SDIR = Vector(info['steer_axis']['dir'])

GROUPS = {
    'Frame': ['frame', 'frame_decals', 'toptube_storage_lid', 'udh_hanger', 'bottom_bracket', 'seatpost', 'seatpost_decals',
              'saddle', 'bottle_cages_rear', 'bottles_rear', 'front_derailleur', 'rear_derailleur', 'caliper_rear'],
    'Steering': ['fork', 'fork_decals', 'riser', 'basebar', 'brake_lever_left', 'brake_lever_right', 'aeroshield',
                 'aeroshield_decals', 'arm_pads', 'extensions', 'axs_blips', 'aerofuel_front', 'bottle_front', 'caliper_front'],
    'Wheel_Front': ['tyre_front', 'rim_front', 'hub_front', 'spokes_front', 'rotor_front', 'thru_axle_front'],
    'Wheel_Rear': ['tyre_rear', 'rim_rear', 'hub_rear', 'spokes_rear', 'rotor_rear', 'cassette', 'thru_axle_rear'],
    'Crankset': ['chainrings', 'powermeter_spider', 'crank_arm_ds', 'crank_arm_nds', 'spindle'],
    'Chain': ['chain_baked'],
}
# Photo-study additions keep the same rigid groups. Legacy builds simply skip absent objects.
GROUPS['Frame'] += ['frame_graphics','post_graphics']
GROUPS['Steering'] += ['fork_graphics']
for which in ('front','rear'):
    GROUPS['Wheel_'+which.title()] += ['rim_'+which+'_graphics','valve_'+which,'mould_seams_'+which]
PIVOT = {'Frame': BBp, 'Steering': STEER, 'Wheel_Front': AXF, 'Wheel_Rear': AXR, 'Crankset': BBp, 'Chain': BBp}
# LOD triangle budgets per piece (whole bike: ~42k / ~16k / ~6k)
BUDGET = {
    0: {'Frame': 16000, 'Steering': 9000, 'Wheel_Front': 5000, 'Wheel_Rear': 6500, 'Crankset': 3500, 'Chain': 2500},
    1: {'Frame': 6000, 'Steering': 3500, 'Wheel_Front': 1900, 'Wheel_Rear': 2400, 'Crankset': 1200, 'Chain': 900},
    2: {'Frame': 1900, 'Steering': 1100, 'Wheel_Front': 1300, 'Wheel_Rear': 1400, 'Crankset': 400, 'Chain': 0},
}
DROP_AT_LOD2 = {'spokes_front', 'spokes_rear', 'frame_decals', 'fork_decals', 'aeroshield_decals', 'seatpost_decals',
                'axs_blips', 'thru_axle_front', 'thru_axle_rear', 'udh_hanger', 'bottom_bracket', 'spindle'}

# reduced material set (Zwift-style bikes use a handful of shaders)
MATMAP = {'paint_frame': 'M_Paint', 'decal_dark': 'M_Decal', 'decal_light': 'M_DecalLight', 'carbon_cockpit': 'M_Carbon',
          'carbon_crank': 'M_Carbon', 'carbon_rim': 'M_Carbon', 'rubber_tyre': 'M_Rubber', 'rubber_grip': 'M_Rubber',
          'pad_foam': 'M_Rubber', 'steel_cassette': 'M_Metal', 'steel_rotor': 'M_Metal', 'steel_chain': 'M_Metal',
          'alu_silver': 'M_Metal', 'alu_dark': 'M_MetalDark', 'alu_black': 'M_MetalDark', 'alu_hub': 'M_MetalDark',
          'steel_spoke': 'M_MetalDark', 'plastic_black': 'M_MetalDark', 'bottle_smoke': 'M_Bottle', 'led_green': 'M_MetalDark'}


def get_mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    src = {'M_Paint': 'paint_frame', 'M_Decal': 'decal_dark', 'M_DecalLight': 'decal_light', 'M_Carbon': 'carbon_cockpit',
           'M_Rubber': 'rubber_tyre', 'M_Metal': 'alu_silver', 'M_MetalDark': 'alu_dark', 'M_Bottle': 'bottle_smoke'}[name]
    m = bpy.data.materials[src].copy()
    m.name = name
    return m


def world_mesh(o):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
    me.transform(o.matrix_world)
    return me


def build_piece(gname, names, lod):
    bm = bmesh.new()
    mats = []
    for n in names:
        o = bpy.data.objects.get(n)
        if o is None or o.type != 'MESH' or o.get('obsolete') or o.get('optional_accessory'):
            continue
        if lod == 2 and n in DROP_AT_LOD2:
            continue
        me = world_mesh(o)
        # remap material indices into the reduced set
        remap = []
        for m in me.materials:
            tgt = get_mat(MATMAP.get(m.name if m else '', 'M_MetalDark'))
            if tgt not in mats:
                mats.append(tgt)
            remap.append(mats.index(tgt))
        for p in me.polygons:
            p.material_index = remap[p.material_index] if remap else 0
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    if not bm.verts:
        bm.free()
        return None
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(f'{gname}_LOD{lod}')
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    piv = PIVOT[gname]
    me.transform(Matrix.Translation(-piv))
    o = bpy.data.objects.new(f'{gname}_LOD{lod}', me)
    o.location = piv
    bpy.context.scene.collection.objects.link(o)
    tris = len(me.polygons)
    target = BUDGET[lod][gname]
    if target and tris > target:
        d = o.modifiers.new('dec', 'DECIMATE')
        d.ratio = target / tris
        d.use_collapse_triangulate = True
        dg = bpy.context.evaluated_depsgraph_get()
        me2 = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
        o.modifiers.clear()
        o.data = me2
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.set_sharp_from_angle(angle=math.radians(40))
    return o


manifest = {'model': info['model'], 'year': info['year'], 'size': info['size'], 'units': 'metres',
            'axes': {'fbx': 'Y up, -Z forward (Unity/Unreal import friendly)', 'glb': 'Y up, +X forward'},
            'pieces': {}, 'lods': {}}
for lod in (0, 1, 2):
    made = []
    for g, names in GROUPS.items():
        if lod == 2 and g == 'Chain':
            continue
        o = build_piece(g, names, lod)
        if o:
            made.append(o)
    root = bpy.data.objects.new(f'SpeedmaxCFR_LOD{lod}', None)
    bpy.context.scene.collection.objects.link(root)
    for o in made:
        o.parent = root
    tri = {o.name: len(o.data.polygons) for o in made}
    manifest['lods'][lod] = {'triangles': tri, 'total': sum(tri.values())}
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for o in made:
        o.select_set(True)
    base = os.path.join(OUT, f'speedmax_cfr_axs_LOD{lod}')
    bpy.ops.export_scene.fbx(filepath=base + '.fbx', use_selection=True, apply_unit_scale=True,
                             apply_scale_options='FBX_SCALE_UNITS', axis_forward='-Z', axis_up='Y',
                             object_types={'EMPTY', 'MESH'}, mesh_smooth_type='FACE', add_leaf_bones=False,
                             bake_anim=False, path_mode='COPY')
    bpy.ops.export_scene.gltf(filepath=base + '.glb', export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_extras=False)
    print('LOD', lod, manifest['lods'][lod])

for g in GROUPS:
    p = PIVOT[g]
    manifest['pieces'][g] = {'pivot_blender_zup': [round(v, 5) for v in p],
                             'pivot_yup': [round(p.x, 5), round(p.z, 5), round(-p.y, 5)],
                             'rotation': {'Wheel_Front': 'spin about lateral axis', 'Wheel_Rear': 'spin about lateral axis',
                                          'Crankset': 'spin about lateral axis (cadence)',
                                          'Steering': 'yaw about steering axis dir %s (Z-up)' % [round(v, 4) for v in SDIR]}.get(g, 'static')}
manifest['dimensions_m'] = {'wheelbase': 1.013, 'wheel_radius': 0.3395, 'crank_length': 0.165, 'bb_height': 0.2645,
                            'chainring_teeth': [50, 37], 'cassette': [10, 11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 33]}
manifest['materials'] = sorted(set(MATMAP.values()))
with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
    json.dump(manifest, f, indent=2)
print('done', OUT)
