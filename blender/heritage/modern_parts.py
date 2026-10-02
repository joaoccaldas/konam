"""SRAM RED AXS E1 parts for the Speed Concept SLR, retargeted onto this bike's skeleton.

Forked from speedmax-cfr-3d/blender/components.py (Canyon Speedmax CFR AXS stock shapes:
chainrings, power-meter spider, XG-1290 cassette body, Paceline-style rotor, UDH rear
derailleur, flat-mount calipers, thru-axles, chain). Those shapes were drawn in Canyon
world millimetres, where the BB sits at z = 264.5. Every station here is an offset from
the skeleton BB or an axle passed in by the caller.

Numbers that are this bike's, from museum/current/specs-speed-concept-slr-gen3.json:
48/35 rings, 170 mm crank on M/L/XL (160 on S), XG-1290 10-33, Paceline X 160 mm both
ends, Aeolus RSL 51 (51 mm depth), R4 320 700x25 with a tan sidewall, 100x12 and 142x12
axles. The drive-crank angle is measured on the complete-bike photo, not taken from the
Canyon file (−12°).
"""
import math, json
import bmesh
from mathutils import Vector, Matrix
from lib import (MM, empty, mesh, lathe, sweep, tube, box, join_geo, xform, gear_outline,
                 ring_solid, superellipse, prism, circle_matched)


def W(v):
    return Vector(v) * MM

TAU = 2 * math.pi

# Canyon file stored the front-derailleur body at absolute z (BB height there is 264.5).
CANYON_BB_Z = 264.5

# Drive crank on SpeedConceptSLR9AXS-27-86500-A-Primary-Temp.png: marked spindle
# (1315, 1752.5) to the pedal-eye hole (1615.5, 1814.3). Photo length 171.7 mm at the
# tyre scale; the model uses the published 170 mm. Angle is from +X toward +Z.
CRANK_ANG = math.radians(-11.63)
CRANK_LEN = {'S': 160.0, 'M': 170.0, 'L': 170.0, 'XL': 170.0}
CHAINRINGS = (48, 35)
CASSETTE = [10, 11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 33]  # SRAM RED XG-1290 E1 10-33
ROTOR_R = 80.0  # 160 mm Paceline X, both wheels
TYRE_OD = 672.0  # R4 320 700x25: 622 bead seat + 2 x 25
RIM_DEPTH = 51.0  # Aeolus RSL 51, published depth. Section width is inferred.


def bb_off(BB, x, y, canyon_z):
    """Canyon world point whose x/y were already BB-relative and whose z was absolute."""
    return BB + Vector((x, y, canyon_z - CANYON_BB_Z))


class PB:
    """Part builder: accumulate geometry per material, emit one multi-material object."""

    def __init__(self):
        self.items = []

    def add(self, geo, material):
        self.items.append((geo, material))
        return self

    def build(self, name, parent=None, origin=None, smooth=True, sharp=40, **props):
        mats, V, F, U, FM = [], [], [], [], []
        any_uv = any(g[2] for g, _ in self.items)
        for (gv, gf, gu), m in self.items:
            if m not in mats:
                mats.append(m)
            mi = mats.index(m)
            off = len(V)
            V += gv
            F += [[i + off for i in f] for f in gf]
            FM += [mi] * len(gf)
            if any_uv:
                U += gu if gu else [[(0, 0)] * len(f) for f in gf]
        return mesh(name, V, F, mats[0], parent=parent, origin=origin, smooth=smooth, uvs=U if any_uv else None,
                    sharp=sharp, mats=mats, face_mats=FM, **props)


def rotY(theta):
    """Rotation that maps +X to (cos t, 0, sin t) in the XZ plane (t measured towards +Z)."""
    return Matrix.Rotation(-theta, 4, 'Y')


def at(geo, pivot_mm, theta=0.0, offset=Vector()):
    """Rotate geo (world metres) about the lateral axis through pivot by theta, then offset (mm)."""
    P = W(pivot_mm)
    M = Matrix.Translation(P + W(offset)) @ rotY(theta) @ Matrix.Translation(-P)
    return xform(geo, M)


# ======================================================================= WHEELS
def rim_prof(depth=RIM_DEPTH):
    """Closed (radius, lateral) section. Outer radius sits just under a 622 bead seat.
    Depth is the published 51 mm. The 28 mm external width is inferred, not traced."""
    outer = 311.0
    bed = outer - depth
    hw = 14.0
    return [
        (outer, 7.2), (outer - 1.5, 10.4), (outer - 6, hw), (outer - 18, hw - 0.4),
        (outer - 32, 11.2), (bed + 6, 7.4), (bed, 2.4), (bed, -2.4), (bed + 6, -7.4),
        (outer - 32, -11.2), (outer - 18, -(hw - 0.4)), (outer - 6, -hw), (outer - 1.5, -10.4),
        (outer, -7.2), (outer - 0.4, -5.6), (outer - 4.5, -3.2), (outer - 4.5, 3.2),
        (outer - 0.4, 5.6),
    ]


def tyre_prof(width, outer, bead_r=314.0):
    semi_r = outer - bead_r
    out = []
    n = 36
    for i in range(n):
        t = i / n * TAU
        r = bead_r + semi_r * math.cos(t) * (1 if math.cos(t) > 0 else 0.55)
        y = width / 2 * math.sin(t) * (1 - 0.06 * math.cos(t))
        out.append((r, y))
    return out


def split_tyre(prof, segs, center):
    """Crown of the section is the black tread; the flanks are the tan sidewall."""
    V, F, _ = lathe(prof, segs, center, closed_prof=True)
    pcols = len(prof)
    bead = min(r for r, _ in prof)
    crown = max(r for r, _ in prof)
    cut = bead + 0.55 * (crown - bead)
    tread, side = [], []
    for i, f in enumerate(F):
        j = i % pcols
        r = 0.5 * (prof[j][0] + prof[(j + 1) % pcols][0])
        (tread if r >= cut else side).append(f)
    return (V, tread, None), (V, side, None)


def spokes(center, n, flange_y, flange_r, rim_r=228, blade=(2.3, 0.9), cross=0.42):
    V, F = [], []
    for i in range(n):
        side = 1 if i % 2 else -1
        fy = flange_y[0] if side < 0 else flange_y[1]
        pr = i / n * TAU
        ph = pr + (cross if (i // 2) % 2 else -cross)
        h = W(center + Vector((flange_r * math.cos(ph), fy, flange_r * math.sin(ph))))
        r = W(center + Vector((rim_r * math.cos(pr), side * 1.6, rim_r * math.sin(pr))))
        d = (r - h).normalized()
        w = d.cross(Vector((0, 1, 0))).normalized() * (blade[0] / 2 * MM)
        t = w.cross(d).normalized() * (blade[1] / 2 * MM)
        base = len(V)
        for p in (h, r):
            V += [p + w + t, p - w + t, p - w - t, p + w - t]
        F += [[base + k, base + (k + 1) % 4, base + 4 + (k + 1) % 4, base + 4 + k] for k in range(4)]
    return V, F, None


def rotor(center, r_out, y, seg=120):
    """SRAM Paceline X style: steel braking track with cut-outs on an alloy carrier, centre-lock."""
    bm = bmesh.new()
    radii = [r_out - 14, r_out - 11, r_out - 5, r_out - 2.5, r_out]
    grid = [[bm.verts.new(tuple(W(center + Vector((r * math.cos(a), y, r * math.sin(a))))))
             for r in radii] for a in [k / seg * TAU for k in range(seg)]]
    faces = []
    for k in range(seg):
        k2 = (k + 1) % seg
        for j in range(len(radii) - 1):
            hole = (j == 1 and k % 4 in (1, 2)) or (j == 2 and k % 4 == 3 and (k // 4) % 2 == 0)
            if hole:
                continue
            faces.append(bm.faces.new((grid[k][j], grid[k2][j], grid[k2][j + 1], grid[k][j + 1])))
    bmesh.ops.solidify(bm, geom=faces, thickness=1.85 * MM)
    ring = ([v.co.copy() for v in bm.verts], [[v.index for v in f.verts] for f in bm.faces], None)
    bm.free()
    arms = []
    for k in range(6):
        a0 = k / 6 * TAU
        pts = []
        for i in range(7):
            t = i / 6
            r = 24 + (r_out - 13 - 24) * t
            a = a0 + 0.55 * t * t
            pts.append(W(center + Vector((r * math.cos(a), y, r * math.sin(a)))))
        prof = superellipse(3.2, 9 - 3 * 0, 3, 16)
        arms.append(sweep(pts, [superellipse(3.2, 10 - 4 * i / 6, 3, 16) for i in range(7)]))
    carrier = lathe([(17, y - 3.5), (27, y - 3.5), (27, y + 2.4), (17, y + 2.4)], 48, center, closed_prof=True)
    return ring, join_geo([(g[0], g[1]) for g in arms] + [(carrier[0], carrier[1])])


def cog_r(n):
    return 12.7 / (2 * math.sin(math.pi / n))


def cog(center, n, y, thick=1.7, inner=None, tip=3.2):
    rp = cog_r(n)
    outer = gear_outline(n, rp, root=3.9, tip=tip)
    ri = inner if inner else max(17.5, rp - 9.5)
    inn = circle_matched(outer, ri)
    return ring_solid(outer, inn, y - thick / 2, y + thick / 2, center)


def cassette_y(i):
    return -63.5 + i * 3.75


def build_wheel(M, axle, which, parent=None, tyre_width=25.0, tyre_od=TYRE_OD, depth=RIM_DEPTH):
    front = which == 'front'
    C = axle
    g = empty('wheel_' + which, W(C), parent=parent, part='wheel_' + which, explode=[.34, 0, 0] if front else [-.36, 0, 0])
    outer = tyre_od / 2
    # tyre: black crown, tan flank. Two materials, one section.
    tread, side = split_tyre(tyre_prof(tyre_width, outer), 128, C)
    PB().add(tread, M['tyre']).add(side, M['tyre_tan']).build(
        'tyre_' + which, parent=g, origin=W(C), part='tyre_' + which, explode=[0, -.30 if front else -.40, 0])
    # rim — 51 mm published depth
    V, F, U = lathe(rim_prof(depth), 128, C, closed_prof=True)
    mesh('rim_' + which, V, F, M['rim'], parent=g, origin=W(C), uvs=U, sharp=50, part='rim_' + which,
         explode=[0, -.14 if front else -.2, 0])
    # hub
    if front:
        hp = [(6.2, -50), (11, -50), (11, -47), (15, -45), (15, -34), (24, -33), (24, -28), (16, -27), (15, 0), (16, 27),
              (24, 28), (24, 33), (18, 34), (18, 38), (19.5, 38), (19.5, 46), (11, 47), (11, 50), (6.2, 50)]
        fl, fr_, nsp = (-30.5, 30.5), 24, 20
    else:
        hp = [(6.2, -71), (12, -71), (12, -68), (17, -67), (17, -24), (19, -23), (24, -22), (24, -17), (17, -16),
              (15.5, 0), (17, 28), (24, 29), (24, 34), (18, 35), (18, 44), (19.5, 44), (19.5, 52), (12, 54), (12, 71),
              (6.2, 71)]
        fl, fr_, nsp = (-19.5, 31.5), 24, 24
    V, F, U = lathe(hp, 48, C, closed_prof=True)
    mesh('hub_' + which, V, F, M['hub'], parent=g, origin=W(C), sharp=35, part='hub_' + which,
         explode=[0, .07, 0])
    V, F, _ = spokes(C, nsp, fl, fr_ - 2)
    mesh('spokes_' + which, V, F, M['spoke'], parent=g, origin=W(C), smooth=False, part='spokes_' + which,
         explode=[0, 0, 0])
    # Paceline X 160 mm, non-drive side (+Y). Lateral station follows the centerlock layout.
    r_out, ry = (ROTOR_R, 44.0) if front else (ROTOR_R, 51.0)
    ring, carr = rotor(C, r_out, ry)
    PB().add(ring, M['rotor']).add((carr[0], carr[1], None), M['alu_black']).build(
        'rotor_' + which, parent=g, origin=W(C), sharp=30, part='rotor_' + which, explode=[0, .2, 0])
    if not front:
        pb = PB()
        for i, n in enumerate(CASSETTE):
            pb.add(cog(C, n, cassette_y(i), inner=(17.5 if i < 5 else cog_r(n) - 8.5)), M['steel'])
        # X-Dome carrier (machined one-piece body for the larger cogs)
        dome = [(18, -46), (26, -44.5), (40, -37.5), (52, -30), (62, -23.0), (62.5, -21.3), (58, -21.3), (48, -29),
                (36, -36.5), (24, -43), (18, -44.3)]
        dv = lathe(dome, 64, C, closed_prof=True)
        pb.add(dv, M['alu_dark'])
        pb.add(lathe([(16, -66.6), (19.5, -66.6), (19.5, -64.6), (16, -64.6)], 36, C, closed_prof=True), M['alu_dark'])
        pb.build('cassette', parent=g, origin=W(C), sharp=30, part='cassette', explode=[0, -.22, 0])
    return g


# ======================================================================= CHAIN
def tangent(c1, r1, s1, c2, r2, s2):
    """Chain leaving circle1 (orientation s1: +1 ccw, -1 cw) to circle2. 2D vectors (x,z)."""
    R1, R2 = s1 * r1, s2 * r2
    d = c2 - c1
    D = d.length
    dh = d / D
    k = (R1 - R2) / D
    perp = Vector((-dh.y, dh.x))
    best = None
    for sg in (1, -1):
        n = dh * k + perp * (sg * math.sqrt(max(0, 1 - k * k)))
        t1, t2 = c1 + n * R1, c2 + n * R2
        v = Vector((-n.y, n.x))
        if v.dot(t2 - t1) > 0:
            best = (t1, t2)
    return best


def chain_path(BB, AX_R, big=None, cog_n=14):
    """Closed chain pitch line. big defaults to the published large ring. cog_n is the cog the chain rests on."""
    big = CHAINRINGS[0] if big is None else big
    ring_c = Vector((BB.x, BB.z))
    ax = Vector((AX_R.x, AX_R.z))
    U = ax + Vector((-22, -80))
    L = ax + Vector((-8, -156))
    circles = [(ring_c, cog_r(big), -1), (L, cog_r(12), -1), (U, cog_r(12), 1), (ax, cog_r(cog_n), -1)]
    n = len(circles)
    tans = [tangent(*circles[i], *circles[(i + 1) % n]) for i in range(n)]
    pts = []
    for i in range(n):
        c, r, s = circles[i]
        arrive = tans[i - 1][1]
        leave = tans[i][0]
        a0 = math.atan2(arrive.y - c.y, arrive.x - c.x)
        a1 = math.atan2(leave.y - c.y, leave.x - c.x)
        if s < 0:
            while a1 > a0:
                a1 -= TAU
        else:
            while a1 < a0:
                a1 += TAU
        steps = max(2, int(abs(a1 - a0) * r / 3))
        for k in range(steps + 1):
            a = a0 + (a1 - a0) * k / steps
            pts.append(c + Vector((math.cos(a), math.sin(a))) * r)
        # straight run to next circle
        p0, p1 = tans[i]
        L2 = (p1 - p0).length
        steps = max(1, int(L2 / 4))
        for k in range(1, steps):
            pts.append(p0.lerp(p1, k / steps))
    y = -48.0
    pts3 = [Vector((p.x, y, p.y)) for p in pts]
    # dedupe
    clean = [pts3[0]]
    for p in pts3[1:]:
        if (p - clean[-1]).length > 0.2:
            clean.append(p)
    return clean, {'U': [U.x, U.y], 'L': [L.x, L.y]}


def resample_closed(pts, pitch):
    L = [0.0]
    P = pts + [pts[0]]
    for i in range(1, len(P)):
        L.append(L[-1] + (P[i] - P[i - 1]).length)
    tot = L[-1]
    N = int(round(tot / pitch))
    N -= N % 2
    step = tot / N
    out, j = [], 0
    for k in range(N):
        d = step * k
        while L[j + 1] < d:
            j += 1
        t = (d - L[j]) / max(L[j + 1] - L[j], 1e-9)
        out.append(P[j].lerp(P[j + 1], t))
    return out, step


def plate_outline(r=4.3, waist=3.1, flat=3.95, n=14):
    top = []
    for i in range(n + 1):
        x = -6.35 - r + (12.7 + 2 * r) * i / n
        z = max(math.sqrt(max(0, r * r - (x + 6.35) ** 2)), math.sqrt(max(0, r * r - (x - 6.35) ** 2)), 0)
        z = max(z, waist if abs(x) < 6.35 else 0)
        if abs(x) <= 6.35 + r * 0.6:
            z = max(z, min(flat, 0))
        top.append((x, min(z, flat)))
    out = top + [(x, -z) for x, z in reversed(top[1:-1])]
    return [(x, z) for x, z in out]


def chain_link_geo(kind):
    """kind 'outer' | 'inner'. Local: X along pitch, Y lateral, centred at origin (mm->m)."""
    geos = []
    poly = plate_outline()
    if kind == 'outer':
        for s in (-1, 1):
            geos.append(prism(poly, s * 2.55, s * 3.3))
        for x in (-6.35, 6.35):
            geos.append(lathe([(0.1, -3.5), (1.85, -3.5), (1.85, 3.5), (0.1, 3.5)], 10, Vector((x, 0, 0)), closed_prof=True))
    else:
        for s in (-1, 1):
            geos.append(prism(plate_outline(r=4.1, waist=2.9, flat=3.7), s * 1.12, s * 1.9))
        for x in (-6.35, 6.35):
            geos.append(lathe([(1.9, -1.12), (3.87, -1.12), (3.87, 1.12), (1.9, 1.12)], 12, Vector((x, 0, 0)), closed_prof=True))
    V, F, _ = join_geo([(g[0], g[1]) for g in geos])
    return V, F, None


def build_chain(M, BB, AX_R, render_links=True):
    path, meta = chain_path(BB, AX_R)
    links, pitch = resample_closed(path, 12.7)
    E = empty('chain', Vector(), part='chain', explode=[0, -.44, -.04])
    E['chain_path'] = json.dumps([[round(p.x * MM, 6), round(p.y * MM, 6), round(p.z * MM, 6)] for p in path])
    E['chain_pitch'] = pitch * MM
    E['chain_links'] = len(links)
    # templates (hidden in viewer; used for instancing)
    for kind in ('outer', 'inner'):
        V, F, _ = chain_link_geo(kind)
        o = mesh('chainlink_' + kind, V, F, M['chain'], parent=E, origin=Vector(), smooth=True, sharp=40,
                 template=1)
    if render_links:
        # a static baked chain for Blender renders / game export
        geos = []
        for i, p in enumerate(links):
            q = links[(i + 1) % len(links)]
            d = (q - p)
            mid = (p + q) / 2
            ang = math.atan2(d.z, d.x)
            V, F, _ = chain_link_geo('outer' if i % 2 == 0 else 'inner')
            Mx = Matrix.Translation(W(mid)) @ rotY(ang)
            geos.append(([Mx @ v for v in V], F))
        V, F, _ = join_geo(geos)
        mesh('chain_baked', V, F, M['chain'], smooth=True, sharp=40, baked=1)
    return E, meta


# ======================================================================= DRIVETRAIN
def build_crankset(M, BB, arm_len=170.0, angle=None):
    g = empty('crankset', W(BB), part='crankset', explode=[0, 0, 0])
    th = CRANK_ANG if angle is None else angle
    # chainrings + power-meter spider
    rings = PB()
    for n, y, inner in ((CHAINRINGS[0], -47.4, 88.0), (CHAINRINGS[1], -40.4, 63.5)):
        rings.add(cog(BB, n, y, thick=2.1, inner=inner, tip=3.4), M['alu_silver'])
        # stepped ring shoulder (machined)
        rp = cog_r(n)
        rings.add(lathe([(inner, y - 2.4), (rp - 6.5, y - 2.4), (rp - 6.5, y + 1.05), (inner, y + 1.05)], 128, BB,
                        closed_prof=True), M['alu_silver'])
    rings.build('chainrings', parent=g, origin=W(BB), sharp=35, part='chainrings', explode=[0, -.26, 0])
    sp = PB()
    for k in range(4):
        a0 = th + math.radians(45) + k * TAU / 4
        pts, profs = [], []
        for i in range(6):
            t = i / 5
            r = 22 + (89 - 22) * t
            a = a0 - 0.18 * t
            yy = -39 - 5.5 * t
            pts.append(W(BB + Vector((r * math.cos(a), yy, r * math.sin(a)))))
            profs.append(superellipse(9 - 2 * t, 26 - 10 * t + 6 * t * t, 3, 24))
        sp.add(sweep(pts, profs), M['alu_dark'])
    sp.add(lathe([(15, -44), (34, -44), (36, -40), (36, -34), (15, -34)], 64, BB, closed_prof=True), M['alu_dark'])
    # power meter pod + status LED
    led_p = BB + Vector((30 * math.cos(th + 2.4), 0, 30 * math.sin(th + 2.4)))
    sp.add(lathe([(0.1, -45.6), (2.2, -45.6), (2.2, -44.0), (0.1, -44.0)], 14, led_p, closed_prof=True),
           M['led'])
    sp.build('powermeter_spider', parent=g, origin=W(BB), sharp=35, part='powermeter_spider', explode=[0, -.18, 0])
    # arms
    for side, s, ang in (('ds', -1, th), ('nds', 1, th + math.pi)):
        pts, profs = [], []
        for i in range(9):
            t = i / 8
            r = arm_len * t
            y = s * (58 + 12 * t)
            pts.append(W(BB + Vector((r * math.cos(ang), y, r * math.sin(ang)))))
            w = 36 - 16 * t + 6 * max(0, t - .85) / .15
            th_ = 20 - 7 * t
            profs.append(superellipse(th_, w, 2.6, 32))
        pb = PB().add(sweep(pts, profs), M['carbon_crank'])
        eye = BB + Vector((arm_len * math.cos(ang), 0, arm_len * math.sin(ang)))
        pb.add(lathe([(4.5, s * 63), (11, s * 63), (11.5, s * 72), (11, s * 77), (4.5, s * 77)], 28, eye, closed_prof=True),
               M['alu_dark'])
        # crank bolt cap
        pb.add(lathe([(0.1, s * 66), (14, s * 66), (14.5, s * 70.5), (0.1, s * 71.5)], 32, BB, closed_prof=True), M['alu_dark'])
        pb.build('crank_arm_' + side, parent=g, origin=W(BB), sharp=40, part='crank_arm_' + side,
                 explode=[0, s * .36, 0])
    V, F, U = lathe([(10, -66), (14.5, -66), (14.5, 66), (10, 66)], 32, BB, closed_prof=True)
    mesh('spindle', V, F, M['steel'], parent=g, origin=W(BB), sharp=40, part='spindle', explode=[0, .16, 0])
    return g


def build_bb(M, BB):
    pb = PB()
    for s in (-1, 1):
        pb.add(lathe([(14.6, s * 43.2), (20.5, s * 43.2), (22.5, s * 44.5), (22.5, s * 48.5), (14.6, s * 48.5)], 40, BB,
                     closed_prof=True), M['alu_dark'])
        pb.add(lathe([(14.6, s * 30), (20.5, s * 30), (20.5, s * 43.2), (14.6, s * 43.2)], 40, BB, closed_prof=True),
               M['black'])
    return pb.build('bottom_bracket', origin=W(BB), sharp=40, part='bottom_bracket', explode=[0, 0, -.14])


def build_fd(M, BB):
    a0, a1 = math.radians(96), math.radians(140)
    pb = PB()
    for y0, y1 in ((-56.5, -54.3), (-38.3, -36.4)):
        pb.add(lathe([(106, y0), (125, y0), (125, y1), (106, y1)], 20, BB, closed_prof=True, a0=a0, a1=a1), M['alu_silver'])
    # bridge at tail of cage
    tail = BB + Vector((115 * math.cos(a1 - .03), -46, 115 * math.sin(a1 - .03)))
    pb.add(box(tail, (8, 20, 16), 3), M['alu_silver'])
    # Body, battery and mount were absolute z=396/404/408 in the Canyon file (BB at 264.5).
    pb.add(box(bb_off(BB, -46, -38, 396), (40, 26, 34), 3.2), M['alu_dark'])
    pb.add(box(bb_off(BB, -66, -32, 404), (22, 18, 24), 3.2), M['black'])     # AXS battery
    pb.add(box(bb_off(BB, -40, -22, 408), (26, 22, 10), 3), M['alu_dark'])    # braze-on mount
    for dy in (-52, -40):
        pb.add(tube(W(bb_off(BB, -40, dy, 382)), W(BB + Vector((115 * math.cos(1.95), dy - 3, 115 * math.sin(1.95)))), 3.2),
               M['alu_dark'])
    return pb.build('front_derailleur', sharp=35, part='front_derailleur', explode=[-.02, -.2, .12])


def build_rd(M, AX_R, meta):
    ax = AX_R
    U = Vector((meta['U'][0], 0, meta['U'][1]))
    L = Vector((meta['L'][0], 0, meta['L'][1]))
    pb = PB()
    for p in (U, L):
        pb.add(cog(p, 12, -48, thick=2.2, inner=5, tip=2.6), M['black'])
        pb.add(lathe([(0.1, -52), (9, -52), (9, -44), (0.1, -44)], 24, Vector((p.x, 0, p.z)), closed_prof=True),
               M['alu_silver'])
    # cage plates (capsule)
    for y0, y1 in ((-55.5, -53.4), (-42.6, -40.6)):
        d = (L - U)
        ang = math.atan2(d.z, d.x)
        ln = d.length
        poly = []
        for k in range(13):
            a = math.pi / 2 + k / 12 * math.pi
            poly.append((17 * math.cos(a), 17 * math.sin(a)))
        for k in range(13):
            a = -math.pi / 2 + k / 12 * math.pi
            poly.append((ln + 15 * math.cos(a), 15 * math.sin(a)))
        g = prism(poly, y0, y1)
        Mx = Matrix.Translation(W(Vector((U.x, 0, U.z)))) @ rotY(ang)
        pb.add(xform(g, Mx), M['alu_dark'] if y0 < -50 else M['alu_silver'])
    # parallelogram body + motor + battery
    knuckle = ax + Vector((-8, -84, -18))
    cagep = U + Vector((-6, -70, 18))
    pb.add(tube(W(knuckle), W(cagep), 13, 11, 24), M['alu_dark'])
    pb.add(box(ax + Vector((-26, -80, -34)), (34, 24, 42), 3.0), M['alu_dark'])
    pb.add(box(ax + Vector((-38, -86, -8)), (30, 16, 22), 3.0), M['black'])  # battery
    pb.add(box(cagep + Vector((0, 8, 0)), (26, 22, 26), 3), M['alu_dark'])
    # UDH direct mount
    pb.add(lathe([(6.5, -80), (16, -80), (16, -86), (6.5, -86)], 28, ax, closed_prof=True), M['alu_dark'])
    return pb.build('rear_derailleur', sharp=35, part='rear_derailleur', explode=[-.14, -.26, -.12])


def build_calipers(M, AX_F, AX_R):
    """Flat-mount calipers beside a 160 mm rotor. Clock angles are the Canyon photo's;
    on the Trek photo the front caliper sits behind the fork leg and the rear one is
    hidden on the drive side, so these angles are carried, not re-measured."""
    out = []
    for which, C, r_c, ang, y in (('front', AX_F, 72, math.radians(142), 44.0), ('rear', AX_R, 72, math.radians(14), 51.0)):
        pb = PB()
        loc = Vector((r_c, 0, 0))
        parts = [(box(loc + Vector((0, y - 9, 0)), (24, 14, 56), 3.4), M['alu_black']),
                 (box(loc + Vector((0, y + 10, 0)), (24, 16, 58), 3.4), M['alu_black']),
                 (box(loc + Vector((13, y, 0)), (10, 34, 46), 3), M['alu_black']),
                 (box(loc + Vector((-3, y + 20, 0)), (10, 6, 30), 3), M['alu_dark'])]
        for g, m in parts:
            g2 = xform(g, Matrix.Translation(W(C)) @ rotY(ang))
            # g built around origin at mm scale via box(): recentre
            pb.add(g2, m)
        out.append(pb.build('caliper_' + which, sharp=40, part='caliper_' + which,
                            explode=[.30 if which == 'front' else -.30, .26, .04]))
    return out


def build_axles(M, AX_F, AX_R):
    """100x12 front (half-span 58 includes the lever) and 142x12 rear."""
    out = []
    for which, C, half in (('front', AX_F, 58), ('rear', AX_R, 80)):
        pb = PB()
        pb.add(lathe([(0.1, -half - 4), (6, -half - 4), (6, half), (0.1, half)], 24, C, closed_prof=True), M['alu_black'])
        pb.add(lathe([(0.1, half), (13, half), (13.5, half + 5), (11, half + 9), (0.1, half + 9)], 32, C, closed_prof=True),
               M['alu_black'])
        lever = [W(C + Vector((0, half + 7, 0))), W(C + Vector((-28, half + 9, 3))), W(C + Vector((-52, half + 8, 6)))]
        pb.add(sweep(lever, [superellipse(6, 13, 3, 20), superellipse(5, 11, 3, 20), superellipse(5, 9, 3, 20)]), M['alu_black'])
        out.append(pb.build('thru_axle_' + which, origin=W(C), sharp=40, part='thru_axle_' + which,
                            explode=[.34 if which == 'front' else -.36, .36, 0]))
    return out
