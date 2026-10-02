"""Kona-generation Speedmax studies, size M.

Skeleton (both bikes) is Canyon's published Speedmax CFR Disc / CF SLX disc chart,
size M: stack 489, reach 438, seat angle 80.5°, head angle 73°, chainstay 420,
wheelbase 1014, head tube 83, seat tube 552, BB drop 72.
Source: Canyon geometry sheet for Speedmax CFR Disc Di2 (product pdf pid 2921) and the
matching CF SLX disc sheet. Bike Insights' 2021 CFR Disc row agrees (BB height 264 on a 672 mm tyre).

The 2015–2018 rim-brake CF SLX has no separate geometry table in this archive. Canyon's
later CF SLX and CFR Disc tables are the same size-M chart, so the rim bike uses that
skeleton with the equipment of the title years: rim brakes, a fork-crown cover, a top-tube
bento and a seat-cluster gearbox. Tube depths are a silhouette study, not a 1% photo trace.

  blender -b --factory-startup --python-exit-code 1 -P blender/kona_years_build.py
"""
import bpy, json, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'heritage'))

import lib
import frame_tubes as FT
import parts as P

RIM_OD = 672.0          # 700x25, matches the 264 mm BB height on a 72 mm drop
PUBLISHED = {
    'size': 'M', 'stack': 489, 'reach': 438, 'sta': 80.5, 'hta': 73,
    'chainstay': 420, 'wheelbase': 1014, 'head_tube': 83, 'seat_tube': 552, 'bb_drop': 72,
}


def skeleton():
    R = RIM_OD / 2
    drop = PUBLISHED['bb_drop']
    cs, wb = PUBLISHED['chainstay'], PUBLISHED['wheelbase']
    hta = math.radians(PUBLISHED['hta'])
    sta = math.radians(PUBLISHED['sta'])
    BB = Vector((0, 0, R - drop))
    AX_R = Vector((-math.sqrt(cs * cs - drop * drop), 0, R))
    AX_F = Vector((AX_R.x + wb, 0, R))
    up = Vector((-math.cos(hta), 0, math.sin(hta)))
    sdir = Vector((-math.cos(sta), 0, math.sin(sta)))
    HT_TOP = Vector((PUBLISHED['reach'], 0, BB.z + PUBLISHED['stack']))
    HT_BOT = HT_TOP - up * PUBLISHED['head_tube']
    ST_TOP = BB + sdir * PUBLISHED['seat_tube']
    # derived: perpendicular distance from the steer axis to the front axle
    nrm = Vector((math.sin(hta), 0, math.cos(hta)))
    offset = (AX_F - HT_TOP).dot(nrm)
    return dict(BB=BB, AX_R=AX_R, AX_F=AX_F, up=up, sdir=sdir, HT_TOP=HT_TOP, HT_BOT=HT_BOT,
                ST_TOP=ST_TOP, fork_offset=round(offset, 1))


def materials(rgb):
    lib.MATS.clear()
    def M(name, color, **k):
        return lib.mat(name, color, **k)
    paint = M('paint_frame', rgb, metal=.08, rough=.28, coat=1, coat_rough=.05)
    return {
        'paint_frame': paint,
        'carbon': M('carbon', (.025, .025, .028), metal=.15, rough=.32, coat=.6, coat_rough=.08),
        'tyre': M('rubber_tyre', (.02, .02, .02), rough=.7),
        'rim_alu': M('rim_carbon', (.04, .04, .045), metal=.35, rough=.3, coat=.5, coat_rough=.08),
        'hub': M('alu_hub', (.55, .56, .58), metal=1, rough=.28),
        'spoke': M('steel_spoke', (.08, .08, .09), metal=.85, rough=.3),
        'steel': M('steel', (.62, .63, .65), metal=1, rough=.25),
        'chain': M('steel_chain', (.45, .46, .48), metal=1, rough=.32),
        'alu_silver': M('alu_silver', (.7, .71, .73), metal=1, rough=.22),
        'alu_dark': M('alu_dark', (.14, .145, .15), metal=1, rough=.34),
        'alu_black': M('alu_black', (.03, .03, .034), metal=.75, rough=.35),
        'black': M('plastic_black', (.015, .015, .016), rough=.55),
        'pad': M('pad_foam', (.08, .08, .082), rough=.85),
        'saddle': M('saddle', (.02, .02, .022), rough=.5),
        'bar_tape': M('bar_tape', (.03, .03, .032), rough=.8),
        'lava': M('kona_lava', (.55, .16, .08), metal=.05, rough=.4, coat=.4, coat_rough=.08),
    }


def frame_of(sk, M, disc):
    st = FT.station
    BB, up, sdir = sk['BB'], sk['up'], sk['sdir']
    ht_top, ht_bot, st_top = sk['HT_TOP'], sk['HT_BOT'], sk['ST_TOP']
    axr, axf = sk['AX_R'], sk['AX_F']
    def along(a, b, f):
        return a.lerp(b, f)
    # downtube bows down toward the front tyre — the bayonet of this generation
    dt0 = BB + Vector((28, 0, 36))
    dt1 = along(dt0, ht_bot, .55) + Vector((0, 0, -38 if disc else -18))
    paint, lava = 'paint_frame', 'lava'
    tubes = {
        'head': [st(ht_bot, 22, 22, shape='ellipse', zone=paint), st(ht_top, 21, 21, shape='ellipse', zone=paint)],
        'seat': [st(BB + sdir * 30, 22, 48, shape='teardrop', zone=paint),
                 st(along(BB, st_top, .72), 18, 36, shape='teardrop', zone=paint),
                 st(st_top, 16, 28, shape='teardrop', zone=paint)],
        'top': [st(along(BB, st_top, .9) + Vector((0, 0, 8)), 20, 16, shape='ellipse', zone=paint),
                st(ht_top - up * 28 + Vector((-10, 0, -6)), 22, 15, shape='ellipse', zone=paint)],
        'down': [st(dt0, 26, 42, shape='teardrop', zone=paint),
                 st(dt1, 24, 58 if disc else 46, shape='teardrop', zone=paint),
                 st(ht_bot + up * 8, 22, 30, shape='teardrop', zone=paint)],
        'cs_l': [st(BB + Vector((18, 22, 8)), 10, 22, shape='teardrop', zone=paint),
                 st(axr + Vector((18, 18, 6)), 8, 14, shape='teardrop', zone=paint)],
        'cs_r': [st(BB + Vector((18, -22, 8)), 10, 22, shape='teardrop', zone=paint),
                 st(axr + Vector((18, -18, 6)), 8, 14, shape='teardrop', zone=paint)],
        'ss_l': [st(along(BB, st_top, .62) + Vector((0, 16, 0)), 7, 14, shape='teardrop', zone=paint),
                 st(axr + Vector((8, 16, 28)), 6, 10, shape='teardrop', zone=paint)],
        'ss_r': [st(along(BB, st_top, .62) + Vector((0, -16, 0)), 7, 14, shape='teardrop', zone=paint),
                 st(axr + Vector((8, -16, 28)), 6, 10, shape='teardrop', zone=paint)],
    }
    extra = []
    if not disc:
        bento_c = along(along(BB, st_top, .9), ht_top, .35) + Vector((0, 0, 28))
        box = lib.box(bento_c, (150, 90, 42), round_e=3.2)
        extra.append((box, paint, [bento_c]))
        gear_c = along(BB, st_top, .78) + Vector((-30, 0, 10))
        extra.append((lib.box(gear_c, (90, 70, 55), round_e=3.0), paint, [gear_c]))
    zones = {'paint_frame': M['paint_frame'], 'lava': M['lava']}
    FT.build_fused('frame', tubes, extra, zones, voxel_mm=3.2, target=42000, part='frame', smooth_iter=3)
    # fork, separate so the crown cover and the axle stay readable
    crown = ht_bot - up * 18
    blades = {
        'fl': [st(crown + Vector((0, 16, 0)), 14, 28, shape='teardrop', zone=paint),
               st(axf + Vector((-6, 14, 30)), 11, 18, shape='teardrop', zone=paint),
               st(axf + Vector((0, 12, 0)), 9, 12, shape='teardrop', zone=paint)],
        'fr': [st(crown + Vector((0, -16, 0)), 14, 28, shape='teardrop', zone=paint),
               st(axf + Vector((-6, -14, 30)), 11, 18, shape='teardrop', zone=paint),
               st(axf + Vector((0, -12, 0)), 9, 12, shape='teardrop', zone=paint)],
    }
    fork_extra = []
    if not disc:
        cover = crown + Vector((18, 0, 8))
        fork_extra.append((lib.box(cover, (70, 36, 48), round_e=3.4), paint, [cover]))
    FT.build_fused('fork', blades, fork_extra, zones, voxel_mm=3.2, target=16000, part='fork', smooth_iter=2)


def wheels(M, sk, disc):
    depth = 80 if disc else 62
    old_f, old_r = (100, 142) if disc else (100, 130)
    spec = dict(bsd=622, tyre_od=RIM_OD, tyre_width=25, rim_depth=depth, rim_width_brake=23,
                rim_width_bed=19, spokes=18 if disc else 20, old=old_f, flange_y=[-28, 28],
                flange_r=21, spoke_cross=0.15 if disc else 0.4)
    P.build_wheel(M, sk['AX_F'], 'front', spec)
    spec = dict(spec)
    spec['old'] = old_r
    spec['flange_y'] = [-30, 22]
    P.build_wheel(M, sk['AX_R'], 'rear', spec)
    if disc:
        for which, C, y in (('front', sk['AX_F'], 46), ('rear', sk['AX_R'], 48)):
            V, F, U = lib.lathe([(80, y - .7), (80, y + .7), (22, y + .7), (22, y - .7)], 64, C, closed_prof=True)
            lib.mesh('rotor_' + which, V, F, M['steel'], origin=P.W(C), uvs=U, part='rotor_' + which)


def cockpit(M, sk):
    # arm-pad stack on the chart starts at 581 mm for size M; pads sit above the head-tube top
    clamp = sk['HT_TOP'] + sk['up'] * 36 + Vector((70, 0, 18))
    wing = P.swept_tube(
        [clamp + Vector((0, -190, -6)), clamp, clamp + Vector((0, 190, -6))],
        [P.teardrop_prof(8, 18, 16), P.teardrop_prof(10, 22, 16), P.teardrop_prof(8, 18, 16)])
    P.PB().add(wing, M['carbon']).build('basebar', sharp=30, part='base_bar', explode=[.12, 0, .04])
    P.build_clipons(M, clamp, (30, 55), (260, 70), 150)
    post_top = sk['ST_TOP']
    exposed = 190.0
    top = post_top + sk['sdir'] * exposed
    prof = P.teardrop_prof(14, 32, 18)
    tube = P.swept_tube([post_top - sk['sdir'] * 80, top], [prof, P.teardrop_prof(12, 26, 18)])
    head = top + Vector((-18, 0, 12))
    P.PB().add(tube, M['carbon']).add(lib.box(head, (48, 28, 16), round_e=2.6), M['alu_black']).build(
        'seatpost', sharp=30, part='seatpost', explode=[0, 0, .12])
    P.build_saddle(M, head, 240, 130, nose_drop=6, top_above_clamp=22)


def fit(M, sk, disc):
    P.build_crankset(M, sk['BB'], [52, 36], [-78, -70], 110, 170, -18, q_half=72)
    if not disc:
        # rear caliper under the stays, front caliper behind the crown cover
        P.build_caliper(M, 'brake_rear', sk['AX_R'] + Vector((40, 0, -20)), sk['AX_R'], 310, -1)
        P.build_caliper(M, 'brake_front', sk['HT_BOT'] + Vector((10, 0, -20)), sk['AX_F'], 310, 1)


def build_one(spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    lib.WORLD.clear()
    sk = skeleton()
    M = materials(spec['rgb'])
    frame_of(sk, M, spec['disc'])
    wheels(M, sk, spec['disc'])
    cockpit(M, sk)
    fit(M, sk, spec['disc'])
    out_dir = os.path.join(ROOT, 'assets', 'kona-years', 'bikes', spec['id'])
    os.makedirs(out_dir, exist_ok=True)
    meta = {
        'id': spec['id'], 'name': spec['name'], 'size': 'M', 'published_mm': PUBLISHED,
        'derived_fork_offset_mm': sk['fork_offset'],
        'geometry_source': 'Canyon Speedmax CFR Disc Di2 geometry pdf, pid 2921, size M',
        'tube_depths': 'silhouette study, not a photo trace',
        'brakes': 'disc' if spec['disc'] else 'rim',
    }
    json.dump(meta, open(os.path.join(out_dir, 'build-meta.json'), 'w'), indent=2)
    info = bpy.data.objects.new('bike_info', None)
    bpy.context.scene.collection.objects.link(info)
    info['bike'] = json.dumps(meta)
    for o in bpy.context.scene.objects:
        o.select_set(o.type == 'MESH')
    path = os.path.join(out_dir, 'speedmax_web.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_extras=True,
                              export_materials='EXPORT', export_cameras=False, export_lights=False)
    print('[kona] wrote', path, 'fork offset', sk['fork_offset'])


BIKES = [
    {'id': 'cfslx-2015', 'name': 'Speedmax CF SLX', 'disc': False, 'rgb': (.93, .90, .84)},
    {'id': 'cfr-2019', 'name': 'Speedmax CFR Disc', 'disc': True, 'rgb': (.07, .20, .38)},
]

def build_finds():
    """Small shoreline objects. Each is named, centred, and about 12–20 cm across."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    lib.MATS.clear()
    lib.WORLD.clear()
    cream = lib.mat('plumeria', (.96, .93, .78), rough=.45, coat=.3, coat_rough=.2)
    yolk = lib.mat('plumeria_heart', (.93, .72, .18), rough=.4)
    shell = lib.mat('cowrie', (.93, .9, .82), rough=.28, coat=.8, coat_rough=.08)
    lava = lib.mat('lava_stone', (.18, .1, .08), rough=.92)
    coral = lib.mat('coral', (.12, .13, .14), rough=.7)
    bib = lib.mat('race_bib', (.96, .94, .9), rough=.6)
    ink = lib.mat('bib_ink', (.12, .14, .16), rough=.5)

    def petal():
        path = [lib.mm(0, 0, 0), lib.mm(0, 18, 6), lib.mm(0, 42, 4), lib.mm(0, 58, -2)]
        prof = [P.ellipse_prof(7, 2.2, 12), P.ellipse_prof(16, 3.2, 12), P.ellipse_prof(14, 2.4, 12), P.ellipse_prof(4, 1.2, 12)]
        return P.swept_tube(path, prof)

    pb = P.PB()
    for i in range(5):
        g = petal()
        ang = i / 5 * math.tau
        M = mathutils_rot(ang)
        V = [M @ Vector(v) for v in g[0]]
        pb.add((V, g[1], g[2]), cream)
    pb.add(lib.lathe([(0, -2), (7, -1), (9, 2), (4, 5), (0, 6)], 16, Vector((0, 0, 0)), closed_prof=True), yolk)
    pb.build('plumeria', part='plumeria')

    cow = lib.lathe([(0, -28), (10, -26), (16, -8), (14, 10), (8, 22), (0, 26)], 28, Vector((0, 0, 0)), closed_prof=True)
    lib.mesh('cowrie', cow[0], cow[1], shell, uvs=cow[2], part='cowrie')

    import bmesh
    me = bpy.data.meshes.new('lava_stone')
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=.07)
    for v in bm.verts:
        v.co *= Vector((1.15, .85, .7))
        v.co += v.co.normalized() * (.012 * math.sin(v.co.x * 80 + v.co.y * 40))
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('lava_stone', me)
    me.materials.append(lava)
    bpy.context.scene.collection.objects.link(o)
    o['part'] = 'lava_stone'

    arms = P.PB()
    for k in range(6):
        ang = k / 6 * math.tau
        tip = Vector((math.cos(ang) * .07, math.sin(ang) * .05, .06 + (k % 2) * .02))
        arms.add(lib.tube(Vector((0, 0, .01)), tip, 4, 1.5, 6), coral)
    arms.build('black_coral', part='black_coral')

    plate = lib.box(Vector((0, 0, 8)), (90, 2, 120), round_e=4)
    bar = lib.box(Vector((0, 1.2, 18)), (50, 1, 8))
    P.PB().add(plate, bib).add(bar, ink).build('race_bib', part='race_bib')

    out = os.path.join(ROOT, 'assets', 'kona-years', 'finds.glb')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    for o in bpy.context.scene.objects:
        o.select_set(o.type == 'MESH')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_extras=True,
                              export_materials='EXPORT')
    print('[kona] wrote', out)


def mathutils_rot(ang):
    from mathutils import Matrix
    return Matrix.Rotation(ang, 4, 'Z')


if __name__ == '__main__':
    for b in BIKES:
        build_one(b)
    build_finds()
