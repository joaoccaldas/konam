"""Adapter trek-equinox-alphasl-2004-tubes-v1: Trek Equinox 9, MY2004, Alpha SL aluminium, size 58.

Three kinds of numbers, kept apart:
  PUBLISHED  - 2004 Trek Specifications Manual (spec record): skeleton, parts list, crank, rings, cogs.
  PHOTO      - measured on the 2004 trekbikes.com photo at the calibrated scale (tube-trace.json,
               equinox_alphasl_2004_trace.json): side-view tube depths, joint fractions along tubes,
               cockpit/saddle offsets, crank angle.
  INFERRED   - not visible from the side: lateral tube widths, stay spread, hub widths, headset split.

Known conflict (recorded in the spec record and manifest): the photographed sample's rear centre is
~375 mm and BB height ~294 mm, against 410 mm / 266 mm published for size 58. The skeleton follows the
published table; photo-derived shapes are transferred as fractions along each tube.
"""
import math
from mathutils import Vector
import skeleton as SK
import parts as P
import frame_tubes as FT

ADAPTER = 'trek-equinox-alphasl-2004-tubes-v1'

# ---------------------------------------------------------------- inputs
TYRE_OD = 668.0              # PUBLISHED 700x23c -> 622 + 2*23
HEADSET_LOWER = 12.6         # INFERRED split of the PUBLISHED 30.1 mm Cane Creek BL stack
HEADSET_UPPER = 17.5
AXLE_CROWN = 370.0           # PUBLISHED "345/ 370 mm" -> 370 for 700c sizes (see spec discrepancy)

# PHOTO: joint fractions measured on the trace (see equinox_alphasl_2004_trace.json)
TT_ON_SEAT = 0.865           # top tube centre along seat tube (BB=0, top=1)
TT_ON_HEAD = 0.12            # top tube centre along head tube from its top
DT_ON_HEAD = 0.86            # down tube centre along head tube from its top
SS_ON_SEAT = 0.83            # seat stay top along seat tube
BRAKE_ON_SS = 0.65           # rear brake bridge along seat stay from the dropout

# PHOTO side depths (mm, full depth) ; INFERRED widths (mm, full width)
DEPTH = {'top_tube': (30.5, 35.0), 'down_tube': 79.0, 'seat_tube': 34.0, 'seat_stay': 23.0,
         'chain_stay': (23.0, 35.0), 'fork_blade': (40.0, 22.0)}
WIDTH = {'top_tube': 32.0, 'down_tube': 42.0, 'seat_tube': 32.0, 'head_tube': 38.0, 'seat_stay': 14.0,
         'chain_stay': 18.0, 'fork_blade': 17.0}
HEAD_TUBE_OD = 38.0          # INFERRED (white tube on white background; not measurable)
REAR_OLD, FRONT_OLD = 130.0, 100.0   # INFERRED period rim-brake road standards

# PHOTO cockpit/saddle offsets from the head-tube top / seat-tube top, mm (x fwd, z up)
BASEBAR_CLAMP_REL = (39.0, 57.0)
BULLHORN_TIP_REL = (270.0, 13.0)     # from the bar clamp
EXT_TIP_REL = (305.0, 141.0)         # from the bar clamp
PAD_REL = (26.0, 108.0)              # from the bar clamp
SEATPOST_EXT = 139.0                 # exposed post along the seat axis above the seat tube top
SADDLE_LEN = 276.0                   # PHOTO (matches the SSM Azoto)
CRANK_ANGLE = -6.9                   # PHOTO drive arm angle, spindle->pedal eye (deg from +X towards +Z)


def build(ctx):
    M, spec, size = ctx['M'], ctx['spec'], ctx['size']
    trim = spec['trims']['equinox_9']
    sk = SK.build(spec, size, TYRE_OD, HEADSET_LOWER, HEADSET_UPPER, AXLE_CROWN)
    i = spec['geometry']['sizes'].index(size)
    BB, AXR, AXF = sk['BB'], sk['AX_R'], sk['AX_F']
    up, sdir = sk['STEER_UP'], sk['SEAT_DIR']
    ht_len = spec['geometry']['head_tube'][i]
    st_len = spec['geometry']['seat_tube'][i]

    def ht_at(f_from_top):
        return sk['HT_TOP'] - up * (ht_len * f_from_top)

    def st_at(f):
        return BB + sdir * (st_len * f)

    st = FT.station
    blue, white = 'paint_blue', 'paint_white'
    tt_seat, tt_head = st_at(TT_ON_SEAT), ht_at(TT_ON_HEAD)
    dt_head = ht_at(DT_ON_HEAD)
    ss_top = st_at(SS_ON_SEAT)
    drop_ss = AXR + Vector((6, 0, 16))       # INFERRED stay ends on the dropout plate
    drop_cs = AXR + Vector((10, 0, 2))
    tubes = {
        'head_tube': [st(sk['HT_BOT'], HEAD_TUBE_OD / 2, HEAD_TUBE_OD / 2, zone=white),
                      st(sk['HT_TOP'], HEAD_TUBE_OD / 2, HEAD_TUBE_OD / 2, zone=white)],
        'top_tube': [st(tt_seat, WIDTH['top_tube'] / 2, DEPTH['top_tube'][0] / 2, zone=blue),
                     st(tt_seat.lerp(tt_head, .35), WIDTH['top_tube'] / 2, DEPTH['top_tube'][0] / 2, zone=white),
                     st(tt_head, WIDTH['top_tube'] / 2, DEPTH['top_tube'][1] / 2, zone=white)],
        'down_tube': [st(BB + (dt_head - BB).normalized() * 18, WIDTH['down_tube'] / 2, 30, zone=blue),
                      st(BB.lerp(dt_head, .22), WIDTH['down_tube'] / 2, DEPTH['down_tube'] / 2, zone=blue),
                      st(BB.lerp(dt_head, .74), WIDTH['down_tube'] / 2, DEPTH['down_tube'] / 2, zone=blue),
                      st(BB.lerp(dt_head, .80), WIDTH['down_tube'] / 2, DEPTH['down_tube'] / 2 * .92, zone=white),
                      st(dt_head, WIDTH['down_tube'] / 2 * .92, DEPTH['down_tube'] / 2 * .72, zone=white)],
        'seat_tube': [st(BB, WIDTH['seat_tube'] / 2, DEPTH['seat_tube'] / 2 + 2, zone=blue),
                      st(sk['ST_TOP'], WIDTH['seat_tube'] / 2 * .92, DEPTH['seat_tube'] / 2 * .9, zone=blue)],
    }
    for sgn, side in ((-1, 'R'), (1, 'L')):
        y_drop = sgn * (REAR_OLD / 2 - 6)
        tubes['chain_stay_' + side] = [
            st(drop_cs + Vector((0, y_drop, 0)), WIDTH['chain_stay'] / 2 * .8, DEPTH['chain_stay'][0] / 2, zone=blue),
            st(drop_cs.lerp(BB, .55) + Vector((0, sgn * 44, 0)), WIDTH['chain_stay'] / 2, DEPTH['chain_stay'][1] / 2 * .9, zone=blue),
            st(BB + (drop_cs - BB).normalized() * 14 + Vector((0, sgn * 26, 0)), WIDTH['chain_stay'] / 2, DEPTH['chain_stay'][1] / 2, zone=blue)]
        tubes['seat_stay_' + side] = [
            st(drop_ss + Vector((0, y_drop, 0)), WIDTH['seat_stay'] / 2, DEPTH['seat_stay'] / 2 * .85, zone=blue),
            st(drop_ss.lerp(ss_top, .6) + Vector((0, sgn * 34, 0)), WIDTH['seat_stay'] / 2, DEPTH['seat_stay'] / 2, zone=blue),
            st(ss_top + (drop_ss - ss_top).normalized() * 10 + Vector((0, sgn * 11, 0)), WIDTH['seat_stay'] / 2, DEPTH['seat_stay'] / 2, zone=blue)]
    # brake bridge between the seat stays (INFERRED position from the photo's caliper)
    ssb = drop_ss.lerp(ss_top, BRAKE_ON_SS)
    tubes['brake_bridge'] = [st(ssb + Vector((0, -27, 0)), 6, 6, zone=blue), st(ssb + Vector((0, 27, 0)), 6, 6, zone=blue)]
    # BB shell (68 mm, PUBLISHED) and dropout plates
    extra = []
    shell = P.lathe([(0.1, -34), (21, -34), (21, 34), (0.1, 34)], 32, BB, closed_prof=True)
    extra.append((shell, blue, [BB + Vector((0, y, 0)) for y in (-30, 0, 30)]))
    for sgn in (-1, 1):
        c = AXR + Vector((4, sgn * (REAR_OLD / 2 - 3), 8))
        g = P.box(c, (44, 5, 40), round_e=2.6)
        extra.append((g, blue, [c]))
    frame = FT.build_fused('frame', tubes, extra, {blue: M['paint_blue'], white: M['paint_white']},
                           voxel_mm=ctx['voxel_mm'], target=ctx['frame_tris'], part='frame')

    # ---------------- fork (PHOTO blade depths, INFERRED widths; white crown fading to black blades)
    crown = sk['CROWN']
    fork_tubes = {'steer_stub': [st(crown - up * 4, 14, 14, zone='fork_white'), st(crown + up * 6, 14, 14, zone='fork_white')]}
    fk_y = FRONT_OLD / 2 - 5
    for sgn, side in ((-1, 'R'), (1, 'L')):
        top = crown + Vector((4, sgn * 38, -10))
        bot = AXF + Vector((0, sgn * fk_y, 10))
        fork_tubes['blade_' + side] = [
            st(top, WIDTH['fork_blade'] / 2 + 2, DEPTH['fork_blade'][0] / 2, 'teardrop', 'fork_white'),
            st(top.lerp(bot, .3), WIDTH['fork_blade'] / 2, DEPTH['fork_blade'][0] / 2 * .9, 'teardrop', 'fork_black'),
            st(bot, WIDTH['fork_blade'] / 2 * .8, DEPTH['fork_blade'][1] / 2, 'teardrop', 'fork_black')]
    fork_tubes['crown'] = [st(crown + Vector((4, -44, -8)), 16, 20, zone='fork_white'),
                           st(crown + Vector((4, 44, -8)), 16, 20, zone='fork_white')]
    fextra = []
    for sgn in (-1, 1):
        c = AXF + Vector((0, sgn * (FRONT_OLD / 2 - 2), 6))
        fextra.append((P.box(c, (22, 4, 30), round_e=2.6), 'fork_black', [c]))
    fork = FT.build_fused('fork', fork_tubes, fextra, {'fork_white': M['paint_white'], 'fork_black': M['carbon']},
                          voxel_mm=ctx['voxel_mm'], target=ctx['fork_tris'], part='fork', explode=[.2, 0, -.16])

    # ---------------- wheels (PUBLISHED: Bontrager Race Aero 16 h, 575 ERD, 700x23c)
    rim_depth = (622 / 2 + 2) - (575 / 2 - 2.5)        # hook top minus spoke-bed radius from the published ERD
    wf = dict(bsd=622, tyre_od=TYRE_OD, tyre_width=23, rim_depth=rim_depth, rim_width_brake=19.5, rim_width_bed=12,
              spokes=16, old=FRONT_OLD, flange_y=(-31, 31), flange_r=20, spoke_cross=0.0)
    wr = dict(wf, old=REAR_OLD, flange_y=(-21, 36), flange_r=24, spoke_cross=math.radians(22))
    P.build_wheel(M, AXF, 'front', wf)
    g_rear = P.build_wheel(M, AXR, 'rear', wr)

    # ---------------- drivetrain (PUBLISHED Ultegra 53/39 130 BCD, 175 mm size 58, HG70 12-23, 9-speed)
    cogs = trim['cassette_cogs']
    pitch9 = 4.34                                     # Shimano 9-speed cog pitch
    y_small = -(REAR_OLD / 2) + 6.5
    P.build_cassette(M, AXR, cogs, y_small, pitch9, g_rear)
    crank_len = spec['fit']['crank_length'][spec['fit']['sizes'].index(size)]
    rings = trim['gearing_front'][::-1]               # [53, 39]
    ring_y = [-46.2, -40.8]
    P.build_crankset(M, BB, rings, ring_y, 130, crank_len, CRANK_ANGLE)
    cog_i = cogs.index(15)
    y_cog = y_small + cog_i * pitch9
    jockey = AXR + Vector((8, y_cog, -58))
    idler = AXR + Vector((30, y_cog, -112))
    path = P.chain_path(BB, P.cog_radius(53), AXR, P.cog_radius(15), jockey, idler)
    P.build_chain(M, path, (-46.2 + y_cog) / 2)
    P.build_rd(M, AXR, y_cog, jockey, idler)
    P.build_fd(M, st_at(0.36) + Vector((-4, -8, 0)), BB + Vector((0, 0, P.cog_radius(53))), -46.2)

    # ---------------- brakes (PUBLISHED Shimano 105 dual pivot)
    P.build_caliper(M, 'brake_front', crown + up * -2 + Vector((18, 0, -6)), AXF, 310, 1)
    P.build_caliper(M, 'brake_rear', ssb + Vector((-14, 0, 0)), AXR, 310, -1)

    # ---------------- cockpit (PUBLISHED part list; PHOTO positions; stem length per PUBLISHED fit table)
    stem, clamp = P.build_steerer_stem(M, crown, sk['STEER_TOP'], up,
                                       spec['fit']['stem_length'][spec['fit']['sizes'].index(size)], -7.0, 10.0)
    photo_clamp = sk['HT_TOP'] + Vector((BASEBAR_CLAMP_REL[0], 0, BASEBAR_CLAMP_REL[1]))
    ctx['notes'].append('Bar clamp from the stem build %s mm vs photo offset %s mm' % (
        [round(v, 1) for v in (clamp.x, clamp.z)], [round(v, 1) for v in (photo_clamp.x, photo_clamp.z)]))
    bar = P.build_bullhorn(M, clamp, BULLHORN_TIP_REL, 420)
    horn_tips = [clamp + Vector((BULLHORN_TIP_REL[0], s * 420 / 2 * .95, BULLHORN_TIP_REL[1])) for s in (-1, 1)]
    clip, tips = P.build_clipons(M, clamp + Vector((0, 0, 14)), PAD_REL, EXT_TIP_REL, 150)
    P.build_barend_shifters(M, tips, Vector((0.2, 0, 1)).normalized())
    P.build_aero_levers(M, horn_tips, Vector((1, 0, 0.05)).normalized())

    # ---------------- seat (PUBLISHED Bontrager Race X Lite 27.2, SSM Azoto; PHOTO height/setback)
    post, head = P.build_seatpost(M, sk['ST_TOP'], sdir, 100.0, SEATPOST_EXT, 4.0)
    P.build_saddle(M, head, SADDLE_LEN, 135.0)
    return sk
