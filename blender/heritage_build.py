"""Heritage exhibit builder: one photo-traced, tube-based bike per generation profile.

blender -b --factory-startup --python-exit-code 1 -P blender/heritage_build.py -- <profile.json> <out_dir> <master.blend>

All shape input comes from the profile: calibrated photo stations (tools/heritage_calibrate.py,
tools/heritage_trace.py), published component data, and explicitly labelled inferred widths.
Blender world: metres, +X forward, +Z up, +Y rider's left, drive side -Y, BB at x=0, ground z=0.
"""
import bpy, sys, os, math, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
bpy.ops.wm.read_factory_settings(use_empty=True)
from mathutils import Vector
from lib import *
from frame import voxelize

argv = sys.argv[sys.argv.index('--') + 1:]
PROFILE, OUT, MASTER = argv[0], argv[1], argv[2]
QUICK = '--quick' in argv
os.makedirs(OUT, exist_ok=True)
P = json.load(open(PROFILE))
MODEL = P['model']
CAL = P['calibration']
TAU = 2 * math.pi


# ------------------------------------------------------------------ photo px -> bike mm
S = CAL['mm_per_px']
RP = Vector(CAL['wheels']['rear']['centre'])
FP = Vector(CAL['wheels']['front']['centre'])
U = (FP - RP).normalized()
N_DOWN = Vector((-U.y, U.x))
R_TYRE = CAL['tyre_outer_diameter_mm'] / 2


def _ab(px):
    d = Vector(px) - RP
    return d.dot(U) * S, d.dot(N_DOWN) * S


_bb_a, _bb_b = _ab(P['points_px']['bb'])


def PX(px, y=0.0):
    """Photo pixel -> bike mm Vector at lateral offset y (mm). Roll is removed about the rear axle."""
    a, b = _ab(px)
    return Vector((a - _bb_a, y, R_TYRE - b))


BB = PX(P['points_px']['bb'])
AX_R = PX(RP)
AX_F = PX(FP)
AX_F.z = AX_R.z = R_TYRE


def W(v):
    return v * MM


# ------------------------------------------------------------------ materials (web contract names)
F = MODEL['finish']
M = {
    'paint': mat('paint_frame', tuple(F['paint']), rough=F.get('paint_rough', .3), coat=F.get('coat', 1.0), coat_rough=.05,
                 metal=F.get('paint_metal', 0.0)),
    'paint2': mat('paint_accent', tuple(F.get('accent', F['paint'])), rough=.32, coat=.8),
    'carbon': mat('carbon_cockpit', (.018, .018, .02), rough=.36, coat=.5, coat_rough=.12),
    'rim': mat('rim_' + MODEL['wheels']['rim_finish'], tuple(MODEL['wheels']['rim_color']), metal=MODEL['wheels'].get('rim_metal', .6),
               rough=.3, coat=.3),
    'disc': mat('carbon_disc', (.03, .03, .033), rough=.34, coat=.6),
    'tyre': mat('rubber_tyre', (.025, .025, .025), rough=.62),
    'tape': mat('bar_tape', tuple(MODEL['cockpit'].get('tape', (.02, .02, .02))), rough=.7),
    'pad': mat('pad_foam', (.03, .03, .032), rough=.85),
    'steel': mat('steel_cassette', (.78, .78, .8), metal=1, rough=.22),
    'chain': mat('steel_chain', (.62, .62, .64), metal=1, rough=.3),
    'alu_black': mat('alu_black', (.03, .03, .035), metal=.9, rough=.38),
    'alu_silver': mat('alu_silver', (.68, .69, .71), metal=1, rough=.24),
    'alu_dark': mat('alu_dark', (.16, .165, .175), metal=1, rough=.34),
    'black': mat('plastic_black', (.02, .02, .02), rough=.5),
    'hub': mat('alu_hub', tuple(MODEL['wheels'].get('hub_color', (.04, .04, .045))), metal=.9, rough=.35),
    'spoke': mat('steel_spoke', tuple(MODEL['wheels'].get('spoke_color', (.03, .03, .03))), metal=.8, rough=.35),
    'saddle': mat('saddle_cover', tuple(MODEL['saddle']['color']), rough=.45, coat=.3),
    'crank': mat('crank_finish', tuple(MODEL['drivetrain'].get('crank_color', (.03, .03, .033))), rough=.32, coat=.6,
                 metal=MODEL['drivetrain'].get('crank_metal', 0.0)),
}


class PB:
    def __init__(self):
        self.items = []

    def add(self, geo, material):
        self.items.append((geo, material))
        return self

    def build(self, name, parent=None, origin=None, smooth=True, sharp=40, **props):
        mats, V, Fc, FM = [], [], [], []
        for (gv, gf, _), m in self.items:
            if m not in mats:
                mats.append(m)
            off = len(V)
            V += gv
            Fc += [[i + off for i in f] for f in gf]
            FM += [mats.index(m)] * len(gf)
        return mesh(name, V, Fc, mats[0], parent=parent, origin=origin, smooth=smooth, sharp=sharp, mats=mats, face_mats=FM,
                    **props)


def geo(g):
    return (g[0], g[1], None)


# ------------------------------------------------------------------ traced members
def stations(name):
    st = P['traced'][name]
    spec = MODEL['members'][name]
    pts = [Vector(s['px']) for s in st]
    L = [0.0]
    for a, b in zip(pts, pts[1:]):
        L.append(L[-1] + (b - a).length)
    t = [x / L[-1] for x in L]
    depth = []
    ov = spec.get('depth_px_override')
    for s, ti in zip(st, t):
        if ov:
            for (t0, d0), (t1, d1) in zip(ov, ov[1:]):
                if t0 <= ti <= t1:
                    depth.append(d0 + (d1 - d0) * (ti - t0) / max(t1 - t0, 1e-9))
                    break
            else:
                depth.append(ov[-1][1] if ti > ov[-1][0] else ov[0][1])
        else:
            depth.append(s['depth_px'] if s['depth_px'] else spec['depth_mm'] / S)
    # Pixel-quantised edges ripple once swept; low-pass both centreline and depth (ends pinned).
    import numpy as np
    sig = spec.get('smooth_sigma', 2.5)
    if sig and len(pts) > 6:
        k = np.exp(-0.5 * (np.arange(-3 * int(sig + 1), 3 * int(sig + 1) + 1) / sig) ** 2); k /= k.sum()
        def lp(a):
            a = np.asarray(a, float); pad = len(k) // 2
            ap = np.r_[[a[0]] * pad, a, [a[-1]] * pad] if a.ndim == 1 else np.r_[[a[0]] * pad, a, [a[-1]] * pad]
            return np.array([np.dot(k, ap[i:i + len(k)]) for i in range(len(a))]) if a.ndim == 1 else \
                np.stack([lp(a[:, 0]), lp(a[:, 1])], 1)
        xy = lp(np.array([[q.x, q.y] for q in pts]))
        xy[0], xy[-1] = [pts[0].x, pts[0].y], [pts[-1].x, pts[-1].y]
        pts = [Vector((float(a), float(b))) for a, b in xy]
        depth = list(lp(depth))
    return pts, t, [d * S for d in depth]


def section(spec, depth, t):
    lat = spec.get('lateral_mm')
    if isinstance(lat, list):
        lat = lat[0] + (lat[1] - lat[0]) * t
    if lat is None:
        lat = depth * spec.get('lateral_ratio', 1.0)
    shape = spec.get('shape', 'oval')
    if shape == 'aero':
        # Truncated airfoil: chord in the photo plane, thickness lateral. le=+1 leads along T x Y.
        return [(a, b) for a, b in kamm(depth, lat, trunc=.86, n=14, le=spec.get('le', 1), tail_pts=4)]
    e = {'round': 2.0, 'oval': 2.0, 'box': 3.2, 'blade': 2.4}.get(shape, 2.0)
    return superellipse(lat, depth, e, 28)


def member_geo(name, y_offset=0.0):
    spec = MODEL['members'][name]
    pts, t, depth = stations(name)
    path = []
    for p, ti in zip(pts, t):
        y = y_offset
        if 'pair_y' in spec:
            y0, y1 = spec['pair_y']
            y = (y0 + (y1 - y0) * ti) * (1 if y_offset >= 0 else -1)
        path.append(PX(p, y))
    e0, e1 = spec.get('extend_mm', [8, 8])
    if e0:
        path.insert(0, path[0] + (path[0] - path[1]).normalized() * e0); depth.insert(0, depth[0]); t.insert(0, 0.0)
    if e1:
        path.append(path[-1] + (path[-1] - path[-2]).normalized() * e1); depth.append(depth[-1]); t.append(1.0)
    profs = [section(spec, d, ti) for d, ti in zip(depth, t)]
    return sweep([W(p) for p in path], profs, lat=Vector((0, 1, 0)))


def members_for(part):
    out = []
    for name, spec in MODEL['members'].items():
        if spec.get('part', 'frame') != part:
            continue
        if 'pair_y' in spec:
            out += [member_geo(name, 1.0), member_geo(name, -1.0)]
        else:
            out.append(member_geo(name))
    return out


def solid(name, geos, material, voxel, target, **props):
    V, Fc, _ = join_geo([(g[0], g[1]) for g in geos])
    raw = mesh(name + '_raw', V, Fc, material)
    me = voxelize(raw, voxel, 6, .5, target=None if QUICK else target)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = raw.location
    WORLD[name] = raw.location.copy()
    bpy.data.objects.remove(raw)
    me.materials.clear(); me.materials.append(material)
    for k, v in props.items():
        o[k] = v
    return o


VOX = .0022 if QUICK else .0011
fr = MODEL['frame']
extra = [lathe([(0.1, -fr['bb_shell_mm'] / 2), (fr['bb_shell_r'], -fr['bb_shell_mm'] / 2), (fr['bb_shell_r'], fr['bb_shell_mm'] / 2),
                (0.1, fr['bb_shell_mm'] / 2)], 40, BB, closed_prof=True)]
for s in (-1, 1):
    y = s * (MODEL['wheels']['rear']['spacing_mm'] / 2 + 3)
    extra.append(box(AX_R + Vector((6, y, 6)), (34, 6, 36), 3))
frame = solid('frame', members_for('frame') + extra, M['paint'], VOX, 200000, part='frame', explode=[0, 0, 0])


def paint_by_member(obj, part):
    """Two-tone frames: each face takes the material of its nearest traced member centreline."""
    names = [n for n, sp in MODEL['members'].items() if sp.get('part', 'frame') == part]
    if not any(MODEL['members'][n].get('material') for n in names):
        return
    from mathutils.kdtree import KDTree
    pts = []
    for ni, n in enumerate(names):
        for q in stations(n)[0]:
            c = PX(q)
            for y in ((0,) if 'pair_y' not in MODEL['members'][n] else (-40, 40)):
                pts.append((W(c + Vector((0, y, 0))), ni))
    kd = KDTree(len(pts))
    for i, (c, _) in enumerate(pts):
        kd.insert(c, i)
    kd.balance()
    mats = [M['paint']] + [M[m] for m in sorted({MODEL['members'][n].get('material') for n in names} - {None})]
    obj.data.materials.clear()
    for m in mats:
        obj.data.materials.append(m)
    off = obj.location
    for poly in obj.data.polygons:
        _, i, _ = kd.find(poly.center + off)
        mname = MODEL['members'][names[pts[i][1]]].get('material')
        poly.material_index = mats.index(M[mname]) if mname else 0


paint_by_member(frame, 'frame')

fk = MODEL['fork']
crown_c = PX(fk['crown_px'])
crown = sweep([W(crown_c + Vector((0, y, 0))) for y in (-fk['crown_width_mm'] / 2, 0, fk['crown_width_mm'] / 2)],
              [superellipse(fk['crown_depth_mm'], fk['crown_chord_mm'], 2.6, 28)] * 3, lat=Vector((0, 0, 1)))
steer_top = PX(P['points_px']['steerer_top'])
steer = tube(W(crown_c), W(steer_top), 14.3, 14.3, 24)
drops = [box(AX_F + Vector((4, s * (MODEL['wheels']['front']['spacing_mm'] / 2 + 3), 4)), (22, 5, 28), 3) for s in (-1, 1)]
fork = solid('fork', members_for('fork') + [crown, steer] + drops, M[fk.get('material', 'paint')], VOX * .9, 80000,
             part='fork', explode=[.2, 0, -.16])


# ------------------------------------------------------------------ graphics (projected text geometry)
M['decal_dark'] = mat('decal_dark', (.012, .012, .014), rough=.42)
M['decal_light'] = mat('decal_light', (.86, .86, .86), rough=.45)
for cname, rgb in MODEL.get('decal_colors', {}).items():
    M[cname] = mat(cname, tuple(rgb), rough=.4)
if MODEL.get('decals'):
    import decals as DC
    targets = {'frame': frame, 'fork': fork}
    bvh = {k: DC.bvh_of(v) for k, v in targets.items()}
    per = {}
    for dcl in MODEL['decals']:
        spec = MODEL['members'][dcl['member']]
        pts, t, depth = stations(dcl['member'])
        i = min(range(len(t)), key=lambda j: abs(t[j] - dcl.get('t', .5)))
        c = PX(pts[i])
        d = (PX(pts[min(i + 1, len(pts) - 1)]) - PX(pts[max(i - 1, 0)])).normalized()
        if dcl.get('reverse'):
            d = -d
        part = spec.get('part', 'frame')
        for side in dcl.get('sides', ['ds', 'nds']):
            n = Vector((0, -1, 0)) if side == 'ds' else Vector((0, 1, 0))
            dd = d if side == 'ds' else -d
            u = n.cross(dd)
            cc = c + u * dcl.get('shift_mm', 0.0)
            per.setdefault((part, dcl.get('material', MODEL.get('decal_material', 'decal_dark'))), []).append(DC.project_text(bvh[part], dcl['text'], dcl['cap_mm'], cc, dd, u, length_mm=dcl.get('length_mm'),
                                             spacing=dcl.get('spacing', 1.0), standoff=.12))
    for (part, mname), geos in per.items():
        geos = [g for g in geos if g[0]]
        if geos:
            V, Fc, _ = join_geo(geos)
            mesh(part + '_decals_' + mname.split('_')[-1], V, Fc, M[mname], parent=targets[part], sharp=None,
                 smooth=True, part=part + '_decals')


# ------------------------------------------------------------------ wheels
def spoke_geo(C, n, flange_y, flange_r, rim_r, cross=0.0, sides=6, r=1.0):
    parts = []
    for k in range(n):
        a = k / n * TAU
        side = flange_y[k % 2]
        a_hub = a + (cross if (k // 2) % 2 == 0 else -cross)
        h = C + Vector((flange_r * math.cos(a_hub), side, flange_r * math.sin(a_hub)))
        rp = C + Vector((rim_r * math.cos(a), 0, rim_r * math.sin(a)))
        parts.append(tube(W(h), W(rp), r, r, sides, cap=False))
    return join_geo([(g[0], g[1]) for g in parts])


def build_wheel(which):
    w = MODEL['wheels'][which]
    C = AX_F if which == 'front' else AX_R
    g = empty('wheel_' + which, W(C), part='wheel_' + which, explode=[.34, 0, 0] if which == 'front' else [-.36, 0, 0])
    tw = MODEL['wheels']['tyre_width_mm']
    rc = 311.0 + 3.0
    semi = R_TYRE - rc
    prof = []
    for i in range(36):
        t = i / 36 * TAU
        prof.append((rc + semi * math.cos(t) * (1 if math.cos(t) > 0 else .5), tw / 2 * math.sin(t) * (1 - .06 * math.cos(t))))
    V, Fc, Uv = lathe(prof, 160, C, closed_prof=True)
    mesh('tyre_' + which, V, Fc, M['tyre'], parent=g, origin=W(C), uvs=Uv, part='tyre_' + which,
         explode=[0, -.30 if which == 'front' else -.40, 0])
    depth = w['rim_depth_mm']
    rw = w.get('rim_width_mm', 20)
    inner = 314 - depth
    if w['type'] == 'disc':
        bulge = w.get('disc_half_thickness_mm', [26, 10])
        dp = [(22, -bulge[0]), (120, -(bulge[0] + bulge[1]) / 2 - 3), (250, -bulge[1] - 3), (314, -rw / 2), (314, rw / 2),
              (250, bulge[1] + 3), (120, (bulge[0] + bulge[1]) / 2 + 3), (22, bulge[0])]
        V, Fc, Uv = lathe(dp, 128, C, closed_prof=True)
        rim = PB().add((V, Fc, Uv), M['disc'])
        if w.get('brake_track'):
            M.setdefault('track', mat('alu_brake_track', (.72, .73, .75), metal=1, rough=.28))
            for sgn in (-1, 1):
                y = sgn * (rw / 2 + .15)
                rim.add(lathe([(300, y - .2 * sgn), (312.5, y - .2 * sgn), (312.5, y + .2 * sgn), (300, y + .2 * sgn)], 128, C,
                              closed_prof=True), M['track'])
        rim.build('rim_' + which, parent=g, origin=W(C), sharp=50, part='rim_' + which, explode=[0, -.2, 0])
    else:
        rp = [(314, -rw / 2), (314, rw / 2), (312, rw / 2 + .5), (inner + 8, rw / 2 - 1.5), (inner, 2.5), (inner, -2.5),
              (inner + 8, -rw / 2 + 1.5), (312, -rw / 2 - .5)]
        V, Fc, Uv = lathe(rp, 160, C, closed_prof=True)
        rim = PB().add((V, Fc, Uv), M['rim'])
        if w.get('brake_track'):
            M.setdefault('track', mat('alu_brake_track', (.72, .73, .75), metal=1, rough=.28))
            for sgn in (-1, 1):
                y = sgn * (rw / 2 + .15)
                rim.add(lathe([(302, y - .2 * sgn), (312.5, y - .2 * sgn), (312.5, y + .2 * sgn), (302, y + .2 * sgn)], 160, C,
                              closed_prof=True), M['track'])
        rim.build('rim_' + which, parent=g, origin=W(C), sharp=50, part='rim_' + which,
                  explode=[0, -.14 if which == 'front' else -.2, 0])
    sp = w['spacing_mm'] / 2
    hp = [(5, -sp), (10, -sp), (10, -sp + 4), (14, -sp + 6), (14, -sp + 12), (26, -sp + 13), (26, -sp + 16), (15, -sp + 18),
          (13, 0), (15, sp - 18), (26, sp - 16), (26, sp - 13), (14, sp - 12), (14, sp - 6), (10, sp - 4), (10, sp), (5, sp)]
    V, Fc, Uv = lathe(hp, 40, C, closed_prof=True)
    mesh('hub_' + which, V, Fc, M['hub'], parent=g, origin=W(C), sharp=35, part='hub_' + which, explode=[0, .07, 0])
    if w['type'] != 'disc':
        fl = (-sp + 14.5, sp - 14.5) if which == 'front' else (-sp + 22, sp - 14.5)
        V, Fc, _ = spoke_geo(C, w['spokes'], fl, 24, inner + 1, cross=w.get('cross', 0.0), r=1.0 if w.get('blade') else .95)
        mesh('spokes_' + which, V, Fc, M['spoke'], parent=g, origin=W(C), smooth=False, part='spokes_' + which, explode=[0, 0, 0])
    V, Fc, Uv = lathe([(4.5, -sp - 8), (5, -sp - 8), (5, sp + 8), (4.5, sp + 8)], 16, C, closed_prof=True)
    mesh('axle_' + which, V, Fc, M['steel'], parent=g, origin=W(C), part='axle_' + which, explode=[0, .12, 0])
    return g


wheel_f = build_wheel('front')
wheel_r = build_wheel('rear')


# ------------------------------------------------------------------ drivetrain
def cog_r(n):
    return 12.7 / (2 * math.sin(math.pi / n))


def gear(center, n, y, thick, inner):
    outer = gear_outline(n, cog_r(n), root=3.9, tip=3.2)
    return ring_solid(outer, circle_matched(outer, inner), y - thick / 2, y + thick / 2, center)


dt = MODEL['drivetrain']
cassette = PB()
for i, n in enumerate(dt['cassette']):
    y = dt['cassette_y0_mm'] - i * dt['cassette_pitch_mm']
    cassette.add(gear(AX_R, n, y, 1.8, max(17, cog_r(n) - 9)), M['steel'])
cassette.add(lathe([(16, dt['cassette_y0_mm'] + 2), (18, dt['cassette_y0_mm'] + 2),
                    (18, dt['cassette_y0_mm'] - len(dt['cassette']) * dt['cassette_pitch_mm']),
                    (16, dt['cassette_y0_mm'] - len(dt['cassette']) * dt['cassette_pitch_mm'])], 24, AX_R, closed_prof=True),
             M['alu_dark'])
cassette.build('cassette', parent=wheel_r, origin=W(AX_R), sharp=30, part='cassette', explode=[0, -.22, 0])

crankset = empty('crankset', W(BB), part='crankset', explode=[0, 0, 0])
rings = PB()
for n, y in zip(dt['chainrings'], dt['chainring_y_mm']):
    rings.add(gear(BB, n, y, 2.1, cog_r(n) - dt.get('ring_band_mm', 12)), M[dt.get('ring_material', 'alu_silver')])
spider = dt.get('spider', 'arms')
if spider == 'arms':
    for k in range(dt.get('spider_arms', 5)):
        a = dt['crank_angle_deg'] * math.pi / 180 + k * TAU / dt.get('spider_arms', 5)
        p0 = BB + Vector((20 * math.cos(a), dt['chainring_y_mm'][0] + 3, 20 * math.sin(a)))
        p1 = BB + Vector((cog_r(dt['chainrings'][1]) - 6) * Vector((math.cos(a), 0, math.sin(a)))) + Vector((0, dt['chainring_y_mm'][0] + 3, 0))
        rings.add(sweep([W(p0), W(p1)], [superellipse(6, 16, 3, 16), superellipse(5, 11, 3, 16)]), M['crank'])
else:
    # Full carbon ring cover (e.g. FSA Vision TriMax): closed disc across the ring interior.
    rings.add(lathe([(0.1, dt['chainring_y_mm'][0] - 1.5), (cog_r(dt['chainrings'][0]) - 9, dt['chainring_y_mm'][0] - 1.5),
                     (cog_r(dt['chainrings'][0]) - 9, dt['chainring_y_mm'][0] + 1.5), (0.1, dt['chainring_y_mm'][0] + 1.5)], 64, BB,
                    closed_prof=True), M['crank'])
rings.build('chainrings', parent=crankset, origin=W(BB), sharp=35, part='chainrings', explode=[0, -.26, 0])
CL = dt['crank_mm']
for side, s, ang in (('ds', -1, math.radians(dt['crank_angle_deg'])), ('nds', 1, math.radians(dt['crank_angle_deg']) + math.pi)):
    pts, profs = [], []
    for i in range(8):
        t = i / 7
        pts.append(W(BB + Vector((CL * t * math.cos(ang), s * (62 + 10 * t), CL * t * math.sin(ang)))))
        profs.append(superellipse(18 - 6 * t, 34 - 14 * t, 2.6, 24))
    pb = PB().add(sweep(pts, profs), M['crank'])
    eye = BB + Vector((CL * math.cos(ang), 0, CL * math.sin(ang)))
    pb.add(lathe([(4.5, s * 66), (10.5, s * 66), (10.5, s * 76), (4.5, s * 76)], 24, eye, closed_prof=True), M['alu_dark'])
    pb.build('crank_arm_' + side, parent=crankset, origin=W(BB), sharp=40, part='crank_arm_' + side, explode=[0, s * .36, 0])
V, Fc, Uv = lathe([(10, -68), (12, -68), (12, 68), (10, 68)], 24, BB, closed_prof=True)
mesh('spindle', V, Fc, M['steel'], parent=crankset, origin=W(BB), part='spindle', explode=[0, .16, 0])

# Rear derailleur and chain, placed at photographed pulley centres.
rd = MODEL['derailleur']
up_c = PX(rd['upper_pulley_px'], dt['cassette_y0_mm'] - 3 * dt['cassette_pitch_mm'])
lo_c = PX(rd['lower_pulley_px'], dt['cassette_y0_mm'] - 3 * dt['cassette_pitch_mm'])
rdp = PB()
for c in (up_c, lo_c):
    rdp.add(gear(Vector((c.x, 0, c.z)), 11, c.y, 2.4, 5), M['black'])
cage = [(up_c.x - 10, up_c.z + 12), (up_c.x + 12, up_c.z + 8), (lo_c.x + 14, lo_c.z - 4), (lo_c.x - 6, lo_c.z - 16)]
for dy in (-7, 7):
    rdp.add(prism([(x - 0, z - 0) for x, z in cage], up_c.y + dy - 1.2, up_c.y + dy + 1.2), M[rd.get('cage', 'alu_silver')])
body = PX(rd['body_px'], up_c.y - 12)
rdp.add(box(body, (46, 20, 34), 3), M[rd.get('body', 'alu_silver')])
rdp.add(box(body + Vector((12, 0, -18)), (26, 16, 20), 3), M[rd.get('body', 'alu_silver')])
rdp.add(tube(W(body), W(AX_R + Vector((0, up_c.y - 12, 0))), 6, 6, 12), M['alu_dark'])
rdp.build('rear_derailleur', sharp=35, part='rear_derailleur', explode=[-.1, -.2, 0])

fdp = MODEL['front_derailleur']
if fdp.get('px'):
    fdc = PX(fdp['px'], dt['chainring_y_mm'][0] - 8)
else:
    # Clamped to the seat tube, cage just clear of the big ring's teeth (2-3 mm by convention).
    st = stations('seat_tube')[0]
    a0, a1 = PX(st[-1]), PX(st[0])
    dirn = (a1 - a0).normalized()
    fdc = BB + dirn * (cog_r(dt['chainrings'][0]) + 3 + 10) + Vector((-14, dt['chainring_y_mm'][0] - 8, 0))
fd_geo = PB().add(box(fdc, (46, 4, 16), 3), M[fdp.get('material', 'alu_silver')])
fd_geo.add(box(fdc + Vector((0, 12, 0)), (46, 3, 12), 3), M[fdp.get('material', 'alu_silver')])
fd_geo.add(box(fdc + Vector((-8, 22, 18)), (16, 20, 18), 3), M['alu_dark'])
fd_geo.build('front_derailleur', sharp=35, part='front_derailleur', explode=[0, -.18, .08])

ring_r = cog_r(dt['chainrings'][0])
cog_i = dt.get('chain_cog_index', 4)
cr = cog_r(dt['cassette'][cog_i])
cy = dt['cassette_y0_mm'] - cog_i * dt['cassette_pitch_mm']
ry = dt['chainring_y_mm'][0]
# Simplified loop: front half of the big ring (bottom -> front -> top), top run to the
# chosen cog, rear quarter of the cog, then down around both derailleur pulleys.
chain_pts = [BB + Vector((ring_r * math.cos(math.radians(a)), ry, ring_r * math.sin(math.radians(a))))
             for a in range(-90, 91, 12)]
chain_pts += [AX_R + Vector((cr * math.cos(math.radians(a)), cy, cr * math.sin(math.radians(a)))) for a in range(90, 181, 15)]
chain_pts += [up_c + Vector((-8, 0, 0)), up_c + Vector((0, 0, -9)), lo_c + Vector((-9, 0, 0)), lo_c + Vector((0, 0, -9))]
chain_pts.append(chain_pts[0] + Vector((0, 0, 0)))
V, Fc, _ = sweep([W(p) for p in chain_pts], [superellipse(7, 8.4, 3, 12)] * len(chain_pts), lat=Vector((0, 1, 0)))
mesh('chain', V, Fc, M['chain'], smooth=True, part='chain', explode=[0, -.3, -.05])


# ------------------------------------------------------------------ rim brakes
def caliper(name, px, C, tw):
    b = PX(px)
    d = (C - b)
    d.y = 0
    dist = d.length
    d.normalize()
    reach = dist - 306
    pb = PB()
    pb.add(tube(W(b + Vector((0, -18, 0))), W(b + Vector((0, 18, 0))), 5, 5, 12), M['alu_dark'])
    # Caliper body with quick-release and cable anchor: dual-pivot road calipers are ~40 mm across, side-on.
    body = b + d * 10
    pb.add(box(body, (38, tw + 26, 26), 3), M[MODEL['brakes'].get('material', 'alu_black')])
    pb.add(box(body + Vector((0, -(tw / 2 + 16), 10)), (14, 8, 12), 3), M['alu_dark'])
    for s in (-1, 1):
        y0, y1 = s * 12, s * (tw / 2 + 9)
        arm = [b + Vector((0, y0, 0)), b + d * reach * .35 + Vector((0, (y0 + y1) / 2 + s * 6, 0)), b + d * reach + Vector((0, y1, 0))]
        pb.add(sweep([W(p) for p in arm], [superellipse(7, 26, 2.8, 16), superellipse(7, 20, 2.8, 16), superellipse(7, 14, 2.8, 16)]),
               M[MODEL['brakes'].get('material', 'alu_black')])
        pad = b + d * reach + Vector((0, s * (tw / 2 + 4), 0))
        pb.add(box(pad, (40, 5, 10), 3), M['black'])
    return pb.build(name, sharp=35, part=name, explode=[0, 0, .12])


tw = MODEL['wheels']['tyre_width_mm']
caliper('brake_front', MODEL['brakes']['front_px'], AX_F, tw)
caliper('brake_rear', MODEL['brakes']['rear_px'], AX_R, tw)


# ------------------------------------------------------------------ cable housings (traced from the photo)
M['housing'] = mat('cable_housing', (.02, .02, .022), rough=.45)
cab = PB()
for c in MODEL.get('cables', []):
    pts = [PX(q, c.get('y', 0.0)) for q in c['px']]
    smooth = catmull(pts, 6) if len(pts) > 2 else pts
    cab.add(sweep([W(q) for q in smooth], [superellipse(2 * c.get('r', 2.5), 2 * c.get('r', 2.5), 2, 10)] * len(smooth)), M['housing'])
for b in MODEL.get('fittings', []):
    cab.add(box(PX(b['px'], b.get('y', 0.0)), tuple(b['size_mm']), 3), M[b.get('material', 'alu_black')])
if cab.items:
    cab.build('cables', sharp=35, part='cables', explode=[0, -.1, .06])


# ------------------------------------------------------------------ seatpost + saddle
post = solid('seatpost', members_for('seatpost'), M[MODEL['members']['seatpost'].get('material', 'carbon')], VOX, 30000,
             part='seatpost', explode=[0, 0, .18])
sd = MODEL['saddle']
tail, nose = PX(sd['tail_px']), PX(sd['nose_px'])
length = (nose - tail).length
secs, path = [], []
for i in range(13):
    t = i / 12
    p = tail.lerp(nose, t)
    w = sd['width_mm'] * (1 - .72 * max(0, t - .35) / .65) ** 1.1 if t > .35 else sd['width_mm'] * (.86 + .14 * math.sin(t / .35 * math.pi / 2))
    h = sd.get('height_mm', 28) * (1 - .45 * t)
    path.append(W(p + Vector((0, 0, -h / 2))))
    secs.append(superellipse(max(w, 20), h, 2.4, 28))
saddle = PB().add(sweep(path, secs, lat=Vector((0, 1, 0))), M['saddle'])
clamp = PX(sd['clamp_px'])
for s in (-1, 1):
    rail = [tail + Vector((12, s * 22, -14)), clamp + Vector((-30, s * 22, 0)), clamp + Vector((35, s * 22, 0)), nose + Vector((-28, s * 8, -10))]
    saddle.add(sweep([W(p) for p in rail], [superellipse(7, 7, 2, 10)] * 4), M['alu_dark'])
saddle.add(box(clamp, (34, 44, 16), 3), M['alu_black'])
saddle.build('saddle', sharp=35, part='saddle', explode=[0, 0, .3])


# ------------------------------------------------------------------ cockpit
ck = MODEL['cockpit']
st_top = PX(P['points_px']['steerer_top'])
stem_c = PX(ck['stem_clamp_px'])
stem = PB()
stem.add(tube(W(st_top + Vector((0, 0, -22))), W(st_top + Vector((0, 0, 20))), 17.5, 17.5, 24), M[ck.get('stem_material', 'alu_black')])
stem.add(tube(W(st_top), W(stem_c), ck.get('stem_r_mm', 15), ck.get('stem_r_mm', 15) - 2, 20), M[ck.get('stem_material', 'alu_black')])
stem.add(tube(W(stem_c + Vector((0, -30, 0))), W(stem_c + Vector((0, 30, 0))), 17, 17, 20), M[ck.get('stem_material', 'alu_black')])
stem.build('stem', sharp=35, part='stem', explode=[.05, 0, .16])

half = ck['base_width_mm'] / 2
horn = [PX(p) for p in ck['base_guide_px']]
bb_pts = [stem_c + Vector((0, -half, 0))] + [stem_c + Vector((0, y, 0)) for y in (-half * .5, 0, half * .5)] + [stem_c + Vector((0, half, 0))]
bar = PB()
bar.add(sweep([W(p) for p in bb_pts], [superellipse(ck.get('bar_depth_mm', 24), ck.get('bar_chord_mm', 30), 2.4, 20)] * len(bb_pts),
              lat=Vector((0, 0, 1))), M[ck.get('bar_material', 'alu_black')])
for s in (-1, 1):
    pts = [Vector((p.x, s * half, p.z)) for p in horn]
    pts.insert(0, stem_c + Vector((0, s * half * .92, 0)))
    bar.add(sweep([W(p) for p in pts], [superellipse(23, 23, 2, 18)] * len(pts)), M['tape'])
bar.build('base_bar', sharp=35, part='base_bar', explode=[.12, 0, .22])

ext = PB()
es = ck['ext_spacing_mm'] / 2
for s in (-1, 1):
    pts = [PX(p, s * es) for p in ck['ext_guide_px']]
    ext.add(sweep([W(p) for p in pts], [superellipse(22.2, 22.2, 2, 16)] * len(pts)), M[ck.get('ext_material', 'tape')])
    pad = PX(ck['pad_px'], s * (es + 18))
    ext.add(box(pad + Vector((0, 0, -6)), (95, 70, 6), 3), M['alu_black'])
    ext.add(box(pad + Vector((0, 0, 4)), (100, 74, 14), 2.6), M['pad'])
    ext.add(tube(W(pad + Vector((0, 0, -8))), W(PX(ck['pad_px'], s * (es + 18)) + Vector((0, 0, -30))), 8, 8, 12), M['alu_black'])
    end = pts[-1]
    tip = end + (pts[-1] - pts[-2]).normalized() * ck.get('shifter_len_mm', 45)
    ext.add(tube(W(end), W(tip), 10.5, 8, 16), M['black'])
    lever = tip + Vector((-6, s * 4, -32))
    ext.add(sweep([W(tip + Vector((-6, s * 4, 0))), W(lever)], [superellipse(5, 10, 2.8, 12)] * 2), M['alu_dark'])
ext.build('extensions', sharp=35, part='extensions', explode=[.2, 0, .36])

lev = PB()
for s in (-1, 1):
    pts = [PX(p, s * (half + 2)) for p in ck['lever_guide_px']]
    lev.add(sweep([W(p) for p in pts], [superellipse(9, 16, 2.6, 16)] * len(pts)), M['alu_dark'])
lev.build('brake_levers', sharp=35, part='brake_levers', explode=[.26, 0, .1])


# ------------------------------------------------------------------ scene metadata + export
meta = {
    'model': MODEL['name'], 'year': MODEL['years'], 'size': MODEL['size'],
    'axles_m': {'front': list(W(AX_F)), 'rear': list(W(AX_R)), 'bb': list(W(BB))},
    'units': 'metres, +X forward, +Z up (Blender); glTF is Y-up',
    'source': 'Photo-traced heritage study; see manifest uncertainties.',
}
bpy.context.scene['speedmax'] = json.dumps(meta)
info = bpy.data.objects.new('speedmax_info', None)
bpy.context.scene.collection.objects.link(info)
info['speedmax'] = json.dumps(meta)
tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
print('[heritage] total tris', tri, flush=True)
bpy.ops.wm.save_as_mainfile(filepath=MASTER)
for o in bpy.context.scene.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'speedmax_web_raw.glb'), export_format='GLB', use_selection=True,
                          export_extras=True, export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
                          export_materials='EXPORT', export_cameras=False, export_lights=False)
print('[heritage] exported', flush=True)
