"""Generic round/shaped-tube frame builder for pre-monocoque frames.

An adapter describes each tube as a list of stations: (point_mm, half_width_mm, half_depth_mm[, shape]).
Tubes are swept individually, joined, fused with a voxel remesh, then each face is assigned the paint
zone of its nearest tube station (the adapter provides zone names per station), because the remesh
discards per-tube materials.
"""
import math
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib import mesh, join_geo, sweep, lathe, evaluated_mesh, MM
from parts import W, ellipse_prof, teardrop_prof, TAU


def densify(stations, per_mm=12.0):
    """Linear interpolation between stations so profiles blend smoothly (every ~per_mm)."""
    out = []
    for (p0, a0, b0, s0, z0), (p1, a1, b1, s1, z1) in zip(stations, stations[1:]):
        n = max(1, int((p1 - p0).length / per_mm))
        for k in range(n):
            t = k / n
            out.append((p0.lerp(p1, t), a0 + (a1 - a0) * t, b0 + (b1 - b0) * t, s0 if t < .5 else s1, z0 if t < .5 else z1))
    out.append(stations[-1])
    return out


def station(p, a, b, shape='ellipse', zone='paint_a'):
    return (Vector(p), float(a), float(b), shape, zone)


def tube_geo(stations, lat=Vector((0, 1, 0)), n=28):
    st = densify(stations)
    profs = []
    for p, a, b, shape, _ in st:
        if shape == 'teardrop':
            profs.append(teardrop_prof(a, b, n))
        else:
            profs.append(ellipse_prof(a, b, n))
    return sweep([W(s[0]) for s in st], profs, lat=lat, cap0=True, cap1=True), st


def voxel_fuse(obj, voxel, smooth_iter=4, smooth_fac=.5, target=None):
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
            me = evaluated_mesh(tmp)
            bpy.data.objects.remove(tmp)
    for p in me.polygons:
        p.use_smooth = True
    return me


def build_fused(name, tubes, extra_geo, zone_mats, voxel_mm=1.2, target=160000, part=None, explode=(0, 0, 0),
                smooth_iter=4):
    """tubes: dict name -> list of stations; extra_geo: list of (geo, zone) for non-tube pieces (shells, plates).
    zone_mats: zone name -> material. Returns the fused object."""
    geos, samples = [], []
    for tname, sts in tubes.items():
        lat = Vector((0, 0, 1)) if abs((sts[-1][0] - sts[0][0]).normalized().y) > .9 else Vector((0, 1, 0))
        g, dense = tube_geo(sts, lat=lat)
        geos.append(g)
        samples += [(s[0], s[4]) for s in dense]
    for g, zone, pts in extra_geo:
        geos.append(g)
        samples += [(p, zone) for p in pts]
    V, F, _ = join_geo([(g[0], g[1]) for g in geos])
    raw = mesh(name + '_raw', V, F, list(zone_mats.values())[0])
    origin = raw.location.copy()
    me = voxel_fuse(raw, voxel_mm * MM, smooth_iter=smooth_iter, target=target)
    bpy.data.objects.remove(raw)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = origin
    # paint zones by nearest station sample (samples in mm world space)
    kd = KDTree(len(samples))
    for i, (p, _) in enumerate(samples):
        kd.insert(p, i)
    kd.balance()
    names = list(zone_mats.keys())
    me.materials.clear()
    for z in names:
        me.materials.append(zone_mats[z])
    for poly in me.polygons:
        c = (Vector(poly.center) + origin) / MM
        _, idx, _ = kd.find(c)
        poly.material_index = names.index(samples[idx][1])
    obj['part'] = part or name
    obj['explode'] = list(explode)
    from lib import WORLD
    WORLD[name] = origin.copy()
    return obj
