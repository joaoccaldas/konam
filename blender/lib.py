"""Geometry helpers for the Speedmax CFR procedural build.

Conventions: Blender world, metres. +X = forward, +Z = up, +Y = rider's left.
Drive side is therefore -Y. Helpers take millimetres where noted (mm()).
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix

MM = 0.001
WORLD = {}   # object name -> world origin (we only use translation-only parents)
MATS = {}


def mm(x, y, z):
    return Vector((x * MM, y * MM, z * MM))


# ------------------------------------------------------------------ materials
def mat(name, color=(.5, .5, .5), metal=0.0, rough=.5, coat=0.0, coat_rough=.05, emit=None, strength=0.0,
        alpha=1.0, double=False, transmission=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = coat_rough
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            m.blend_method = 'BLEND'
    m.use_backface_culling = not double
    MATS[name] = m
    return m


# ------------------------------------------------------------------ objects
def empty(name, loc=Vector(), parent=None, **props):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = .03
    bpy.context.scene.collection.objects.link(o)
    WORLD[name] = loc.copy()
    if parent is not None:
        o.parent = parent
        o.location = loc - WORLD[parent.name]
    else:
        o.location = loc
    for k, v in props.items():
        o[k] = v
    return o


def mesh(name, verts, faces, material, parent=None, origin=None, smooth=True, uvs=None, sharp=None, mats=None,
         face_mats=None, **props):
    """verts are world-space Vectors (metres). uvs: list per face of per-corner (u,v)."""
    if origin is None:
        lo = Vector((min(v.x for v in verts), min(v.y for v in verts), min(v.z for v in verts)))
        hi = Vector((max(v.x for v in verts), max(v.y for v in verts), max(v.z for v in verts)))
        origin = (lo + hi) / 2
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v - origin) for v in verts], [], [tuple(f) for f in faces])
    if uvs:
        uvl = me.uv_layers.new(name='UVMap')
        for poly, fu in zip(me.polygons, uvs):
            for li, c in zip(poly.loop_indices, fu):
                uvl.data[li].uv = c
    me.validate(clean_customdata=False)
    for mt in (mats or [material]):
        me.materials.append(mt)
    if face_mats:
        for p, mi in zip(me.polygons, face_mats):
            p.material_index = mi
    return finish(name, me, parent, origin, smooth, sharp, **props)


def finish(name, me, parent, origin, smooth=True, sharp=None, recalc=True, **props):
    if recalc:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    if smooth and sharp:
        me.set_sharp_from_angle(angle=math.radians(sharp))
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    WORLD[name] = origin.copy()
    if parent is not None:
        o.parent = parent
        o.location = origin - WORLD[parent.name]
    else:
        o.location = origin
    for k, v in props.items():
        o[k] = v
    return o


def join_geo(parts):
    """parts: list of (verts, faces[, uvs]) -> merged (verts, faces, uvs|None)."""
    V, F, U = [], [], []
    has_uv = all(len(p) > 2 and p[2] for p in parts)
    for p in parts:
        off = len(V)
        V += p[0]
        F += [[i + off for i in f] for f in p[1]]
        if has_uv:
            U += p[2]
    return V, F, (U if has_uv else None)


# ------------------------------------------------------------------ profiles (2D: (a, b))
def naca_half(s):
    return .2969 * math.sqrt(max(s, 0)) - .1260 * s - .3516 * s * s + .2843 * s ** 3 - .1015 * s ** 4


def kamm(chord, thick, trunc=.82, n=18, le=1, shift=0.0, tail_pts=5):
    """Truncated airfoil. a = lateral (thickness), b = chord axis. Leading edge at b = le*chord/2 (+shift).
    Returns 2*n + tail_pts - ... closed loop with constant count for given n / tail_pts."""
    ymax = max(naca_half(t / 200) for t in range(1, 200))
    scale = (thick / 2) / ymax
    pts_up = []
    for i in range(n):
        s = trunc * (1 - math.cos(math.pi * i / (n - 1) / 1.0)) / 2 if False else trunc * (0.5 - 0.5 * math.cos(math.pi * i / (n - 1)))
        s = trunc * (1 - math.cos(0.5 * math.pi * i / (n - 1)))  # dense at LE
        y = naca_half(s) * scale
        b = le * (chord / 2 - s / trunc * chord) + shift
        pts_up.append((y, b))
    yt = pts_up[-1][0]
    bt = pts_up[-1][1]
    tail = []
    for k in range(1, tail_pts + 1):
        t = k / (tail_pts + 1)
        a = yt * math.cos(math.pi * t)
        b = bt - le * 0.18 * yt * math.sin(math.pi * t)
        tail.append((a, b))
    pts_lo = [(-y, b) for (y, b) in reversed(pts_up[1:])]
    return pts_up + tail + pts_lo


def kamm_count(n=18, tail_pts=5):
    return n + tail_pts + n - 1


def superellipse(w, h, e=2.6, n=40, ca=0.0, cb=0.0):
    out = []
    for i in range(n):
        t = i / n * 2 * math.pi
        c, s = math.cos(t), math.sin(t)
        out.append((ca + w / 2 * math.copysign(abs(c) ** (2 / e), c), cb + h / 2 * math.copysign(abs(s) ** (2 / e), s)))
    return out


def resample_loop(pts, n):
    """Resample a closed 2D loop to n points evenly by arc length."""
    L = [0.0]
    P = pts + [pts[0]]
    for i in range(1, len(P)):
        L.append(L[-1] + math.dist(P[i], P[i - 1]))
    tot = L[-1]
    out, j = [], 0
    for k in range(n):
        d = tot * k / n
        while L[j + 1] < d:
            j += 1
        t = (d - L[j]) / max(L[j + 1] - L[j], 1e-12)
        out.append((P[j][0] + (P[j + 1][0] - P[j][0]) * t, P[j][1] + (P[j + 1][1] - P[j][1]) * t))
    return out


# ------------------------------------------------------------------ lofts / sweeps
def loft(rings, closed=True, cap0=False, cap1=False, uv=True):
    n, m = len(rings), len(rings[0])
    V = [v for r in rings for v in r]
    F, U = [], []
    cols = m if closed else m - 1
    for i in range(n - 1):
        for j in range(cols):
            j2 = (j + 1) % m
            F.append([i * m + j, i * m + j2, (i + 1) * m + j2, (i + 1) * m + j])
            U.append([(i / (n - 1), j / cols), (i / (n - 1), (j + 1) / cols), ((i + 1) / (n - 1), (j + 1) / cols),
                      ((i + 1) / (n - 1), j / cols)])
    for cap, ri in ((cap0, 0), (cap1, n - 1)):
        if cap:
            ids = [ri * m + j for j in range(m)]
            c = sum((V[k] for k in ids), Vector()) / m
            ci = len(V)
            V.append(c)
            for j in range(m):
                F.append([ids[j], ids[(j + 1) % m], ci])
                U.append([(0, 0), (0, 0), (0, 0)])
    return V, F, (U if uv else None)


def frames_along(path, lat=Vector((0, 1, 0))):
    out = []
    n = len(path)
    for i, p in enumerate(path):
        if i == 0:
            T = path[1] - path[0]
        elif i == n - 1:
            T = path[-1] - path[-2]
        else:
            T = path[i + 1] - path[i - 1]
        T.normalize()
        N = lat - T * lat.dot(T)
        if N.length < 1e-6:
            N = Vector((0, 0, 1))
        N.normalize()
        B = T.cross(N)
        out.append((T, N, B))
    return out


def sweep(path, profiles, lat=Vector((0, 1, 0)), cap0=True, cap1=True):
    """path: world Vectors (m). profiles: per-station list of (a,b) in mm (a along N/lat, b along B=T x N)."""
    if not isinstance(profiles[0], list):
        raise ValueError
    fr = frames_along(path, lat)
    rings = []
    for p, (T, N, B), prof in zip(path, fr, profiles):
        rings.append([p + N * (a * MM) + B * (b * MM) for a, b in prof])
    return loft(rings, True, cap0, cap1)


def lathe(prof, segs, center, closed_prof=False, axis='Y', a0=0.0, a1=2 * math.pi):
    """prof: list of (r_mm, y_mm). Revolve around the lateral axis through center."""
    full = abs((a1 - a0) - 2 * math.pi) < 1e-6
    rings = []
    cnt = segs if full else segs + 1
    for k in range(cnt):
        t = a0 + (a1 - a0) * k / segs
        c, s = math.cos(t), math.sin(t)
        if axis == 'Y':
            rings.append([(center + Vector((r * c, y, r * s))) * MM for r, y in prof])
        else:  # axis X
            rings.append([(center + Vector((y, r * c, r * s))) * MM for r, y in prof])
    # rings indexed by angle; build faces along profile within each ring
    m = len(prof)
    V = [v for r in rings for v in r]
    F, U = [], []
    pl = [0.0]
    for i in range(1, m):
        pl.append(pl[-1] + math.dist(prof[i], prof[i - 1]))
    if closed_prof:
        tot = pl[-1] + math.dist(prof[0], prof[-1])
    else:
        tot = pl[-1] or 1
    pcols = m if closed_prof else m - 1
    nr = len(rings)
    ncols = nr if full else nr - 1
    for k in range(ncols):
        k2 = (k + 1) % nr
        for j in range(pcols):
            j2 = (j + 1) % m
            F.append([k * m + j, k2 * m + j, k2 * m + j2, k * m + j2])
            v0 = pl[j] / tot
            v1 = (pl[j2] if j2 else tot) / tot
            U.append([(k / segs, v0), ((k + 1) / segs, v0), ((k + 1) / segs, v1), (k / segs, v1)])
    return V, F, U


def ring_solid(outer, inner, y0, y1, center, uv=False):
    """outer/inner: lists of (x,z) mm offsets (same count, angle-matched) -> extruded annulus between y0..y1."""
    n = len(outer)
    V = []
    for y in (y0, y1):
        V += [(center + Vector((x, y, z))) * MM for x, z in outer]
        V += [(center + Vector((x, y, z))) * MM for x, z in inner]
    o0, i0, o1, i1 = 0, n, 2 * n, 3 * n
    F = []
    for k in range(n):
        k2 = (k + 1) % n
        F.append([o0 + k, o0 + k2, i0 + k2, i0 + k])  # face y0
        F.append([o1 + k, i1 + k, i1 + k2, o1 + k2])  # face y1
        F.append([o0 + k, o1 + k, o1 + k2, o0 + k2])  # outer wall
        F.append([i0 + k, i0 + k2, i1 + k2, i1 + k])  # inner wall
    return V, F, None


def gear_outline(n, r_pitch, root=4.0, tip=3.3, pts=8):
    out = []
    shape = [(0.0, -root), (.16, -root + .5), (.30, tip - 1.4), (.40, tip), (.60, tip), (.70, tip - 1.4),
             (.84, -root + .5)]
    for t in range(n):
        for f, dr in shape:
            a = (t + f) / n * 2 * math.pi
            r = r_pitch + dr
            out.append((r * math.cos(a), r * math.sin(a)))
    return out


def circle_matched(outline, r):
    return [(r * math.cos(math.atan2(z, x)), r * math.sin(math.atan2(z, x))) for x, z in outline]


def prism(poly_xz, y0, y1, center=Vector()):
    """Simple extrusion of a convex-ish or simple polygon (mm, XZ plane) between y0..y1 (mm)."""
    bm = bmesh.new()
    vs = [bm.verts.new(tuple((center + Vector((x, y0, z))) * MM)) for x, z in poly_xz]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    dv = Vector((0, (y1 - y0) * MM, 0))
    bmesh.ops.translate(bm, vec=dv, verts=[e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    V = [v.co.copy() for v in bm.verts]
    F = [[v.index for v in fc.verts] for fc in bm.faces]
    bm.free()
    return V, F, None


def box(c, size, round_e=None, n=24):
    """Axis aligned box (mm). If round_e, lateral sweep of a superellipse (rounded box)."""
    sx, sy, sz = size
    if round_e:
        prof = superellipse(sz, sx, round_e, n)  # a along Z, b along X
        path = [(c + Vector((0, -sy / 2, 0))) * MM, (c + Vector((0, sy / 2, 0))) * MM]
        return sweep(path, [prof, prof], lat=Vector((0, 0, 1)))
    hx, hy, hz = sx / 2 * MM, sy / 2 * MM, sz / 2 * MM
    V = [c * MM + Vector((x, y, z)) for x in (-hx, hx) for y in (-hy, hy) for z in (-hz, hz)]
    F = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]
    return V, F, None


def tube(p0, p1, r0, r1=None, sides=16, cap=True):
    """Round tube between world points (m); radii mm."""
    r1 = r0 if r1 is None else r1
    d = (p1 - p0)
    lat = Vector((0, 1, 0)) if abs(d.normalized().y) < .9 else Vector((0, 0, 1))
    prof0 = [(r0 * math.cos(t / sides * 6.2832), r0 * math.sin(t / sides * 6.2832)) for t in range(sides)]
    prof1 = [(r1 * math.cos(t / sides * 6.2832), r1 * math.sin(t / sides * 6.2832)) for t in range(sides)]
    return sweep([p0, p1], [prof0, prof1], lat=lat, cap0=cap, cap1=cap)


def polyline_tube(pts, r, sides=12, lat=Vector((0, 1, 0))):
    prof = [(r * math.cos(t / sides * 6.2832), r * math.sin(t / sides * 6.2832)) for t in range(sides)]
    return sweep(pts, [prof] * len(pts), lat=lat)


def xform(geo, M):
    V, F, U = geo
    return [M @ v for v in V], F, U


def catmull(ctrl, per=8):
    out = []
    P = [ctrl[0]] + ctrl + [ctrl[-1]]
    for i in range(1, len(P) - 2):
        for k in range(per):
            t = k / per
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(ctrl[-1])
    return out


def evaluated_mesh(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    return bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
