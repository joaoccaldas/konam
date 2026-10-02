export const PROFILE=globalThis.__BIKE_PROFILE||{};
// Spec data: Canyon.com product page 4524 (Speedmax CFR AXS, MY2027, read 2026-09-27).
// Weights are the manufacturer's listed component weights where published.

export const BIKE = {
  name: 'Speedmax CFR AXS', year: '2027', size: 'M', weight: 9.1, price: 'from 125 000 SEK',
  claim: "Canyon's fastest and most adjustable triathlon bike yet",...PROFILE.bike,
};
// Gear/rims defaults: keep the CFR/SLX behaviour when the profile omits them.
if (BIKE.gear === undefined) BIKE.gear = `${BIKE.chainring}/${BIKE.key==='slx'?'36':'37'}`;
if (BIKE.gearSub === undefined) BIKE.gearSub = (BIKE.key==='slx' ? '11–30' : '10–33') + ' · 12 sp';
if (BIKE.rims === undefined) BIKE.rims = BIKE.key==='slx' ? '65/85' : '85';
export const GEOMETRY = {
  sizes: ['S', 'M', 'L', 'XL'],
  rows: [
    ['Rider height (cm)', '≤178', '168–186', '180–196', '≥189'],
    ['Saddle height (mm)', '640–740', '708–838', '745–875', '780–910'],
    ['Seat tube', 480, 513, 550, 585],
    ['Top tube', 516, 537, 565, 593],
    ['Head tube', 62, 73, 105, 137],
    ['Head angle', '73°', '73°', '73°', '73°'],
    ['Seat angle', '81°', '81°', '81°', '81°'],
    ['Chainstay', 420, 420, 420, 420],
    ['Wheelbase', 989, 1013, 1046, 1078],
    ['Stack', 470, 481, 511, 542],
    ['Reach', 419, 440, 463, 486],
    ['Standover', 759, 780, 814, 846],
    ['BB drop', 75, 75, 75, 72],
    ['Crank length', 165, 165, 165, 165],
  ],
  ...PROFILE.geometry,
};
if (PROFILE.geometry && PROFILE.geometryNote) GEOMETRY.note = PROFILE.geometryNote;

// group: frame | cockpit | hydration | drivetrain | wheels | brakes | contact
export const PARTS = {
  frame: { name: 'Speedmax CFR frame', group: 'frame', weight: 1360, spec: 'CFR carbon · 12×142 mm thru-axle · 28 mm tyre clearance · UDH', note: 'Traced from the official side profile and pinned to the published size-M stack/reach, head & seat angles, chainstay and wheelbase.' },
  frame_decals: { alias: 'frame' },
  toptube_storage_lid: { name: 'Top-tube storage lid', group: 'hydration', spec: 'Integrated AeroFuel storage cover', note: 'Part of the modular AeroFuel storage system.' },
  fork: { name: 'Speedmax fork', group: 'frame', weight: 654, spec: 'Carbon · 12×100 mm · 1 1/8" steerer · 28 mm clearance', note: 'Wide-stance crown that continues the head-tube fairing.' },
  fork_decals: { alias: 'fork' },
  riser: { name: 'CP0054 riser', group: 'cockpit', spec: 'Canyon Cockpit CP0054 · carbon', note: 'Single aero riser that sets pad stack for the AeroID fit system.' },
  basebar: { name: 'CP0054 base bar', group: 'cockpit', spec: 'Carbon aero base bar', note: 'Wing profile sweeping forward into the brake hoods.' },
  brake_lever_left: { name: 'SRAM Red Aero brake lever (L)', group: 'brakes', weight: 264, spec: 'Hydraulic · 2-piston · AXS', note: '' },
  brake_lever_right: { name: 'SRAM Red Aero brake lever (R)', group: 'brakes', weight: 268, spec: 'Hydraulic · 2-piston · AXS', note: '' },
  aeroshield: { name: 'Canyon AeroShield', group: 'cockpit', spec: 'Closed-cockpit arm cocoon · size-specific arm cups', note: 'Seals the gap between the forearms, one of the biggest drag sources on a tri bike.' },
  aeroshield_decals: { alias: 'aeroshield' },
  arm_pads: { name: 'Arm pads', group: 'contact', spec: 'Size-specific pads', note: '' },
  extensions: { name: 'Extension grips', group: 'cockpit', spec: 'Ski-bend extensions, integrated in AeroShield', note: '' },
  axs_blips: { name: 'AXS Wireless Blips', group: 'drivetrain', weight: 520, spec: 'Wireless shift buttons on the extension tips', note: 'Listed weight includes the full shifting set.' },
  aerofuel_front: { name: 'AeroFuel front module', group: 'hydration', spec: 'Between-the-arms bottle bay', note: 'Modular hydration and nutrition storage.' },
  bottle_front: { name: 'Front bottle', group: 'hydration', spec: 'Horizontal between-the-arms bottle', note: '' },
  seatpost: { name: 'Splitter Plate Pro seatpost', group: 'contact', weight: 210, spec: 'Carbon · integrated rear hydration wing', note: 'The rear wing carries the twin bottle cages behind the saddle.' },
  seatpost_decals: { alias: 'seatpost' },
  bottle_cages_rear: { name: 'Rear bottle cages', group: 'hydration', spec: 'Twin cages on the Splitter Plate', note: '' },
  bottles_rear: { name: 'Rear bottles ×2', group: 'hydration', spec: 'Twin bottles behind the saddle', note: '' },
  saddle: { name: 'Fizik Transiro Aeris LD R1', group: 'contact', weight: 187, spec: 'Carbon rails · triathlon nose', note: '' },
  wheel_front: { name: 'DT Swiss ARC 1100 front', group: 'wheels', weight: 786, spec: '85 mm carbon rim · 22 mm internal · 12×100 · Center Lock', note: '' },
  wheel_rear: { name: 'DT Swiss ARC 1100 CSX rear', group: 'wheels', spec: '85 mm carbon rim · 12×142 · SRAM XDR · Center Lock', note: '' },
  tyre_front: { name: 'Continental Aero 111', group: 'wheels', weight: 246, spec: '26 mm · front-specific aero tread', note: '' },
  tyre_rear: { name: 'Continental GP5000 TT TR', group: 'wheels', weight: 245, spec: '28 mm · tubeless ready', note: '' },
  rim_front: { name: 'ARC 1100 rim (front)', group: 'wheels', spec: '85 mm deep · 22 mm internal', note: '' },
  rim_rear: { name: 'ARC 1100 rim (rear)', group: 'wheels', spec: '85 mm deep · 22 mm internal', note: '' },
  hub_front: { name: 'DT Swiss 180 hub (front)', group: 'wheels', spec: '12×100 · Center Lock', note: '' },
  hub_rear: { name: 'DT Swiss 180 hub (rear)', group: 'wheels', spec: '12×142 · XDR · Ratchet EXP', note: '' },
  spokes_front: { name: 'Bladed spokes ×20', group: 'wheels', spec: 'Straight-pull aero spokes', note: '' },
  spokes_rear: { name: 'Bladed spokes ×24', group: 'wheels', spec: 'Straight-pull aero spokes', note: '' },
  rotor_front: { name: 'SRAM Paceline X 160', group: 'brakes', weight: 129, spec: '160 mm · Center Lock', note: '' },
  rotor_rear: { name: 'SRAM Paceline X 140', group: 'brakes', weight: 110, spec: '140 mm · Center Lock', note: '' },
  caliper_front: { name: 'SRAM Red caliper (front)', group: 'brakes', spec: 'Flat mount · 2-piston', note: '' },
  caliper_rear: { name: 'SRAM Red caliper (rear)', group: 'brakes', spec: 'Flat mount · 2-piston', note: '' },
  cassette: { name: 'SRAM Red XG-1290', group: 'drivetrain', spec: '12-speed · 10–33 T', note: '10-11-12-13-14-15-17-19-21-24-28-33' },
  chain: { name: 'SRAM Red Flattop chain', group: 'drivetrain', spec: '12-speed Flattop', note: 'Animated link by link along the real 50×14 route.' },
  crankset: { name: 'SRAM Red AXS power meter crank', group: 'drivetrain', spec: '165 mm · 50/37 T · dual-sided power', note: '' },
  chainrings: { name: 'Chainrings 50/37', group: 'drivetrain', spec: 'One-piece rings on power spider', note: '' },
  powermeter_spider: { name: 'Power meter spider', group: 'drivetrain', spec: 'Dual-sided SRAM power · status LED', note: '' },
  crank_arm_ds: { name: 'Crank arm (drive side)', group: 'drivetrain', spec: '165 mm hollow carbon', note: '' },
  crank_arm_nds: { name: 'Crank arm (non-drive)', group: 'drivetrain', spec: '165 mm hollow carbon', note: '' },
  spindle: { name: 'DUB spindle', group: 'drivetrain', spec: '28.99 mm', note: '' },
  bottom_bracket: { name: 'SRAM DUB Pressfit', group: 'drivetrain', weight: 67, spec: 'PF 86.5', note: '' },
  front_derailleur: { name: 'SRAM Red AXS front derailleur', group: 'drivetrain', weight: 147, spec: 'Braze-on · wireless', note: '' },
  rear_derailleur: { name: 'SRAM Red AXS rear derailleur', group: 'drivetrain', weight: 264, spec: 'UDH direct mount · wireless', note: '' },
  udh_hanger: { name: 'UDH interface', group: 'frame', spec: 'Universal Derailleur Hanger', note: '' },
  thru_axle_front: { name: 'DT Swiss thru-axle (front)', group: 'wheels', spec: '12×100 with lever', note: '' },
  thru_axle_rear: { name: 'DT Swiss thru-axle (rear)', group: 'wheels', spec: '12×142 with lever', note: '' },
};

if (PROFILE.partsReplace) { for (const k of Object.keys(PARTS)) delete PARTS[k]; }   // heritage: its own archived parts list only
for(const [id,p] of Object.entries(PROFILE.parts||{}))PARTS[id]=PROFILE.partsReplace?{...p}:{...PARTS[id],...p};

export const GROUPS = {
  frame: 'Frame & fork', cockpit: 'Cockpit', hydration: 'AeroFuel', drivetrain: 'Drivetrain', wheels: 'Wheels',
  brakes: 'Brakes', contact: 'Contact points',
};

// Colourways. 'Pro White' matches the reference photography; the others are configurator ideas.
export const PRESETS = {
  aurora: { name: 'Pro White', sub: 'Official reference colour', frame: '#eceaf0', finish: 'gloss', irid: 0, decal: '#111114', cockpit: 'carbon', rimText: '#d9d9d9' },
  stealth: { name: 'Stealth', sub: 'Matte black, gloss logos', frame: '#141416', finish: 'matte', irid: 0, decal: '#050506', cockpit: 'carbon', rimText: '#2a2a2c' },
  glacier: { name: 'Glacier', sub: 'Satin white, ice logos', frame: '#f4f6f8', finish: 'satin', irid: .25, decal: '#9fb7c6', cockpit: 'carbon', rimText: '#e8eef2' },
  kona: { name: 'Kona Lava', sub: 'Race-day orange', frame: '#e8471c', finish: 'gloss', irid: .15, decal: '#101012', cockpit: 'carbon', rimText: '#f0f0f0' },
  deep: { name: 'Deep Ocean', sub: 'Metallic navy', frame: '#15254a', finish: 'gloss', irid: .45, decal: '#e9ecef', cockpit: 'carbon', rimText: '#cfd8e6' },
  moss: { name: 'Moss', sub: 'Satin olive', frame: '#4c5a3f', finish: 'satin', irid: .1, decal: '#e8e3d4', cockpit: 'carbon', rimText: '#d8d2bd' },
  wyld: { name: 'Wyld', sub: 'Hand-dyed pink × aqua', frame: '#ff8fbf', finish: 'gloss', irid: 0, decal: '#141416', cockpit: 'carbon', rimText: '#e9cde8', wyld: true },
  ...(PROFILE.presets || {}),
};

if(PROFILE.bike?.key==='slx')Object.assign(PRESETS.aurora,{name:'Light Lavender',frame:'#cdc8dd',decal:'#ffffff',finish:'satin'});

export const SWATCHES = ['#eceaf0', '#f4f6f8', '#141416', '#3a3d42', '#9aa3ad', '#e8471c', '#d9ff3f', '#1d6bff', '#15254a', '#4c5a3f', '#b0122e', '#f2c14e'];
export const DECALS = ['#111114', '#f4f4f4', '#9fb7c6', '#e8471c', '#d9ff3f', '#c9a24a'];

export const VIEWS = {
  hero: { p: [1.95, 1.12, 3.05], t: [0.08, 0.55, 0], label: 'Hero' },
  exploded: { p: [2.35, 1.55, 3.95], t: [0.08, 0.78, 0], label: 'Exploded' },
  side: { p: [0.09, 0.6, 3.6], t: [0.09, 0.58, 0], label: 'Side' },
  nds: { p: [0.09, 0.6, -3.6], t: [0.09, 0.58, 0], label: 'Non-drive' },
  front: { p: [2.9, 0.95, 0.75], t: [0.2, 0.6, 0], label: 'Front' },
  cockpit: { p: [1.15, 1.4, 0.95], t: [0.5, 0.92, 0], label: 'Cockpit' },
  drivetrain: { p: [-0.05, 0.62, 1.6], t: [-0.18, 0.38, 0], label: 'Drivetrain' },
  top: { p: [0.1, 3.4, 0.01], t: [0.1, 0.5, 0], label: 'Top' },
};
