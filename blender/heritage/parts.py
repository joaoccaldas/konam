"""Period component builders for rim-brake, 9/10-speed, bullhorn-and-clip-on triathlon bikes (c. 1998-2010).

Every builder takes explicit dimensions (mm) from the adapter, which in turn cites the spec record
or marks the value inferred. Nothing here hard-codes a particular bike. Units: mm in, metres out.
Blender axes: +X forward, +Z up, +Y rider's left (drive side is -Y).
"""
import math
from mathutils import Vector, Matrix
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib import mesh, lathe, sweep, tube, box, join_geo, xform, gear_outline, ring_solid, superellipse, empty, MM, WORLD

TAU = 2 * math.pi


def W(v):
    return Vector(v) * MM


class PB:
    """Accumulate geometry per material; emit one multi-material object."""

    def __init__(self):
        self.items = []

    def add(self, geo, material):
        if geo[0]:
            self.items.append((geo, material))
        return self

    def build(self, name, parent=None, origin=None, smooth=True, sharp=40, **props):
        mats, V, F, U, FM = [], [], [], [], []
        for (gv, gf, gu), m in self.items:
            if m not in mats:
                mats.append(m)
            off = len(V)
            V += gv
            F += [[i + off for i in f] for f in gf]
            FM += [mats.index(m)] * len(gf)
        return mesh(name, V, F, mats[0], parent=parent, origin=origin, smooth=smooth, sharp=sharp, mats=mats,
                    face_mats=FM, **props)


def ellipse_prof(a, b, n=24):
    """(a lateral half-width, b side half-depth) -> ring for lib.sweep with lat=+Y."""
    return [(a * math.cos(t / n * TAU), b * math.sin(t / n * TAU)) for t in range(n)]


def teardrop_prof(a, b, n=28, tail=0.35):
    """Side-view aero section: rounded leading edge (towards +B), tapered trailing edge."""
    out = []
    for k in range(n):
        t = k / n * TAU
        s = math.sin(t)
        bb = b * s
        # thinner towards the trailing side (s<0)
        aa = a * math.cos(t) * (1 - tail * max(0.0, -s) ** 1.5)
        out.append((aa, bb))
    return out


def swept_tube(pts_mm, profiles, lat=Vector((0, 1, 0)), cap=True):
    return sweep([W(p) for p in pts_mm], profiles, lat=lat, cap0=cap, cap1=cap)


# ============================================================ wheels
def rim_profile(bsd, depth, width_brake, width_bed, n_side=6):
    """Closed (r, y) outline of an aluminium rim: hooked brake track, then a V/box taper to the spoke bed."""
    r_top = bsd / 2 + 2.0          # hook top
    r_track = r_top - 10.0         # bottom of brake track
    r_bed = r_top - depth
    hw, hb = width_brake / 2, width_bed / 2
    pts = [(r_top, hw - 1.2), (r_top - 1.5, hw), (r_track, hw)]
    for k in range(1, n_side + 1):
        t = k / n_side
        pts.append((r_track - (r_track - r_bed) * t, hw - (hw - hb) * t ** 1.3))
    pts += [(r_bed - 1.5, hb * 0.55), (r_bed - 2.0, 0.0), (r_bed - 1.5, -hb * 0.55)]
    for k in range(n_side, 0, -1):
        t = k / n_side
        pts.append((r_track - (r_track - r_bed) * t, -(hw - (hw - hb) * t ** 1.3)))
    pts += [(r_track, -hw), (r_top - 1.5, -hw), (r_top, -hw + 1.2),
            (r_top - 2.5, -hw + 2.2), (r_top - 4.5, 0.0), (r_top - 2.5, hw - 2.2)]
    return pts


def tyre_profile(bsd, od, width, n=28):
    r_in = bsd / 2 + 1.0
    rc = (od / 2 + r_in) / 2
    ra = (od / 2 - r_in) / 2
    rb = width / 2
    out = []
    for k in range(n):
        t = k / n * TAU
        # flatten the bead side so the tyre seats into the rim
        c = math.cos(t)
        r = rc + ra * c if c > -0.6 else rc - ra * 0.6 - 0.25 * ra * (-c - 0.6)
        out.append((r, rb * math.sin(t) * (0.82 if c < -0.3 else 1.0)))
    return out


def hub_profile(old, flange_y, flange_r, body_r, cassette_side=None):
    h = old / 2
    fl, fr = flange_y
    p = [(5.0, -h), (9.5, -h), (9.5, -h + 3), (13, -h + 4), (13, fl - 4), (flange_r, fl - 1.4), (flange_r, fl + 1.4),
         (body_r + 2, fl + 3), (body_r, (fl + fr) / 2), (body_r + 2, fr - 3), (flange_r, fr - 1.4), (flange_r, fr + 1.4),
         (13, fr + 4), (13, h - 4), (9.5, h - 3), (9.5, h), (5.0, h)]
    return p


def bladed_spokes(C, n, flange_y, flange_r, rim_r, blade=(2.2, 0.9), cross_ang=0.0, phase=0.0, lateral_rim=0.0):
    """n straight bladed spokes; flange_y is a list per spoke side pattern (alternating)."""
    V, F = [], []
    for k in range(n):
        a = phase + k / n * TAU
        side = flange_y[k % len(flange_y)]
        ah = a + (cross_ang if (k // len(flange_y)) % 2 == 0 else -cross_ang) if cross_ang else a
        hub = Vector((flange_r * math.cos(ah), side, flange_r * math.sin(ah)))
        rim = Vector((rim_r * math.cos(a), lateral_rim * (1 if side > 0 else -1), rim_r * math.sin(a)))
        d = (rim - hub).normalized()
        lat = Vector((0, 1, 0))
        w = d.cross(lat).normalized()      # in the wheel plane: blade faces the wind
        s = d.cross(w).normalized()
        base = len(V)
        for p in (hub, rim):
            for sx, sy in ((1, 1), (-1, 1), (-1, -1), (1, -1)):
                V.append((C + p + w * sx * blade[0] / 2 + s * sy * blade[1] / 2) * MM)
        F += [[base + 0, base + 1, base + 5, base + 4], [base + 1, base + 2, base + 6, base + 5],
              [base + 2, base + 3, base + 7, base + 6], [base + 3, base + 0, base + 4, base + 7]]
    return V, F, None


def build_wheel(M, C, which, w):
    """w: dict with bsd, tyre_od, tyre_width, rim_depth, rim_width_brake, rim_width_bed, spokes, old,
    flange_y (list), flange_r, spoke_cross (rad), rim_material key, tyre label."""
    front = which == 'front'
    g = empty('wheel_' + which, W(C), part='wheel_' + which, explode=[.34, 0, 0] if front else [-.36, 0, 0])
    V, F, U = lathe(tyre_profile(w['bsd'], w['tyre_od'], w['tyre_width']), 160, C, closed_prof=True)
    mesh('tyre_' + which, V, F, M['tyre'], parent=g, origin=W(C), uvs=U, part='tyre_' + which,
         explode=[0, -.30 if front else -.40, 0])
    V, F, U = lathe(rim_profile(w['bsd'], w['rim_depth'], w['rim_width_brake'], w['rim_width_bed']), 160, C,
                    closed_prof=True)
    PB().add((V, F, U), M[w.get('rim_material', 'rim_alu')]).build(
        'rim_' + which, parent=g, origin=W(C), sharp=45, part='rim_' + which, explode=[0, -.14 if front else -.2, 0])
    hub = hub_profile(w['old'], w['flange_y'][:2] if front else (w['flange_y'][0], w['flange_y'][1]),
                      w['flange_r'], 12)
    V, F, U = lathe(hub, 40, C, closed_prof=True)
    mesh('hub_' + which, V, F, M['hub'], parent=g, origin=W(C), sharp=35, part='hub_' + which, explode=[0, .07, 0])
    rim_r = w['bsd'] / 2 - w['rim_depth'] + 2.5
    V, F, _ = bladed_spokes(C, w['spokes'], w['flange_y'], w['flange_r'] - 2, rim_r, cross_ang=w.get('spoke_cross', 0.0),
                            phase=math.pi / w['spokes'] / 2)
    mesh('spokes_' + which, V, F, M['spoke'], parent=g, origin=W(C), smooth=False, part='spokes_' + which)
    # quick release: axle rod, lever on the non-drive side (+Y)
    h = w['old'] / 2
    pb = PB().add(tube(W(C + Vector((0, -h - 9, 0))), W(C + Vector((0, h + 9, 0))), 2.6, 2.6, 12), M['steel'])
    pb.add(lathe([(0.1, -h - 12), (9, -h - 12), (9, -h - 5), (0.1, -h - 5)], 18, C, closed_prof=True), M['alu_silver'])
    pb.add(lathe([(0.1, h + 5), (10, h + 5), (10, h + 13), (0.1, h + 13)], 18, C, closed_prof=True), M['alu_silver'])
    lever_a = C + Vector((0, h + 11, 0))
    lever_b = C + Vector((-52 if not front else -50, h + 15, 12))
    pb.add(tube(W(lever_a), W(lever_b), 4.5, 3.2, 12), M['alu_silver'])
    pb.build('skewer_' + which, parent=g, origin=W(C), part='skewer_' + which, explode=[0, .12, 0])
    # valve at the rim bed
    va = C + Vector((0, 0, -(rim_r - 1)))
    V, F, _ = tube(W(va), W(va + Vector((0, 0, 30))), 3.0, 3.0, 10)
    mesh('valve_' + which, V, F, M['alu_silver'], parent=g, origin=W(C), part='valve_' + which)
    return g


# ============================================================ drivetrain
def cog_radius(n, pitch=12.7):
    return pitch / (2 * math.sin(math.pi / n))


def cog(C, n, y, thick=1.8, inner=None):
    out = gear_outline(n, cog_radius(n), root=3.6, tip=2.9, pts=7)
    r_in = inner if inner else max(17.0, cog_radius(n) - 9)
    from lib import circle_matched
    return ring_solid(out, circle_matched(out, r_in), y - thick / 2, y + thick / 2, C)


def build_cassette(M, C, cogs, y_small, pitch_y, parent):
    pb = PB()
    for i, n in enumerate(cogs):
        pb.add(cog(C, n, y_small + i * pitch_y, inner=17.5), M['steel'])
    y_big = y_small + (len(cogs) - 1) * pitch_y
    pb.add(lathe([(16.5, y_small - 3), (19, y_small - 3), (19, y_big + 1), (16.5, y_big + 1)], 36, C, closed_prof=True),
           M['alu_dark'])
    return pb.build('cassette', parent=parent, origin=W(C), sharp=30, part='cassette', explode=[0, -.22, 0])


def build_crankset(M, BB, rings, ring_y, bcd, arm_len, arm_angle_deg, q_half=70.0):
    """rings: tooth counts; ring_y: lateral positions (drive side negative). arm_angle measured from +X towards +Z."""
    g = empty('crankset', W(BB), part='crankset', explode=[0, -.18, -.02])
    pb = PB()
    for n, y in zip(rings, ring_y):
        out = gear_outline(n, cog_radius(n), root=3.8, tip=3.2, pts=7)
        from lib import circle_matched
        pb.add(ring_solid(out, circle_matched(out, bcd / 2 - 7), y - 1.0, y + 1.0, BB), M['alu_silver'])
    pb.build('chainrings', parent=g, origin=W(BB), sharp=30, part='chainrings', explode=[0, -.06, 0])
    a = math.radians(arm_angle_deg)
    d = Vector((math.cos(a), 0, math.sin(a)))
    pb = PB()
    # 5-arm spider, one arm aligned with the crank
    ys = min(ring_y) - 1.5
    for k in range(5):
        ak = a + k * TAU / 5
        dk = Vector((math.cos(ak), 0, math.sin(ak)))
        p0 = BB + Vector((0, ys, 0)) + dk * 14
        p1 = BB + Vector((0, ys, 0)) + dk * (bcd / 2 + 4)
        pb.add(swept_tube([p0, p1], [ellipse_prof(3.5, 7.5, 12), ellipse_prof(3.0, 5.0, 12)]), M['alu_silver'])
        bolt = BB + dk * (bcd / 2)
        pb.add(lathe([(0.1, max(ring_y) + 1.6), (4.2, max(ring_y) + 1.6), (4.2, ys - 2.5), (0.1, ys - 2.5)], 14,
                     bolt, closed_prof=True), M['alu_dark'])
    for sgn in (1, -1):                       # drive arm (-Y) along d, non-drive arm opposite
        dd = d if sgn > 0 else -d
        yarm = -q_half if sgn > 0 else q_half
        base = BB + Vector((0, yarm, 0))
        tip = base + dd * arm_len
        prof0 = superellipse(12, 19, 2.4, 20)
        prof1 = superellipse(9, 13, 2.4, 20)
        pb.add(swept_tube([base - dd * 12, base + dd * arm_len * .5, tip + dd * 10], [prof0, superellipse(10, 15, 2.4, 20), prof1]),
               M['alu_silver'])
        pb.add(lathe([(0.1, -6), (11, -6), (11, 6), (0.1, 6)], 20, tip + Vector((0, 0, 0)), closed_prof=True),
               M['alu_silver'])
    pb.add(tube(W(BB + Vector((0, -q_half, 0))), W(BB + Vector((0, q_half, 0))), 12, 12, 20), M['steel'])
    pb.build('crank_arms', parent=g, origin=W(BB), sharp=35, part='crank_arms', explode=[0, -.1, 0])
    return g


def chain_path(BB, ring_r, AX_R, cog_r, jockey, idler, jr=24.0):
    """Closed polyline (mm, XZ) around ring (top & front), cog (top & back), jockey + idler pulleys (bottom)."""
    from mathutils.geometry import intersect_line_line_2d
    pts = []
    def arc(c, r, a0, a1, n):
        return [Vector((c.x + r * math.cos(a0 + (a1 - a0) * k / n), 0, c.z + r * math.sin(a0 + (a1 - a0) * k / n)))
                for k in range(n + 1)]

    def ext_tangent(c1, r1, c2, r2, upper=True):
        d = Vector((c2.x - c1.x, c2.z - c1.z))
        L = d.length
        ang = math.atan2(d.y, d.x)
        off = math.acos((r1 - r2) / L)
        t = ang + off if upper else ang - off
        return (Vector((c1.x + r1 * math.cos(t), 0, c1.z + r1 * math.sin(t))),
                Vector((c2.x + r2 * math.cos(t), 0, c2.z + r2 * math.sin(t))), t)

    # upper run: ring top -> cog top
    a1, b1, t1 = ext_tangent(BB, ring_r, AX_R, cog_r, upper=False)
    # lower run: cog -> jockey (wraps over the cog back and down into the jockey)
    # ring bottom <- idler
    a3, b3, t3 = ext_tangent(idler, jr / 2, BB, ring_r, upper=False)
    pts += arc(BB, ring_r, t3 + TAU, t1 + TAU if t1 < t3 else t1, 40)
    pts += arc(AX_R, cog_r, t1, t1 + math.radians(185), 20)
    pts += arc(jockey, jr / 2, math.radians(90), math.radians(-60), 10)
    pts += arc(idler, jr / 2, math.radians(180), t3 + TAU if t3 < 0 else t3, 10)
    return pts


def build_chain(M, path, y, parent_name='chain', pitch=12.7):
    """Discrete links along a closed path: alternating inner/outer plates plus rollers."""
    L = [0.0]
    for i in range(1, len(path)):
        L.append(L[-1] + (path[i] - path[i - 1]).length)
    total = L[-1] + (path[0] - path[-1]).length
    n = int(total // pitch)
    step = total / n
    closed = path + [path[0]]
    Lc = L + [total]

    def at(s):
        s %= total
        j = max(k for k in range(len(Lc)) if Lc[k] <= s) if s > 0 else 0
        j = min(j, len(closed) - 2)
        t = (s - Lc[j]) / max(Lc[j + 1] - Lc[j], 1e-9)
        return closed[j].lerp(closed[j + 1], t)

    parts = []
    for k in range(n):
        p0, p1 = at(k * step), at((k + 1) * step)
        outer = k % 2 == 0
        hw = 3.7 if outer else 2.9
        for sgn in (-1, 1):
            yy = y + sgn * hw
            parts.append(swept_tube([Vector((p0.x, yy, p0.z)), Vector((p1.x, yy, p1.z))],
                                    [ellipse_prof(0.45, 3.6, 8), ellipse_prof(0.45, 3.6, 8)]))
        parts.append(tube(W(Vector((p0.x, y - 3.3, p0.z))), W(Vector((p0.x, y + 3.3, p0.z))), 3.8, 3.8, 10))
    V, F, _ = join_geo([(g[0], g[1]) for g in parts])
    return mesh(parent_name, V, F, M['chain'], sharp=None, part='chain', explode=[0, -.3, -.05])


def build_rd(M, AX_R, y_cog, jockey, idler, hanger_offset=(-6, -18)):
    pb = PB()
    body_top = AX_R + Vector((hanger_offset[0], y_cog - 10, hanger_offset[1]))
    knuckle = jockey + Vector((-8, 0, 30))
    pb.add(box(body_top + Vector((0, 0, -12)), (22, 16, 30), round_e=3.0), M['alu_silver'])
    pb.add(swept_tube([body_top + Vector((0, 0, -22)), knuckle],
                      [superellipse(8, 18, 2.6, 16), superellipse(7, 14, 2.6, 16)]), M['alu_silver'])
    for c in (jockey, idler):
        from lib import circle_matched
        out = gear_outline(11, 11.5, root=2.2, tip=1.6, pts=6)
        pb.add(ring_solid(out, circle_matched(out, 3), -1.6, 1.6, c), M['black'])
    # cage plates
    for dy in (-4.2, 4.2):
        a = jockey + Vector((0, dy, 0))
        b = idler + Vector((0, dy, 0))
        pb.add(swept_tube([a + (a - b).normalized() * 12, b - (a - b).normalized() * 12],
                          [ellipse_prof(0.9, 13, 10), ellipse_prof(0.9, 13, 10)]), M['alu_silver'])
    return pb.build('rear_derailleur', sharp=35, part='rear_derailleur', explode=[-.08, -.2, -.06])


def build_fd(M, clamp_c, ring_top, y_ring):
    pb = PB()
    pb.add(box(clamp_c, (26, 22, 14), round_e=3.0), M['alu_silver'])
    cage_c = ring_top + Vector((-6, y_ring, 10))
    for dy in (-5, 5):
        pb.add(box(cage_c + Vector((0, dy, 0)), (62, 1.6, 18), round_e=2.6), M['alu_silver'])
    pb.add(swept_tube([clamp_c + Vector((0, y_ring * .5, -6)), cage_c + Vector((0, 0, 8))],
                      [ellipse_prof(6, 5, 12), ellipse_prof(5, 4, 12)]), M['alu_silver'])
    return pb.build('front_derailleur', sharp=35, part='front_derailleur', explode=[.02, -.14, .04])


# ============================================================ brakes
def build_caliper(M, name, pivot, rim_c, rim_r_track, facing, yhalf=12.0):
    """Dual-pivot side-pull caliper. pivot: mounting bolt (mm). facing: +1 front of fork crown, -1 behind bridge."""
    pb = PB()
    to_rim = (rim_c - pivot)
    d = Vector((to_rim.x, 0, to_rim.z)).normalized()
    pad_c = rim_c - d * (rim_r_track - 5)
    for sgn in (-1, 1):
        y = sgn * yhalf
        top = pivot + Vector((6 * facing, y * .5, 0))
        pad = pad_c + Vector((0, y + sgn * 4, 0))
        pb.add(swept_tube([top, top.lerp(pad, .5) + Vector((12 * facing, sgn * 10, 0)), pad],
                          [superellipse(5, 14, 2.4, 14), superellipse(5, 11, 2.4, 14), superellipse(5, 9, 2.4, 14)]),
               M['alu_silver'])
        pb.add(box(pad + Vector((0, -sgn * 2.5, 0)), (40, 5, 9), round_e=2.4), M['black'])
    pb.add(tube(W(pivot + Vector((0, -16, 0))), W(pivot + Vector((0, 16, 0))), 5, 5, 12), M['alu_silver'])
    pb.add(box(pivot + Vector((6 * facing, 0, 14)), (16, 30, 10), round_e=2.6), M['alu_silver'])
    return pb.build(name, sharp=35, part=name, explode=[.06 * facing, 0, .06])


# ============================================================ cockpit
def build_steerer_stem(M, steer_bot, steer_top, up, stem_len, stem_rise_deg, spacer_h, clamp_d=26.0):
    """Threadless: spacers on the steerer, stem body to the bar clamp. Returns (object, bar clamp centre)."""
    pb = PB()
    pb.add(tube(W(steer_bot), W(steer_top + up * (spacer_h + 42)), 12.7, 12.7, 20), M['alu_dark'])
    s0 = steer_top
    pb.add(tube(W(s0), W(s0 + up * spacer_h), 17.5, 17.5, 24), M['black'])
    stem0 = s0 + up * (spacer_h + 20)
    nrm = Vector((up.z, 0, -up.x))                   # perpendicular to steerer, pointing forward
    a = math.radians(stem_rise_deg)
    sd = (nrm * math.cos(a) + up * math.sin(a)).normalized()
    clamp = stem0 + sd * stem_len
    pb.add(tube(W(s0 + up * spacer_h), W(s0 + up * (spacer_h + 40)), 20, 20, 24), M['black'])
    pb.add(swept_tube([stem0, stem0.lerp(clamp, .5), clamp], [superellipse(15, 18, 2.4, 20)] * 3), M['black'])
    pb.add(tube(W(clamp + Vector((0, -21, 0))), W(clamp + Vector((0, 21, 0))), clamp_d / 2 + 4, clamp_d / 2 + 4, 24),
           M['black'])
    pb.add(tube(W(s0 + up * (spacer_h + 40)), W(s0 + up * (spacer_h + 44)), 16, 16, 20), M['alu_dark'])
    o = pb.build('stem', sharp=35, part='stem', explode=[0, 0, .1])
    return o, clamp


def build_bullhorn(M, clamp, tip_rel, width, drop_rel=0.0, name='basebar'):
    """Bullhorn base bar: straight centre, bends forward to horns ending at tip_rel (dx, dz) from the clamp."""
    pb = PB()
    hw = width / 2
    for sgn in (-1, 1):
        p = [clamp + Vector((0, 0, 0)), clamp + Vector((0, sgn * hw * .6, 0)),
             clamp + Vector((12, sgn * hw * .95, 2)), clamp + Vector((50, sgn * hw, 8)),
             clamp + Vector((tip_rel[0] * .55, sgn * hw * .98, tip_rel[1] * .55)),
             clamp + Vector((tip_rel[0], sgn * hw * .95, tip_rel[1]))]
        from lib import catmull
        path = catmull(p, 6)
        pb.add(swept_tube(path, [ellipse_prof(13, 13, 16)] + [ellipse_prof(11.9, 11.9, 16)] * (len(path) - 1)),
               M['bar_tape'])
    return pb.build(name, sharp=None, part=name, explode=[.1, 0, .06])


def build_clipons(M, clamp, pad_rel, tip_rel, spread, pad_len=100, pad_w=70, name='clipons'):
    """Clip-on extensions with elbow pads and ski-bend ends. Returns (obj, [tip positions])."""
    pb = PB()
    tips = []
    from lib import catmull
    for sgn in (-1, 1):
        y = sgn * spread / 2
        base = clamp + Vector((-25, y, 0))
        pad = clamp + Vector((pad_rel[0], y, pad_rel[1]))
        bend0 = clamp + Vector((tip_rel[0] * .78, y * .8, tip_rel[1] * .12))
        tip = clamp + Vector((tip_rel[0], y * .75, tip_rel[1]))
        path = catmull([base, clamp + Vector((60, y * .9, 4)), bend0, bend0 + (tip - bend0) * .55 + Vector((-4, 0, 0)), tip], 7)
        pb.add(swept_tube(path, [ellipse_prof(11, 11, 14)] * len(path)), M['bar_tape'])
        # pad support + pad
        pb.add(tube(W(pad + Vector((0, 0, -pad_rel[1] + 6))), W(pad + Vector((0, 0, -14))), 9, 9, 12), M['alu_black'])
        pb.add(box(pad + Vector((0, 0, -8)), (pad_len, pad_w * .8, 8), round_e=3.2), M['alu_black'])
        pb.add(box(pad, (pad_len, pad_w, 16), round_e=2.2), M['pad'])
        tips.append(tip)
    pb.add(box(clamp + Vector((-10, 0, -2)), (34, spread * .9, 20), round_e=3.0), M['alu_black'])
    o = pb.build(name, sharp=35, part=name, explode=[.14, 0, .1])
    return o, tips


def build_barend_shifters(M, tips, up_dir, name='shifters'):
    pb = PB()
    for tip in tips:
        pb.add(tube(W(tip), W(tip + up_dir * 10), 11.5, 11.5, 16), M['alu_silver'])
        lever_end = tip + up_dir * 8 + Vector((34, 0, 18))
        pb.add(swept_tube([tip + up_dir * 8, lever_end], [superellipse(4, 9, 2.4, 12), superellipse(3.5, 6, 2.4, 12)]),
               M['alu_silver'])
    return pb.build(name, sharp=35, part=name, explode=[.12, 0, .12])


def build_aero_levers(M, horn_tips, dir_fwd, name='brake_levers'):
    pb = PB()
    for tip in horn_tips:
        body = tip + dir_fwd * 18
        pb.add(tube(W(tip), W(body), 12, 12, 16), M['alu_silver'])
        blade_top = body + Vector((0, 0, -6))
        blade_bot = body + Vector((-26, 0, -92))
        pb.add(swept_tube([blade_top, blade_top.lerp(blade_bot, .5) + Vector((6, 0, 0)), blade_bot],
                          [superellipse(4, 11, 2.4, 12), superellipse(4, 8, 2.4, 12), superellipse(3.5, 6, 2.4, 12)]),
               M['alu_silver'])
    return pb.build(name, sharp=35, part=name, explode=[.16, 0, 0])


# ============================================================ seat
def build_seatpost(M, st_top, sdir, insert, extension, setback, d=27.2):
    pb = PB()
    bot = st_top - sdir * insert
    top = st_top + sdir * extension
    pb.add(tube(W(bot), W(top), d / 2, d / 2, 24), M['alu_black'])
    head = top + Vector((-setback, 0, 10))
    pb.add(box(head, (44, 30, 16), round_e=2.8), M['alu_black'])
    pb.add(swept_tube([top - sdir * 2, head + Vector((0, 0, -6))], [ellipse_prof(d / 2, d / 2, 16)] * 2), M['alu_black'])
    for sgn in (-1, 1):
        pb.add(tube(W(head + Vector((-24, sgn * 10, 8))), W(head + Vector((24, sgn * 10, 8))), 3.5, 3.5, 8), M['steel'])
    o = pb.build('seatpost', sharp=35, part='seatpost', explode=[-.04, 0, .16])
    return o, head


def build_saddle(M, clamp, length, width, nose_drop=4.0, top_above_clamp=26.0):
    """Lofted shell: stations along X with half-width and height; rails beneath."""
    pb = PB()
    rings = []
    stations = [(-0.50, .30, 8), (-0.47, .48, 11), (-0.40, .50, 13), (-0.28, .47, 13), (-0.12, .34, 12),
                (0.05, .20, 11), (0.22, .14, 10), (0.38, .12, 10), (0.48, .10, 8), (0.52, .05, 5)]
    rear_x = clamp.x - length * 0.50
    from lib import loft
    for f, hw, th in stations:
        x = clamp.x + f * length
        z_top = clamp.z + top_above_clamp - nose_drop * max(0, f) * 2
        ring = []
        n = 20
        for k in range(n):
            t = k / n * TAU
            yy = hw * width * math.cos(t)
            zz = (th / 2) * math.sin(t) * (1.0 if math.sin(t) > 0 else 0.6)
            ring.append(W(Vector((x, yy, z_top - th / 2 + zz))))
        rings.append(ring)
    V, F, U = loft(rings, True, True, True)
    pb.add((V, F, U), M['saddle'])
    for sgn in (-1, 1):
        p = [Vector((clamp.x - length * .36, sgn * width * .22, clamp.z + top_above_clamp - 12)),
             Vector((clamp.x - 40, sgn * 20, clamp.z + 8)), Vector((clamp.x + 40, sgn * 20, clamp.z + 8)),
             Vector((clamp.x + length * .40, sgn * 8, clamp.z + top_above_clamp - 14))]
        from lib import catmull
        pb.add(swept_tube(catmull(p, 6), [ellipse_prof(3.5, 3.5, 10)] * (3 * 6 + 1)), M['steel'])
    return pb.build('saddle', sharp=None, part='saddle', explode=[-.06, 0, .26])
