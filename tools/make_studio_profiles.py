#!/usr/bin/env python3
"""Generate modern-studio viewer profiles for the four heritage bikes.

Reads museum/viewer-speedmax-*.json (reference-study data) and writes
museum/studio/viewer-<key>-studio.json consumable by web/src/main.js —
giving every heritage bike the EXACT modern studio (configurator, Aero lab,
Paint studio, Wyld, exploded view, workshop) with honest heritage framing.

Run from repo root: python3 tools/make_studio_profiles.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'museum/studio'
OUT.mkdir(parents=True, exist_ok=True)

# Shared configurator ideas that the user wants on every bike (Kona Lava, Wyld, ...).
# Stealth, Glacier, Kona Lava and Wyld already come from web/src/data.js PRESETS for every bike;
# repeating them here produced duplicate chips (two "Kona Lava").
SHARED_PRESETS = []

BIKES = {
    'speedmax-three-2005': dict(
        exhibit='03', year='2005', weight=8.75, chainring=54, cog=12,
        gear='54 / 42', gear_sub='Dura-Ace 12–23 · bar-end', rims='Disc',
        tyre_front='CONTINENTAL GP3000 · 23-622', tyre_rear='CARBOTEC DISC · rear',
        accent='#bde9d9',
    ),
    'speedmax-2007': dict(
        exhibit='04', year='2007', weight=9.5, chainring=53, cog=12,
        gear='53 / 39', gear_sub='Dura-Ace 12–23', rims='Disc',
        tyre_front='CONTINENTAL GRAND PRIX · 23-622', tyre_rear='CARBOTEC DISC · rear',
        accent='#e46a6a',
    ),
    'speedmax-al-2011': dict(
        exhibit='05', year='2011', weight=8.8, chainring=52, cog=12,
        gear='52 / 36', gear_sub='Ultegra 12–25', rims='Aero alu',
        tyre_front='CONTINENTAL GRAND PRIX · 23-622', tyre_rear='CONTINENTAL GRAND PRIX · 23-622',
        accent='#e8a06a',
    ),
    'speedmax-cf-2011': dict(
        exhibit='06', year='2011', weight=7.7, chainring=54, cog=12,
        gear='54 / 42', gear_sub='Dura-Ace 12–23', rims='404 / 808',
        tyre_front='CONTINENTAL GRAND PRIX · 23-622', tyre_rear='CONTINENTAL GRAND PRIX · 23-622',
        accent='#d8a3f0',
    ),
}

for key, extra in BIKES.items():
    src = json.loads((ROOT / f'museum/viewer-{key}.json').read_text())
    b = src['bike']

    # ---- colourways: the documented finish first, then the shared configurator ideas
    presets = []
    for i, p in enumerate(src.get('presets', [])[:3]):
        c = p.get('colors', {})
        presets.append({
            'name': p['name'].replace('Explore · ', ''),
            'sub': 'Archived Canyon colourway' if i else f"{b.get('finishName','documented finish')} · as photographed",
            'frame': c.get('paint_frame', '#0d0d0f'),
            'finish': 'gloss',
            'irid': 0,
            'decal': c.get('decal_dark') or c.get('decal_light') or '#d9d9d9',
            'cockpit': 'carbon',
            'rimText': c.get('decal_light', '#d9d9d9'),
        })
    # de-duplicate names, keep order
    seen = set(); presets = [p for p in presets if not (p['name'] in seen or seen.add(p['name']))]
    presets += [p for p in SHARED_PRESETS if p['name'] not in seen]

    default = presets[0]

    # ---- parts: a complete list from the archived specification. It replaces the MY2027
    # catalogue outright, so a 2011 frame is never described with CFR names, weights or prices.
    rows = {k.lower(): (k, v) for k, v in b.get('spec', [])}
    SPEC = {'frame': ['Frame'], 'fork': ['Fork'], 'crankset': ['Crankset', 'Cranks'], 'chainrings': ['Crankset'], 'crank_arm_ds': ['Crankset'], 'crank_arm_nds': ['Crankset'],
            'spindle': ['Bottom bracket', 'Crankset'], 'cassette': ['Cassette'], 'chain': ['Chain', 'Drivetrain'], 'rear_derailleur': ['Rear derailleur', 'Drivetrain'],
            'front_derailleur': ['Front derailleur', 'Drivetrain'], 'brake_front': ['Brakes'], 'brake_rear': ['Brakes'], 'brake_levers': ['Brake levers', 'Shifters'],
            'wheel_front': ['Wheels', 'Front wheel'], 'wheel_rear': ['Wheels', 'Rear wheel'], 'saddle': ['Saddle'], 'seatpost': ['Seatpost'], 'stem': ['Stem', 'Cockpit'],
            'base_bar': ['Handlebar', 'Base bar', 'Cockpit'], 'extensions': ['Aerobar', 'Extensions', 'Cockpit'], 'cables': ['Drivetrain']}
    GROUP = {'frame': 'frame', 'fork': 'frame', 'wheel_front': 'wheels', 'wheel_rear': 'wheels', 'saddle': 'contact', 'seatpost': 'contact', 'stem': 'cockpit',
             'base_bar': 'cockpit', 'extensions': 'cockpit', 'brake_levers': 'cockpit', 'brake_front': 'brakes', 'brake_rear': 'brakes', 'cables': 'cockpit'}
    NICE = {'wheel_front': 'Front wheel', 'wheel_rear': 'Rear wheel', 'brake_front': 'Front brake', 'brake_rear': 'Rear brake', 'crank_arm_ds': 'Drive-side crank',
            'crank_arm_nds': 'Non-drive crank', 'rear_derailleur': 'Rear derailleur', 'front_derailleur': 'Front derailleur', 'spindle': 'Bottom-bracket spindle', 'base_bar': 'Base bar'}
    labels = src.get('partLabels', {})
    parts = {}
    for pid, keys in SPEC.items():
        hit = next((rows[k.lower()] for k in keys if k.lower() in rows), None)
        parts[pid] = {'name': labels.get(pid) or NICE.get(pid) or pid.replace('_', ' ').capitalize(), 'group': GROUP.get(pid, 'drivetrain'),
                      'spec': hit[1] if hit else 'Simplified external form rebuilt from the archived specification.',
                      'note': (f"Archived {hit[0].lower()} specification, {extra['year']}." if hit else 'Shape interpreted from the archive photograph.')}

    # ---- geometry rows for the Specs drawer (single size, honest source)
    geo_rows = [[label, value] for label, value in b.get('geometry', [])]

    profile = {
        'schema_version': 1,
        'bike': {
            'key': key,
            'name': b['name'],
            'family': b['family'],
            'year': extra['year'],
            'era': b['era'],
            'size': b['size'],
            'weight': extra['weight'],
            'price': None,
            'claim': b['lede'],
            'pageTitle': b['pageTitle'],
            'exhibit': extra['exhibit'],
            'gear': extra['gear'],
            'gearSub': extra['gear_sub'],
            'rims': extra['rims'],
            'chainring': extra['chainring'],
            'cog': extra['cog'],
            'tyreFront': extra['tyre_front'],
            'tyreRear': extra['tyre_rear'],
        },
        'hero': {
            'eyebrow': f"Canyon collection · Exhibit {extra['exhibit']} · {b['era']}",
            'title': b['family'],
            'titleSpan': b['name'],
            'sub': 'A reference-calibrated heritage study.',
            'lede': b['lede'],
        },
        'geometry': { 'sizes': [b['size']], 'rows': geo_rows },
        'geometryNote': b.get('method', ''),
        'presets': {p['name'].lower().split()[0] if not p.get('wyld') else 'wyld': {**p, 'name': p['name']} for p in presets},
        # first preset is the default colourway
        'defaultCfg': {
            'preset': 'heritage',
            'frame': default['frame'], 'finish': 'gloss', 'irid': 0,
            'decal': default['decal'], 'cockpit': 'carbon',
            'rimText': default['rimText'],
        },
        'parts': parts,
        'partsReplace': True,
        'tour': [
            { 'view': 'side', 'title': 'A silhouette from the archive', 'text': b['story'] },
            { 'view': 'cockpit', 'title': 'Cockpit of its era', 'text': 'Clip-on extensions, cable housings and the cockpit hardware documented for this build. Side profiles are traced from the archived photograph; depths remain interpreted.' },
            { 'view': 'drivetrain', 'title': 'The drivetrain, as listed', 'text': f"{extra['gear']} rings with a {extra['gear_sub']} cassette. Switch to Ride to see cadence drive the wheels through the listed ratio." },
            { 'view': 'nds', 'title': 'The other side of the story', 'text': 'Brakes, hubs and frame details follow the archived specification. Where the photo is silent, shapes are inferred and marked as such.' },
            { 'view': 'hero', 'title': f"Exhibit {extra['exhibit']} · {b['family']} {b['name']}", 'text': 'A photo-calibrated reconstruction. Orbit freely, repaint it in the Customizer, or light it in the Aero lab. Sources and uncertainties are listed in Specs.' },
        ],
        'unavailableOptions': ['aerofuel', 'frontBottle', 'rearBottles', 'shield', 'rearDisc'],
        'discOption': False,
        'dimsOverlay': False,
    }
    # preset keys must be unique identifiers: use index-safe ids
    ids = {}
    for i, p in enumerate(presets):
        pid = re.sub(r'[^a-z0-9]+', '_', p['name'].lower()).strip('_')
        ids[pid or f'p{i}'] = p
    profile['presets'] = ids
    first_id = next(iter(ids))
    profile['defaultCfg']['preset'] = first_id

    out = OUT / f'viewer-{key}-studio.json'
    out.write_text(json.dumps(profile, indent=2, ensure_ascii=False) + '\n')
    print('wrote', out.relative_to(ROOT), '· presets:', ', '.join(ids))

print('done')