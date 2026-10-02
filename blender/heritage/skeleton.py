"""Frame skeleton from a published geometry table (one size) — no photo input.

Units: millimetres. Blender axes: +X forward, +Z up, +Y rider's left. BB centre at x=0, ground at z=0.

Published inputs used: head/seat tube angles, head tube and seat tube lengths, chainstay, BB height,
wheelbase, fork offset and axle-crown length. Headset stack heights are inputs too (published total,
split by the adapter). Derived values (stack, reach, effective top tube, front centre) are returned so
the build can report how well the table closes on itself.
"""
import math
from mathutils import Vector


def build(spec, size, tyre_od, headset_lower, headset_upper, axle_crown, st_top_extra=0.0):
    g = spec['geometry']
    i = g['sizes'].index(size)
    hta = math.radians(g['head_tube_angle'][i])
    sta = math.radians(g['seat_tube_angle'][i])
    R = tyre_od / 2
    if 'bb_height' in g:
        bbh = g['bb_height'][i]
        drop = R - bbh
    else:
        # Trek publishes BB drop. Height is tyre radius minus that drop.
        drop = g['bb_drop'][i]
        bbh = R - drop
    cs = g['chainstay'][i]
    wb = g['wheelbase'][i]
    off = g['fork_offset'][i]
    ht = g['head_tube'][i]
    st = g['seat_tube'][i]

    BB = Vector((0, 0, bbh))
    AX_R = Vector((-math.sqrt(cs * cs - drop * drop), 0, R))
    AX_F = Vector((AX_R.x + wb, 0, R))
    up = Vector((-math.cos(hta), 0, math.sin(hta)))        # steering axis, pointing up/back
    nrm = Vector((math.sin(hta), 0, math.cos(hta)))        # perpendicular, pointing forward/up
    foot = AX_F - nrm * off                                # axis point nearest the front axle
    crown = foot + up * axle_crown                         # axle-crown measured parallel to the steerer
    ht_bot = crown + up * headset_lower
    ht_top = ht_bot + up * ht
    steer_top = ht_top + up * headset_upper
    sdir = Vector((-math.cos(sta), 0, math.sin(sta)))
    st_top = BB + sdir * (st + st_top_extra)

    def seat_x_at(z):
        return BB.x + sdir.x * (z - BB.z) / sdir.z

    derived = {
        'stack': ht_top.z - BB.z,
        'reach': ht_top.x - BB.x,
        'effective_top_tube': ht_top.x - seat_x_at(ht_top.z),
        'front_centre': AX_F.x - BB.x,
        'rear_centre_horizontal': BB.x - AX_R.x,
        # steering axis meets the ground ahead of the contact patch by the trail
        'trail_from_geometry': (foot.x + up.x * (0 - foot.z) / up.z) - AX_F.x,
        'bb_drop': drop,
    }
    published = {k: g[k][i] for k in ('effective_top_tube', 'trail') if k in g}
    return {
        'size': size, 'R': R, 'BB': BB, 'AX_R': AX_R, 'AX_F': AX_F, 'STEER_UP': up, 'STEER_N': nrm,
        'CROWN': crown, 'HT_BOT': ht_bot, 'HT_TOP': ht_top, 'STEER_TOP': steer_top,
        'SEAT_DIR': sdir, 'ST_TOP': st_top, 'derived': derived, 'published_checks': published,
        'inputs': {'hta_deg': g['head_tube_angle'][i], 'sta_deg': g['seat_tube_angle'][i], 'bb_height': bbh,
                   'chainstay': cs, 'wheelbase': wb, 'fork_offset': off, 'head_tube': ht, 'seat_tube': st,
                   'axle_crown': axle_crown, 'headset_lower': headset_lower, 'headset_upper': headset_upper,
                   'tyre_od': tyre_od},
    }


def steer_point(sk, s):
    """Point on the steering axis, s mm above the crown race."""
    return sk['CROWN'] + sk['STEER_UP'] * s


def seat_point(sk, s):
    return sk['BB'] + sk['SEAT_DIR'] * s
