"""Build fused frame/fork meshes from pillow height fields (tools/heritage/pillow_fields.py output).

Each region is a watertight height field (see pillow_surface.region_mesh): top and bottom sheets,
a pinched rim, and wall triangles on stairstep slits. Regions are joined, fused with a voxel remesh,
smoothed and decimated. UVs are a side projection back into the source photo, so the photo's own
decals and carbon pattern can be used as a de-lit albedo (both sides use the same projection, so text
reads mirrored on the non-drive side; stated in the manifest).
"""
import json, math
import numpy as np
import bpy, bmesh
from lib import evaluated_mesh, MM
from pillow_surface import region_mesh


def build(name, npz_path, keys, voxel_mm=0.9, smooth_iter=6, target=220000, meta_path=None, photo_size=None):
    D = np.load(npz_path)
    x0, z0, step = float(D['x0']), float(D['z0']), float(D['step'])
    Vs, Fs, off = [], [], 0
    for k in keys:
        V, F = region_mesh(D[k + '_occ'], D[k + '_h'], D[k + '_yc'], x0, z0, step)
        if len(F) == 0:
            continue
        Vs.append(V)
        Fs.append(F + off)
        off += len(V)
    V = np.concatenate(Vs)
    F = np.concatenate(Fs)
    me = bpy.data.meshes.new(name + '_raw')
    me.vertices.add(len(V))
    me.vertices.foreach_set('co', V.astype(np.float32).ravel())
    me.loops.add(F.size)
    me.loops.foreach_set('vertex_index', F.astype(np.int32).ravel())
    sides = F.shape[1]
    me.polygons.add(len(F))
    me.polygons.foreach_set('loop_start', (np.arange(len(F)) * sides).astype(np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(F), sides, np.int32))
    me.update(calc_edges=True)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    raw = bpy.data.objects.new(name + '_raw', me)
    bpy.context.scene.collection.objects.link(raw)
    r = raw.modifiers.new('remesh', 'REMESH')
    r.mode = 'VOXEL'
    r.voxel_size = voxel_mm * MM
    r.adaptivity = 0
    sm = raw.modifiers.new('smooth', 'SMOOTH')
    sm.iterations = smooth_iter
    sm.factor = 0.5
    out = evaluated_mesh(raw)
    bpy.data.objects.remove(raw)
    tris = sum(len(p.vertices) - 2 for p in out.polygons)
    if target and tris > target:
        tmp = bpy.data.objects.new('tmp', out)
        bpy.context.scene.collection.objects.link(tmp)
        dm = tmp.modifiers.new('dec', 'DECIMATE')
        dm.ratio = target / tris
        out = evaluated_mesh(tmp)
        bpy.data.objects.remove(tmp)
    for p in out.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, out)
    bpy.context.scene.collection.objects.link(obj)
    if meta_path:
        project_uv(obj, json.load(open(meta_path)), photo_size)
    return obj


def project_uv(obj, meta, photo_size):
    """UV = photo pixel of each vertex's (x, z), inverting the fitted similarity transform."""
    s = meta['scale_mm_per_px']
    th = math.radians(meta['rotation_deg'])
    t = np.array(meta['translation_mm'])
    Rinv = np.array([[math.cos(th), math.sin(th)], [-math.sin(th), math.cos(th)]])
    me = obj.data
    uvl = me.uv_layers.new(name='photo')
    co = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3) / MM + np.array(obj.location) / MM
    q = (Rinv @ (co[:, [0, 2]] - t).T) / s          # photo px with y up (negated)
    px, py = q[0], -q[1]
    W, H = photo_size
    uv = np.stack([px / W, 1 - py / H], 1)
    li = np.zeros(len(me.loops), np.int64)
    me.loops.foreach_get('vertex_index', li)
    uvl.data.foreach_set('uv', uv[li].astype(np.float32).ravel())
