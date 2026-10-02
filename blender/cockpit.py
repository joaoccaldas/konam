"""CP0054 cockpit, AeroShield, AeroFuel hydration, Splitter Plate Pro seatpost, Fizik Transiro Aeris saddle."""
import bpy, bmesh, math
from mathutils import Vector, Matrix
from lib import *
from frame import W
from components import PB, rotY


def build_riser(M):
    zs = [(782, 460), (800, 461), (830, 462), (860, 464), (890, 466), (912, 468)]
    path = [W(Vector((x, 0, z))) for z, x in zs]
    profs = [kamm(60 - 4 * (i / 5), 38 - 2 * (i / 5), trunc=.9, le=-1) for i in range(6)]
    pb = PB().add(sweep(path, profs), M['carbon'])
    # headset top cover
    cover = [W(Vector((452, 0, 780))), W(Vector((452, 0, 790)))]
    pb.add(sweep(cover, [kamm(96, 50, trunc=.93, le=-1, shift=-2)] * 2, lat=Vector((0, 1, 0))), M['black'])
    return pb.build('riser', sharp=45, part='riser', explode=[.04, 0, .24])


def build_basebar(M):
    half = [(455, 0), (470, 58), (518, 118), (582, 158), (640, 178), (690, 188)]
    ctrl = [Vector((x, -y, 792 - y * 0.012)) for x, y in reversed(half)] + [Vector((x, y, 792 - y * 0.012)) for x, y in half[1:]]
    pts = catmull([W(p) for p in ctrl], 6)
    n = len(pts)
    profs = []
    for i in range(n):
        t = abs(i / (n - 1) - .5) * 2
        profs.append(kamm(44 - 10 * t, 20 - 3 * t, trunc=.9, le=1))
    pb = PB().add(sweep(pts, profs, lat=Vector((0, 0, 1))), M['carbon'])
    for s in (-1, 1):
        g = [W(Vector((688, s * 188, 791))), W(Vector((712, s * 192, 791))), W(Vector((724, s * 194, 792)))]
        pb.add(sweep(g, [superellipse(24, 22, 2.4, 24)] * 3, lat=Vector((0, 0, 1))), M['rubber'])
    return pb.build('basebar', sharp=45, part='basebar', explode=[.22, 0, .18])


def build_levers(M):
    out = []
    for s, nm in ((-1, 'right'), (1, 'left')):
        pb = PB()
        pb.add(tube(W(Vector((714, s * 194, 792))), W(Vector((742, s * 195, 791))), 14.5, 13.5, 24), M['black'])
        blade = catmull([W(Vector(p)) for p in ((736, s * 195, 786), (752, s * 196, 772), (757, s * 197, 748),
                                                  (750, s * 197, 726), (736, s * 197, 714), (728, s * 197, 713))], 5)
        pb.add(sweep(blade, [superellipse(7, 13 - 5 * i / (len(blade) - 1), 2.6, 18) for i in range(len(blade))]),
               M['alu_black'])
        out.append(pb.build('brake_lever_' + nm, sharp=45, part='brake_lever_' + nm, explode=[.3, s * .1, .12]))
    return out


# ---------------------------------------------------------------- AeroShield
SH = [(450, 1034, 912, 100), (500, 1033, 896, 104), (560, 1029, 900, 104), (620, 1023, 918, 98), (680, 1016, 942, 88),
      (740, 1008, 966, 70), (792, 1000, 988, 48)]


def shell_section(zt, zb, w):
    zf = max(zt - 50, zb + 14)
    outer = [(-w, zt), (-w - 2.5, zt - 22), (-w + 8, zb + 30), (-w * .5, zb + 7), (0, zb), (w * .5, zb + 7),
             (w - 8, zb + 30), (w + 2.5, zt - 22), (w, zt)]
    inner = [(w - 4, zt), (w - 5, zt - 20), (w - 16, zf + 2), (w * .45, zf), (0, zf + 4), (-w * .45, zf),
             (-w + 16, zf + 2), (-w + 5, zt - 20), (-w + 4, zt)]
    return outer + inner


def build_aeroshield(M):
    rings = []
    for x, zt, zb, w in SH:
        rings.append([W(Vector((x, y, z))) for y, z in shell_section(zt, zb, w)])
    V, F, U = loft(rings, True, False, False)
    m = len(rings[0])
    F.append(list(range(m))[::-1])
    F.append([len(rings) - 1 + 0] * 0 + [(len(rings) - 1) * m + j for j in range(m)])
    pb = PB().add((V, F, None), M['carbon'])
    # keel / riser interface
    pb.add(box(Vector((470, 0, 912)), (70, 40, 20), 3), M['carbon'])
    s = pb.build('aeroshield', sharp=38, part='aeroshield', explode=[.1, 0, .4])
    pads = PB()
    for sgn in (-1, 1):
        pads.add(box(Vector((548, sgn * 52, 990)), (168, 78, 13), 3.4), M['pad'])
    p = pads.build('arm_pads', sharp=50, part='arm_pads', explode=[.1, 0, .52])
    return s, p


def build_extensions(M):
    pb = PB()
    for s in (-1, 1):
        ctrl = [Vector((690, s * 24, 994)), Vector((760, s * 23, 994)), Vector((810, s * 22, 998)),
                Vector((834, s * 22, 1014)), Vector((843, s * 22, 1044)), Vector((842, s * 22, 1074))]
        pts = catmull([W(p) for p in ctrl], 6)
        pb.add(polyline_tube(pts, 11, 20), M['carbon'])
        pb.add(tube(W(Vector((841.5, s * 22, 1074))), W(Vector((841, s * 22, 1080))), 11, 8, 20), M['carbon'])
    b = PB()
    for s in (-1, 1):
        b.add(box(Vector((848, s * 22, 1066)), (10, 16, 22), 2.4), M['black'])
    blips = b.build('axs_blips', sharp=50, part='axs_blips', explode=[.42, 0, .56])
    return pb.build('extensions', sharp=50, part='extensions', explode=[.34, 0, .44]), blips


# ---------------------------------------------------------------- hydration
def bottle_geo(base, tip_dir=-1, length=210, r=36):
    prof = [(0.1, -length - 3), (5, -length - 3), (5, -length + 7), (9, -length + 10), (12.5, -length + 14),
            (12.5, -length + 20), (21, -length + 22), (28, -length + 27), (r - 1, -length + 36), (r, -length + 50),
            (r, -6), (r - 2.5, -1), (r - 9, 0), (0.1, 0)]
    body = [p for p in prof if abs(p[1]) <= length - 20 or p[0] > 20]
    cap = [p for p in prof if abs(p[1]) >= length - 24]
    return lathe(body, 40, base, closed_prof=False, axis='X'), lathe(cap, 24, base, closed_prof=False, axis='X')


def build_aerofuel_front(M):
    pb = PB()
    for s in (-1, 1):
        poly = [(300, 1034), (489, 1034), (489, 891), (338, 891), (300, 930)]
        g = prism([(x, z) for x, z in poly], s * 40, s * 44)
        pb.add(g, M['carbon'])
    pb.add(box(Vector((408, 0, 894)), (162, 84, 6), 2.5), M['carbon'])
    tray = pb.build('aerofuel_front', sharp=40, part='aerofuel_front', explode=[-.12, 0, .36])
    body, cap = bottle_geo(Vector((500, 0, 975)), tip_dir=-1)
    b = PB().add(body, M['bottle']).add(cap, M['black']).build('bottle_front', sharp=60, part='bottle_front',
                                                               explode=[-.3, 0, .46])
    return tray, b


def build_seatpost(M):
    zs = [(600, -128), (700, -136), (756, -140), (800, -141), (850, -142), (900, -143), (925, -144)]
    path = [W(Vector((x, 0, z))) for z, x in zs]
    profs = [kamm(70, 27, trunc=.9, le=-1) for _ in zs]
    pb = PB().add(sweep(path, profs), M['carbon'])
    # Splitter Plate: rear hydration wing fused to the post
    wing = [(-417, 995), (-313, 952), (-150, 952), (-150, 900), (-176, 832), (-222, 838), (-300, 892), (-380, 962),
            (-422, 990)]
    pb.add(prism(wing, -8, 8), M['carbon'])
    # clamp head
    pb.add(box(Vector((-147, 0, 930)), (62, 40, 26), 3), M['alu_black'])
    for s in (-1, 1):
        pb.add(tube(W(Vector((-176, s * 22, 944))), W(Vector((-118, s * 22, 944))), 5.5, 5.5, 14), M['alu_black'])
    return pb.build('seatpost', sharp=38, part='seatpost', explode=[-.06, 0, .24])


def build_rear_hydration(M):
    pb = PB()
    bottles = PB()
    for s in (-1, 1):
        y = s * 40
        body, cap = bottle_geo(Vector((-241, y, 1052)), tip_dir=-1)
        bottles.add(body, M['bottle']).add(cap, M['black'])
        for dy in (-15, 15):
            rail = [W(Vector((-430, y + dy, 1022))), W(Vector((-330, y + dy, 1016))), W(Vector((-250, y + dy, 1020)))]
            pb.add(polyline_tube(rail, 2.6, 10), M['carbon'])
        pb.add(tube(W(Vector((-395, 0, 986))), W(Vector((-395, y, 1016))), 4, 3, 12), M['carbon'])
        pb.add(tube(W(Vector((-300, 0, 950))), W(Vector((-300, y, 1016))), 4, 3, 12), M['carbon'])
    cages = pb.build('bottle_cages_rear', sharp=50, part='bottle_cages_rear', explode=[-.26, 0, .32])
    b = bottles.build('bottles_rear', sharp=60, part='bottles_rear', explode=[-.34, 0, .46])
    return cages, b


def build_saddle(M):
    st = [(-296, 48, 1010, 5), (-285, 88, 1003, 8), (-265, 122, 995, 12), (-235, 136, 989, 16), (-195, 128, 986, 20),
          (-155, 104, 985, 23), (-120, 84, 986, 26), (-90, 74, 989, 30), (-66, 70, 992, 32), (-52, 58, 991, 28),
          (-46, 36, 988, 20), (-43, 12, 985, 10)]
    path = [W(Vector((x, 0, zt - t / 2))) for x, w, zt, t in st]
    profs = []
    for x, w, zt, t in st:
        p = superellipse(w, t, 2.2, 48)
        # dome the top, flatten the base
        p = [(a, b * (1.12 if b > 0 else .88)) for a, b in p]
        profs.append(p)
    pb = PB().add(sweep(path, profs), M['pad'])
    for s in (-1, 1):
        ctrl = [Vector((-60, s * 20, 972)), Vector((-100, s * 22, 950)), Vector((-150, s * 24, 945)),
                Vector((-205, s * 30, 948)), Vector((-250, s * 40, 972)), Vector((-268, s * 44, 986))]
        pts = catmull([W(p) for p in ctrl], 5)
        pb.add(sweep(pts, [superellipse(7, 9, 2.4, 14)] * len(pts)), M['carbon'])
    return pb.build('saddle', sharp=55, part='saddle', explode=[-.04, 0, .42])


def build_tt_lid(M):
    return PB().add(box(Vector((340, 0, 786)), (150, 30, 5), 4), M['paint']).build('toptube_storage_lid', sharp=50,
                                                                                   part='toptube_storage_lid',
                                                                                   explode=[0, 0, .14])
