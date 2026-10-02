"""Speedmax CFR frame + fork. Shapes traced from Canyon's official side photo (1.304 mm/px),
anchored to the published size-M geometry (stack 481, reach 440, HTA 73, STA 81, CS 420, WB 1013, BB drop 75)."""
import bpy, bmesh, math
from mathutils import Vector
from lib import *

# ---------------------------------------------------------------- geometry (size M, mm)
R_WHEEL = 339.5                     # 622 BSD / 2 + 28 mm tyre height
BB = Vector((0, 0, R_WHEEL - 75))   # z = 264.5
CS = 420
AX_R = Vector((-math.sqrt(CS ** 2 - 75 ** 2), 0, R_WHEEL))  # rear axle
AX_F = Vector((AX_R.x + 1013, 0, R_WHEEL))                  # front axle
HT_TOP = Vector((440, 0, BB.z + 481))                        # stack / reach
HTA = math.radians(73)
STEER_UP = Vector((-math.cos(HTA), 0, math.sin(HTA)))


def PX(px, py):
    """Photo pixel -> bike mm (XZ)."""
    return Vector(((px - 725) * 1.304, 0, (675 - py) * 1.304 + BB.z))


def W(v):
    return v * MM


def steer_at_z(z):
    t = (z - HT_TOP.z) / STEER_UP.z
    return HT_TOP + STEER_UP * t


# ---------------------------------------------------------------- frame members
def member_seatmast():
    # (py, rear_px, front_px, lateral mm)
    st = [(292, 596, 654, 40), (330, 599, 658, 38), (393, 603, 667, 36), (430, 617, 674, 34),
          (480, 637, 685, 34), (520, 651, 693, 38), (566, 670, 706, 48)]
    path, profs = [], []
    for py, r, f, lat in st:
        c = PX((r + f) / 2, py)
        chord = (f - r) * 1.304
        path.append(W(c))
        profs.append(kamm(chord, lat, trunc=.9, le=1))
    return sweep(path, profs)


def member_bbblock():
    st = [(544, 690, 800, 64), (580, 679, 806, 72), (625, 681, 790, 82), (668, 688, 772, 90), (700, 695, 760, 90),
          (716, 705, 748, 86)]
    path, profs = [], []
    for py, r, f, lat in st:
        path.append(W(PX((r + f) / 2, py)))
        profs.append(kamm((f - r) * 1.304, lat, trunc=.93, le=1))
    return sweep(path, profs)


def member_downtube():
    F = Vector((1183, 620))
    Rarc = (R_WHEEL + 9) / 1.304
    d = Vector((0.598, -0.802))
    n = Vector((0.802, 0.598))
    path, profs = [], []
    for py in (600, 575, 550, 520, 490, 460, 430, 400, 370, 340, 312, 290):
        ux = 783 + (547 - py) * 0.7455
        up = Vector((ux, py))
        # solve |up + n w - F| = Rarc
        q = up - F
        bq = 2 * q.dot(n)
        cq = q.dot(q) - Rarc * Rarc
        disc = bq * bq - 4 * cq
        w = 118 if disc < 0 else (-bq - math.sqrt(disc)) / 2
        cap = 76 + max(0, 360 - py) * 0.45 + max(0, py - 530) * 0.55
        w = max(60, min(w, cap))
        c = up + n * (w / 2)
        chord = w * 1.304
        lat = 42 + max(0, (400 - py)) * 0.08
        path.append(W(PX(c.x, c.y)))
        profs.append(kamm(chord, lat, trunc=.86, le=-1))
    return sweep(path, profs)


def member_headtube():
    z0, z1 = 628, 786
    pts = [steer_at_z(z) for z in (z0, 660, 700, 740, 770, z1)]
    profs = []
    for i, z in enumerate((z0, 660, 700, 740, 770, z1)):
        chord = 116 if z < 770 else 108
        lat = 54 if z < 700 else 50
        profs.append(kamm(chord, lat, trunc=.93, le=-1, shift=-2))
    return sweep([W(p) for p in pts], profs)


def member_toptube():
    st = [(470, 776, 52, 46), (420, 773, 48, 34), (300, 769, 46, 30), (150, 765, 44, 29), (0, 761, 42, 28),
          (-120, 758, 42, 28), (-168, 756, 44, 28)]
    path = [W(Vector((x, 0, z))) for x, z, _, _ in st]
    profs = [superellipse(w, h, 3.2, 44) for _, _, w, h in st]  # a lateral, b vertical-ish
    return sweep(path, profs)


def member_head_gusset():
    path = [W(Vector((x, 0, 738))) for x in (320, 380, 440, 480)]
    profs = [superellipse(40, 34, 3, 44), superellipse(44, 52, 3, 44), superellipse(48, 60, 3, 44), superellipse(50, 60, 3, 44)]
    return sweep(path, profs)


def member_chainstay(side):
    s = -1 if side == 'R' else 1   # R = drive side (-Y)
    # (x mm, z mm, lateral centre |y|, chord (vertical), thickness)
    st = [(-5, 290, 30, 52, 24), (-60, 300, 30, 50, 22), (-120, 306, 33, 48, 20), (-200, 318, 45, 46, 18),
          (-300, 330, 60, 44, 16), (-380, 337, 72, 42, 14), (-418, 339.5, 76, 40, 13)]
    path = [W(Vector((x, s * y, z))) for x, z, y, _, _ in st]
    profs = [superellipse(t, c, 2.8, 36) for _, _, _, c, t in st]
    return sweep(path, profs)


def member_seatstay(side):
    s = -1 if side == 'R' else 1
    top = PX(626, 390)
    bot = AX_R + Vector((-2, 0, 6))
    st = []
    for k in range(6):
        t = k / 5
        p = top.lerp(bot, t)
        y = 17 + (76 - 17) * t ** 1.4
        chord = 46 - 8 * t
        thick = 17 - 4 * t
        st.append((p, y, chord, thick))
    path = [W(Vector((p.x, s * y, p.z))) for p, y, _, _ in st]
    profs = [kamm(c, th, trunc=.9, le=1) for _, _, c, th in st]
    return sweep(path, profs)


def member_shelf():
    a, b = PX(560, 398), PX(648, 398)
    path = [W(a), W(b)]
    prof = superellipse(40, 9, 3, 28)
    return sweep(path, [prof, prof])


def member_dropouts():
    geos = []
    for s in (-1, 1):
        geos.append(lathe([(0.1, s * 70), (15, s * 70), (15, s * 82), (0.1, s * 82)], 28, AX_R))
    return geos


def member_bbshell():
    return lathe([(0.1, -43.25), (24, -43.25), (24, 43.25), (0.1, 43.25)], 40, BB)


def build_frame(M):
    geos = [member_seatmast(), member_bbblock(), member_downtube(), member_headtube(), member_toptube(),
            member_chainstay('R'), member_chainstay('L'), member_seatstay('R'), member_seatstay('L'),
            member_shelf(), member_bbshell(), member_head_gusset()] + member_dropouts()
    V, F, _ = join_geo([(g[0], g[1]) for g in geos])
    raw = mesh('frame_raw', V, F, M['paint'], smooth=True)
    return raw


def voxelize(obj, voxel=.0014, smooth_iter=6, smooth_fac=.5, target=None, name=None):
    r = obj.modifiers.new('remesh', 'REMESH')
    r.mode = 'VOXEL'
    r.voxel_size = voxel
    r.adaptivity = 0
    sm = obj.modifiers.new('smooth', 'SMOOTH')
    sm.iterations = smooth_iter
    sm.factor = smooth_fac
    me = evaluated_mesh(obj)
    obj.modifiers.clear()
    if target:
        tris = sum(len(p.vertices) - 2 for p in me.polygons)
        if tris > target:
            tmp = bpy.data.objects.new('tmp_dec', me)
            bpy.context.scene.collection.objects.link(tmp)
            d = tmp.modifiers.new('dec', 'DECIMATE')
            d.ratio = target / tris
            me2 = evaluated_mesh(tmp)
            bpy.data.objects.remove(tmp)
            me = me2
    for p in me.polygons:
        p.use_smooth = True
    return me


# ---------------------------------------------------------------- fork
def build_fork_raw(M):
    geos = []
    crown_z = 610
    ax_c = steer_at_z(crown_z)
    # crown: lateral sweep, chord along X
    cp = []
    for y in (-72, -60, -30, 0, 30, 60, 72):
        cp.append(W(ax_c + Vector((4, y, 6 if abs(y) < 50 else 0))))
    prof = [kamm(92 if abs(y) < 65 else 62, 34 if abs(y) < 65 else 24, trunc=.9, le=1, shift=-6) for y in (-72, -60, -30, 0, 30, 60, 72)]
    geos.append(sweep(cp, prof, lat=Vector((0, 0, 1))))
    # upper crown fairing continuing the head tube line (sits just below the frame's head tube)
    zs = (crown_z - 8, 626)
    geos.append(sweep([W(steer_at_z(z)) for z in zs], [kamm(114, 52, trunc=.93, le=-1, shift=-2)] * 2))
    for s in (-1, 1):
        top = ax_c + Vector((10, s * 60, -4))
        bot = AX_F + Vector((0, s * 57, -14))
        st = []
        for k in range(8):
            t = k / 7
            p = top.lerp(bot, t)
            p.x += 10 * math.sin(math.pi * t) * 0.6
            st.append(p)
        profs = [kamm(52 - 12 * (k / 7), 22 - 5 * (k / 7), trunc=.88, le=1, shift=-4 * (k / 7)) for k in range(8)]
        geos.append(sweep([W(p) for p in st], profs))
        geos.append(lathe([(0.1, s * 50.5), (13, s * 50.5), (13, s * 64), (0.1, s * 64)], 24, AX_F))
    V, F, _ = join_geo([(g[0], g[1]) for g in geos])
    return mesh('fork_raw', V, F, M['paint'])


def fork_steerer():
    a, b = steer_at_z(600), steer_at_z(800)
    return tube(W(a), W(b), 14.3, 14.3, 24)
