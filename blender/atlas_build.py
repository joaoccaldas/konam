"""Atlas of the clock: parametric time-trial bicycles for the Against the Clock wing.

Every bike is built from its own skeleton (museum/atlas/bikes.json): frame architecture,
tube sections, wheels, bars. Nothing is a recoloured Canyon. Proportions are scaled from the
reference photograph by the wheel (700c tyre ≈ 668 mm) and published race facts; tube depths
are a silhouette study, and the wall text says so.

  python3 blender/atlas_build.py [key ...]          (bpy as a module: pip install bpy)
  blender -b --factory-startup --python-exit-code 1 -P blender/atlas_build.py -- [key ...]

Materials are named so the page can dye them: paint_frame, paint_accent, disc_face.
Output: assets/atlas/<key>/bike.glb
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
SPEC = json.load(open(os.path.join(ROOT, 'museum/atlas/bikes.json')))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ONLY = [a for a in argv if not a.startswith('-')]
TAU = math.tau


# ----------------------------------------------------------------------------- scene + materials
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


MATS = {}
def mat(name, rgb, metal=0.0, rough=0.5, coat=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    for k in ('Coat Weight', 'Clearcoat'):
        if k in b.inputs:
            b.inputs[k].default_value = coat
            break
    MATS[name] = m
    return m


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)


def materials(skin):
    MATS.clear()
    return {
        'frame': mat('paint_frame', srgb(skin['frame']), metal=.15, rough=.28, coat=1),
        'accent': mat('paint_accent', srgb(skin.get('accent', skin['frame'])), metal=.1, rough=.3, coat=1),
        'carbon': mat('carbon', (.018, .018, .02), rough=.32, coat=.8),
        'steel': mat('steel', (.62, .63, .65), metal=1, rough=.25),
        'alu': mat('alu', (.55, .56, .58), metal=1, rough=.35),
        'rubber': mat('rubber', (.025, .025, .025), rough=.7),
        'rim': mat('rim', srgb(skin.get('rim', '#15161a')), metal=.3, rough=.35),
        'disc': mat('disc_face', srgb(skin.get('disc', '#16171b')), metal=.2, rough=.3, coat=.6),
        'saddle': mat('saddle', srgb(skin.get('saddle', '#141414')), rough=.55),
        'tape': mat('bar_tape', srgb(skin.get('tape', '#161616')), rough=.8),
        'chrome': mat('chrome', (.8, .8, .82), metal=1, rough=.12),
    }


def obj(name, bm, m, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


# ----------------------------------------------------------------------------- sections
def section(kind, chord, width, n):
    """Points (u along the chord axis, v lateral) of one tube section. u > 0 faces the wind."""
    pts = []
    for k in range(n):
        th = TAU * k / n
        c, s = math.cos(th), math.sin(th)
        if kind == 'round':
            pts.append((c * chord / 2, s * width / 2))
        elif kind == 'kamm':                                        # rounded nose, truncated tail
            u = c * (0.42 if c >= 0 else 0.58) * chord
            v = s * width / 2 * (1 if c >= 0 else 1 - 0.38 * (-c) ** 1.6)
            pts.append((u, v))
        else:                                                         # 'aero': teardrop
            u = c * (0.35 if c >= 0 else 0.65) * chord
            v = s * width / 2 * (1 if c >= 0 else 1 - 0.62 * (-c) ** 1.25)
            pts.append((u, v))
    return pts


def frames_along(pts):
    out = []
    for i, p in enumerate(pts):
        a = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
        t = a.normalized()
        lead = Vector((1, 0, 0))
        ax = lead - t * lead.dot(t)
        if ax.length < .35:                                           # a near-horizontal tube: depth is vertical
            up = Vector((0, 0, 1))
            ax = up - t * up.dot(t)
        ax.normalize()
        lat = t.cross(ax).normalized()
        out.append((t, ax, lat))
    return out


def sweep(name, pts, chord, width, m, kind='aero', n=14, caps=True):
    """A tube through pts. chord/width: number or list per point (metres)."""
    pts = [Vector(p) for p in pts]
    cl = chord if isinstance(chord, (list, tuple)) else [chord] * len(pts)
    wl = width if isinstance(width, (list, tuple)) else [width] * len(pts)
    bm = bmesh.new()
    rings = []
    for p, (t, ax, lat), c, w in zip(pts, frames_along(pts), cl, wl):
        rings.append([bm.verts.new(p + ax * u + lat * v) for u, v in section(kind, c, w, n)])
    for a, b in zip(rings, rings[1:]):
        for k in range(n):
            bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    return obj(name, bm, m)


def curve(p0, p1, p2, steps=6):
    """Quadratic Bezier points from p0 to p2 bending toward p1."""
    p0, p1, p2 = Vector(p0), Vector(p1), Vector(p2)
    return [(1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2 for t in (i / steps for i in range(steps + 1))]


def lerp(a, b, t):
    return Vector(a).lerp(Vector(b), t)


# ----------------------------------------------------------------------------- revolved parts (wheels)
def revolve(name, centre, profile, m, seg=48, y0=0.0, smooth=True):
    """profile: [(radius, lateral)] — revolved about the axle (Y) through centre."""
    bm = bmesh.new()
    rings = []
    for r, y in profile:
        ring = []
        for k in range(seg):
            a = TAU * k / seg
            ring.append(bm.verts.new((centre.x + math.cos(a) * r, y0 + y, centre.z + math.sin(a) * r)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(seg):
            f = (a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k])
            try:
                bm.faces.new(f)
            except ValueError:
                pass
    return obj(name, bm, m, smooth=smooth)


def wheel(tag, c, R, kind, M, depth=0.05, spokes=20):
    tyre_r = 0.0115
    ring = [(R - tyre_r + math.cos(a) * tyre_r, math.sin(a) * tyre_r * .95) for a in (TAU * i / 12 for i in range(13))]
    revolve(f'{tag}_tyre', c, ring, M['rubber'], seg=64)
    rim_in = R - 2 * tyre_r - depth
    rim = [(R - 2 * tyre_r + .002, .0105), (R - 2 * tyre_r - depth * .35, .0135), (rim_in + depth * .15, .011), (rim_in, .004),
           (rim_in, -.004), (rim_in + depth * .15, -.011), (R - 2 * tyre_r - depth * .35, -.0135), (R - 2 * tyre_r + .002, -.0105), (R - 2 * tyre_r + .002, .0105)]
    revolve(f'{tag}_rim', c, rim, M['rim'])
    revolve(f'{tag}_hub', c, [(0.004, .05), (.018, .05), (.02, .035), (.013, .03), (.013, -.03), (.02, -.035), (.018, -.05), (.004, -.05)], M['alu'], seg=24)
    if kind == 'disc':
        prof = [(rim_in + .001, .0105), ((rim_in + .02) * .5, .026), (.03, .034), (.03, -.034), ((rim_in + .02) * .5, -.026), (rim_in + .001, -.0105)]
        revolve(f'{tag}_disc', c, prof, M['disc'], seg=64)
    elif kind == 'trispoke':
        for k in range(3):
            a = TAU * k / 3 + .3
            d = Vector((math.cos(a), 0, math.sin(a)))
            pts = [c + d * r for r in (0.025, (rim_in + .025) / 2, rim_in + .004)]
            sweep(f'{tag}_blade{k}', pts, [.075, .048, .06], [.03, .018, .02], M['disc'], kind='aero', n=12)
    else:
        bm = bmesh.new()
        for k in range(spokes):
            a = TAU * k / spokes
            side = .03 if k % 2 else -.03
            p0 = Vector((c.x + math.cos(a + .08) * .02, side, c.z + math.sin(a + .08) * .02))
            p1 = Vector((c.x + math.cos(a) * (rim_in + .002), 0, c.z + math.sin(a) * (rim_in + .002)))
            d = (p1 - p0).normalized()
            q = d.cross(Vector((0, 1, 0))).normalized() * .0012
            r2 = Vector((0, 1, 0)) * .0012
            vs = [bm.verts.new(p + o) for p in (p0, p1) for o in (q, r2, -q, -r2)]
            for i in range(4):
                bm.faces.new((vs[i], vs[(i + 1) % 4], vs[4 + (i + 1) % 4], vs[4 + i]))
        obj(f'{tag}_spokes', bm, M['steel'], smooth=False)


# ----------------------------------------------------------------------------- frame helpers
def plate(name, outline, thick, m, round_r=0.012, layers=5):
    """A thick lofted panel in the bike plane (x, z) from a closed outline: the monocoque 'wing'."""
    P = [Vector((x, 0, z)) for x, z in outline]
    n = len(P)
    # inward normals (the outline is counter-clockwise in x-z seen from +y)
    area = sum(P[i].x * P[(i + 1) % n].z - P[(i + 1) % n].x * P[i].z for i in range(n))
    sgn = 1 if area > 0 else -1
    nor = []
    for i in range(n):
        e0 = (P[i] - P[i - 1]).normalized(); e1 = (P[(i + 1) % n] - P[i]).normalized()
        n0 = Vector((-e0.z, 0, e0.x)) * sgn; n1 = Vector((-e1.z, 0, e1.x)) * sgn
        b = (n0 + n1); b = b.normalized() if b.length > 1e-6 else n0
        nor.append(b / max(.35, b.dot(n0)))
    bm = bmesh.new()
    loops = []
    for k in range(layers + 1):
        phi = -math.pi / 2 + math.pi * k / layers
        y = thick / 2 * math.sin(phi)
        ins = round_r * (1 - math.cos(phi))
        loops.append([bm.verts.new(P[i] + nor[i] * ins + Vector((0, y, 0))) for i in range(n)])
    for a, b in zip(loops, loops[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bm.faces.new(list(reversed(loops[0])))
    bm.faces.new(loops[-1])
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    return obj(name, bm, m)


def box(name, c, size, m, rot_y=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
        if rot_y:
            x, z = v.co.x, v.co.z
            v.co.x, v.co.z = x * math.cos(rot_y) - z * math.sin(rot_y), x * math.sin(rot_y) + z * math.cos(rot_y)
        v.co += Vector(c)
    return obj(name, bm, m, smooth=False)


# ----------------------------------------------------------------------------- the bike
def build(b, skin):
    M = materials(skin)
    g = b['geometry']
    Rf, Rr = g['wheel_front'] / 2, g['wheel_rear'] / 2
    drop = g.get('bb_drop', .07)
    cs = g['chainstay']
    rear = Vector((-math.sqrt(cs * cs - drop * drop), 0, drop))
    stack, reach = g['stack'], g['reach']
    hta, sta = math.radians(g['head_angle']), math.radians(g['seat_angle'])
    ht_top = Vector((reach, 0, stack))
    ht_dir = Vector((math.cos(hta), 0, -math.sin(hta)))             # down and forward along the steerer
    ht_bot = ht_top + ht_dir * g['head_tube']
    fork_len = g.get('fork_length', .37)
    rake = g.get('rake', .045)
    # front axle: along the steering axis from the head tube bottom, then the rake, clamped to the wheel height
    axle_z = drop - (Rr - Rf)                                        # a smaller front wheel sits lower
    t = (ht_bot.z - axle_z) / math.sin(hta)
    front = ht_bot + ht_dir * t + Vector((math.sin(hta), 0, math.cos(hta))) * rake
    front.z = axle_z
    st_dir = Vector((-math.cos(sta), 0, math.sin(sta)))
    st_top = st_dir * g['seat_tube']
    saddle = st_dir * g['saddle_height']
    arch = b['arch']
    F = M['frame']; A = M['accent']
    T = b.get('tubes', {})
    kind = T.get('section', 'aero')
    tube = lambda k, d: T.get(k, d)

    # wheels (rear first so the frame reads on top)
    wheel('wheel_rear', rear, Rr, b['wheels']['rear'], M, depth=b['wheels'].get('rear_depth', .06), spokes=b['wheels'].get('spokes', 24))
    wheel('wheel_front', front, Rf, b['wheels']['front'], M, depth=b['wheels'].get('front_depth', .06), spokes=b['wheels'].get('spokes', 24))

    lat = .062
    if arch in ('diamond', 'superbike', 'funny', 'pursuit'):
        st_pts = [Vector((0, 0, 0)), st_top]
        if arch == 'pursuit' or T.get('hug'):                       # seat tube curved round the rear wheel
            st_pts = curve((0, 0, 0), st_dir * g['seat_tube'] * .45 + Vector((.03, 0, 0)), st_top, 6)
        sweep('seat_tube', st_pts, tube('seat_chord', .06), tube('seat_width', .032), F, kind=kind)
        tt_start = st_top + (Vector((0, 0, 0)) - st_top) * tube('tt_drop', 0.0)
        sweep('top_tube', [tt_start, lerp(tt_start, ht_top, .5) + Vector((0, 0, tube('tt_arch', 0.0))), ht_top], tube('top_chord', .05), tube('top_width', .03), F, kind=kind)
        sweep('down_tube', [Vector((0, 0, .02)), lerp((0, 0, .02), ht_bot, .5), ht_bot], [tube('down_chord', .07) * 1.1, tube('down_chord', .07), tube('down_chord', .07) * .95], tube('down_width', .038), F, kind=kind)
        stay_top = st_top + (Vector((0, 0, 0)) - st_top) * tube('stay_drop', .08)
        for s in (-1, 1):
            o = Vector((0, s * lat, 0))
            sweep(f'chainstay_{"l" if s < 0 else "r"}', [Vector((0, s * .03, .0)), lerp((0, 0, 0), rear, .5) + o * .9, rear + o], tube('cs_chord', .028), .016, F, kind='round' if kind == 'round' else 'aero')
            sweep(f'seatstay_{"l" if s < 0 else "r"}', [stay_top + Vector((0, s * .015, 0)), lerp(stay_top, rear, .5) + o * .8, rear + o + Vector((0, 0, .01))], tube('ss_chord', .026), .014, F, kind='round' if kind == 'round' else 'aero')
    elif arch == 'monocoque':
        # one wing: head tube, down to the bottom bracket, up the seat line, back to the head;
        # a single stay each side of the wheel only on the left, a monoblade fork.
        # outline, counter-clockwise from the head: concave underside to the bottom bracket, a hollow behind it,
        # a slim seat mast rising out of the wing, then the long top edge back to the head tube.
        mast_base = st_dir * g['seat_tube'] * .52
        mast_w = .075
        q = lambda a, c, b, n=6: [(v.x, v.z) for v in curve(a, c, b, n)]
        outline = (q(ht_top + Vector((.02, 0, .01)), ht_top + Vector((.05, 0, -.06)), ht_bot + Vector((.01, 0, 0)), 4)
                   + q(ht_bot, lerp(ht_bot, (0, 0, 0), .5) + Vector((-.02, 0, -.09)), Vector((.05, 0, -.03)), 7)[1:]
                   + [(-.03, -.035)]
                   + q(Vector((-.05, 0, .02)), lerp((-.05, 0, .02), mast_base + Vector((-mast_w / 2 - .02, 0, 0)), .5) + Vector((.07, 0, .0)), mast_base + Vector((-mast_w / 2, 0, 0)), 6)[1:]
                   + [(st_top.x - mast_w / 2, st_top.z), (st_top.x + mast_w / 2, st_top.z)]
                   + q(mast_base + Vector((mast_w / 2 + .03, 0, .04)), lerp(mast_base, ht_top, .5) + Vector((0, 0, -.05)), ht_top + Vector((-.03, 0, .01)), 7))
        plate('mono_wing', outline, tube('wing_thick', .045), F, round_r=.016)
        sweep('monostay', [st_top * .75 + Vector((0, -.02, 0)), lerp(st_top * .75, rear, .5) + Vector((0, -.05, .0)), rear + Vector((0, -.06, 0))], [.085, .07, .05], .026, A, kind='aero')
        sweep('monochainstay', [Vector((.0, -.03, -.01)), rear + Vector((0, -.06, -.005))], [.06, .04], .022, A, kind='aero')
    elif arch == 'beam':
        # no seat tube: a beam from the head tube over the rear wheel carries the saddle
        beam_end = saddle + Vector((-.02, 0, .0))
        sweep('beam', [ht_top + Vector((0, 0, .02)), lerp(ht_top, beam_end, .5) + Vector((0, 0, .03)), beam_end], [.09, .075, .05], [.036, .03, .024], F, kind='aero')
        sweep('down_tube', [ht_bot, lerp(ht_bot, (0, 0, .02), .5) + Vector((0, 0, -.02)), Vector((0, 0, .02))], [.1, .12, .1], .04, F, kind='aero')
        strut_top = lerp(ht_top, beam_end, .62)
        sweep('strut', [Vector((0, 0, .03)), strut_top], [.08, .06], .03, A, kind='aero')
        for s in (-1, 1):
            o = Vector((0, s * lat, 0))
            sweep(f'chainstay_{"l" if s < 0 else "r"}', [Vector((0, s * .03, 0)), lerp((0, 0, 0), rear, .5) + o * .9, rear + o], .03, .018, F, kind='aero')
            sweep(f'seatstay_{"l" if s < 0 else "r"}', [lerp((0, 0, .03), strut_top, .55) + Vector((0, s * .02, 0)), rear + o + Vector((0, 0, .01))], .026, .014, F, kind='aero')

    # head tube (+ integrated nose on superbikes)
    ht_chord = tube('head_chord', .065 if kind != 'round' else .036)
    sweep('head_tube', [ht_bot + ht_dir * -.01, ht_top + ht_dir * -.02], ht_chord, tube('head_width', .04 if kind != 'round' else .036), F, kind=kind)
    if arch == 'superbike':
        nose = [ht_bot + Vector((.03, 0, .0)), ht_bot + Vector((.075, 0, .03)), ht_top + Vector((.06, 0, -.03))]
        sweep('nose', nose, [.05, .07, .05], .034, A, kind='aero')

    # fork
    crown = ht_bot + ht_dir * .01
    if arch == 'monocoque':
        sweep('fork_mono', [crown + Vector((0, .02, 0)), lerp(crown, front, .5) + Vector((0, .05, 0)), front + Vector((0, .06, 0))], [.075, .06, .035], .024, A, kind='aero')
    else:
        fk = 'round' if kind == 'round' else 'aero'
        for s in (-1, 1):
            sweep(f'fork_{"l" if s < 0 else "r"}', [crown + Vector((0, s * .03, 0)), lerp(crown, front, .55) + Vector((0, s * .05, 0)), front + Vector((0, s * .052, 0))], [tube('fork_chord', .05) * 1.1, tube('fork_chord', .05), tube('fork_chord', .05) * .6], .02, F if T.get('fork_paint', True) else M['carbon'], kind=fk)
        sweep('fork_crown', [crown + Vector((0, -.05, 0)), crown + Vector((0, .05, 0))], .05, .03, F, kind='aero')

    # seatpost + saddle
    sp_kind = 'round' if kind == 'round' else 'aero'
    if arch != 'beam': sweep('seatpost', [st_top + st_dir * -.02, saddle], .03 if sp_kind == 'round' else .055, .027 if sp_kind == 'round' else .024, M['carbon'] if sp_kind != 'round' else M['alu'], kind=sp_kind)
    sx = saddle + Vector((b.get('saddle_setback', 0.0), 0, .022))
    sweep('saddle', [sx + Vector((-.13, 0, .012)), sx + Vector((-.06, 0, .016)), sx + Vector((.04, 0, .006)), sx + Vector((.13, 0, -.006))], [.045, .04, .03, .022], [.14, .12, .06, .035], M['saddle'], kind='round', n=12)

    # cockpit
    stem_end = ht_top + Vector((g.get('stem', .1), 0, g.get('stem_rise', -.01)))
    sweep('stem', [ht_top + Vector((-.01, 0, .02)), stem_end], .045, .036, F if arch == 'superbike' else M['alu'], kind='aero' if arch == 'superbike' else 'round')
    bars = b.get('bars', 'aero')
    bw = g.get('bar_width', .40) / 2
    if bars == 'aero':
        base = [stem_end + Vector((0, y, 0)) for y in (-bw, -bw * .5, 0, bw * .5, bw)]
        base[0] += Vector((.05, 0, -.02)); base[-1] += Vector((.05, 0, -.02))
        sweep('base_bar', base, .05, .018, M['carbon'], kind='aero')
        for s in (-1, 1):
            y = s * g.get('ext_width', .09)
            ext = [stem_end + Vector((-.06, y, .07)), stem_end + Vector((.14, y, .075)), stem_end + Vector((.3, y, .095)), stem_end + Vector((.34, y, .14))]
            sweep(f'extension_{"l" if s < 0 else "r"}', ext, .022, .022, M['carbon'], kind='round', n=10)
            box(f'armpad_{"l" if s < 0 else "r"}', stem_end + Vector((-.02, y, .085)), (.12, .075, .018), M['saddle'])
        box('pad_riser', stem_end + Vector((-.02, 0, .05)), (.05, .2, .04), M['carbon'])
    elif bars in ('drop', 'drop_clip'):
        if bars == 'drop_clip':                                       # clip-on extensions over the drops (short: the draft-legal rule / 1989 style)
            reach = g.get('clip_reach', .3)
            for s in (-1, 1):
                y = s * g.get('ext_width', .08)
                sweep(f'clip_{"l" if s < 0 else "r"}', [stem_end + Vector((-.04, y, .04)), stem_end + Vector((reach * .6, y, .05)), stem_end + Vector((reach, y, .06))], .022, .022, M['alu'], kind='round', n=10)
                box(f'clip_pad_{"l" if s < 0 else "r"}', stem_end + Vector((-.02, y, .065)), (.1, .07, .016), M['saddle'])
        for s in (-1, 1):
            y = s * bw
            pts = [stem_end + Vector((0, s * .02, 0)), stem_end + Vector((0, y * .8, 0)), stem_end + Vector((.07, y, -.01)), stem_end + Vector((.1, y, -.08)), stem_end + Vector((.05, y, -.14)), stem_end + Vector((-.06, y, -.14))]
            sweep(f'drop_{"l" if s < 0 else "r"}', pts, .026, .026, M['tape'], kind='round', n=10)
    elif bars in ('bullhorn', 'narrow'):
        w = bw * (.45 if bars == 'narrow' else 1)
        for s in (-1, 1):
            y = s * w
            pts = [stem_end + Vector((0, s * .02, 0)), stem_end + Vector((0, y, 0)), stem_end + Vector((.11, y, .03)), stem_end + Vector((.16, y, .08))]
            sweep(f'horn_{"l" if s < 0 else "r"}', pts, .026, .026, M['tape'], kind='round', n=10)

    # drivetrain: chainring, cranks, a little cog, the chain line
    ring_r = b.get('chainring_r', .105)
    ring_prof = [(ring_r, .004), (ring_r, -.001), (ring_r - .012, -.001), (ring_r - .012, .004)] if not b.get('disc_ring') else [(ring_r, .004), (ring_r, -.001), (.02, -.001), (.02, .004)]
    revolve('chainring', Vector((0, 0, 0)), ring_prof + [ring_prof[0]], M['steel'] if not b.get('disc_ring') else M['accent'], seg=48, y0=-.05, smooth=False)
    crank = g.get('crank', .1725)
    for s, a in ((-1, math.radians(-60)), (1, math.radians(120))):
        p1 = Vector((math.cos(a) * crank, s * .085, math.sin(a) * crank))
        sweep(f'crank_{"l" if s < 0 else "r"}', [Vector((0, s * .06, 0)), p1], [.035, .022], .014, M['carbon'] if kind != 'round' else M['alu'], kind='aero')
        box(f'pedal_{"l" if s < 0 else "r"}', p1 + Vector((0, s * .045, 0)), (.09, .075, .016), M['carbon'])
    revolve('cog', rear, [(.03, .004), (.03, -.001), (.012, -.001), (.012, .004)] + [(.03, .004)], M['steel'], seg=24, y0=-.05)
    chain = [Vector((0, -.05, ring_r)), lerp((0, -.05, ring_r), rear + Vector((0, -.05, .03)), .5), rear + Vector((0, -.05, .03))]
    sweep('chain_top', chain, .008, .006, M['steel'], kind='round', n=6)
    chain2 = [Vector((0, -.05, -ring_r)), lerp((0, -.05, -ring_r), rear + Vector((0, -.05, -.03)), .5), rear + Vector((0, -.05, -.03))]
    sweep('chain_bottom', chain2, .008, .006, M['steel'], kind='round', n=6)

    # extras the architecture calls for
    if b.get('bento'):
        box('bento', lerp(ht_top, st_top, .15) + Vector((0, 0, .045)), (.14, .05, .05), M['carbon'])
    if b.get('bottle_between_arms'):
        sweep('aero_bottle', [stem_end + Vector((.02, 0, .12)), stem_end + Vector((.24, 0, .12))], .07, .07, M['carbon'], kind='round', n=12)
    if b.get('rear_bottles'):
        for s in (-1, 1):
            sweep(f'rear_bottle_{s}', [saddle + Vector((-.12, s * .05, -.03)), saddle + Vector((-.12, s * .05, -.24))], .07, .07, M['accent'], kind='round', n=12)
        sweep('rear_cage_mount', [saddle + Vector((.0, 0, .0)), saddle + Vector((-.1, 0, -.06)), saddle + Vector((-.12, 0, -.13))], .02, .06, M['carbon'], kind='round', n=8)
    return front, rear


def export(key):
    out = os.path.join(ROOT, 'assets/atlas', key)
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, 'bike.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, use_selection=False)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
    return path, tris


def main():
    report = {}
    for b in SPEC['bikes']:
        if ONLY and b['key'] not in ONLY:
            continue
        reset()
        front, rear = build(b, b['skins'][0])
        path, tris = export(b['key'])
        report[b['key']] = {'glb': os.path.relpath(path, ROOT), 'bytes': os.path.getsize(path), 'tris': tris,
                            'wheelbase_m': round(front.x - rear.x, 4), 'objects': len(bpy.context.scene.objects)}
        print('built', b['key'], report[b['key']])
    json.dump(report, open(os.path.join(ROOT, 'assets/atlas/build-report.json'), 'w'), indent=1)


main()
