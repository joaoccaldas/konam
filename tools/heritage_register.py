#!/usr/bin/env python3
"""Write manifest + viewer profile for heritage exhibits from one reviewed data table.

Every spec line below is transcribed from the archived Canyon page named in `spec_page`.
Hashes are computed from the stored copies; run again after adding a source.
"""
import hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
WB = 'https://web.archive.org/web/'


def h(p):
    f = ROOT / p
    if f.exists():
        return hashlib.sha256(f.read_bytes()).hexdigest()
    return '0' * 64


COMMON_UNC = [
    "Lateral tube widths, stay spread and fork crown width are inferred; the photo fixes side-view shapes only.",
    "Components are simplified external forms rebuilt from the published specification; hidden mechanisms are not modelled.",
    "Graphics use DIN Condensed Bold in place of Canyon's lettering; positions and sizes traced from the photo.",
    "Cable routing is traced where visible; hidden runs are not modelled.",
]
PRESETS = [
    {"name": "Explore · Race Black", "colors": {"paint_frame": "#050506", "paint_accent": "#050506", "decal_light": "#d9d9d9", "decal_dark": "#d9d9d9"}},
    {"name": "Explore · Team White", "colors": {"paint_frame": "#e4e4e4", "paint_accent": "#050506", "decal_dark": "#0a0a0a", "decal_light": "#0a0a0a"}},
    {"name": "Explore · Pro White / red", "colors": {"paint_frame": "#eeeeee", "paint_accent": "#c8102e", "decal_dark": "#c8102e", "decal_light": "#c8102e"}},
    {"name": "Explore · Stealth", "colors": {"paint_frame": "#1b1d20", "paint_accent": "#0d0e10", "decal_dark": "#34373c", "decal_light": "#34373c"}},
]

BIKES = [
 dict(key='speedmax-three-2005', id='canyon-speedmax-three-my2005', model='Speedmax Three', family='Speedmax', name='Three · MY2005',
      exhibit='01', era='2002–2005', my=2005, launch=2004, size='53 (photo-identified)', finish='Race Black Metallic',
      master='speedmax_three_2005_master.blend', viewer='Speedmax_Three_2005_Museum.html',
      photo='assets/reference/heritage/photos/g2_speedmax_three_2005.jpg', photo_url=WB + '20050104010948/http://www.canyon.de:80/img/bikes/26_img_flash.jpg',
      spec_page='assets/reference/heritage/pages/spec_three_equip_2004.html', spec_url=WB + '20041230030216/http://www.canyon.de:80/triathlonbikes/ausstattung.html?b=26',
      extra_refs=[('assets/reference/heritage/pages/20041230025739_http___www.canyon.de_80_triathlonbikes_geometrie.html_b_26.html', WB + '20041230025739/http://www.canyon.de:80/triathlonbikes/geometrie.html?b=26', 'Geometry table (archived 2004-12-30)'),
                  ('assets/reference/heritage/pages/20021020115040_http___www.canyon.de_80_en_triat_info_2002.html.html', WB + '20021020115040/http://www.canyon.de:80/en/triat_info_2002.html', 'Identical 2002 triathlon geometry table')],
      lede="Canyon's pure triathlon machine of the mid-2000s: a black 7005 aluminium frame, full-carbon fork and a Carbotec disc as standard.",
      story="The Speedmax name dates back to 1999 (Speedmax 1000/2000/3000, sold by Rad Sport Arnold). By 2002 Canyon published a dedicated 28-inch triathlon geometry, the same table this Speedmax One/Two/Three range used until 2005. Triathlon Magazin gave the Three 23 of 25 points.",
      stats=[('8.75 kg', 'Canyon weight'), ('54 × 42', 'Chainrings'), ('Disc', 'Carbotec rear')],
      spec=[('Frame', 'New F5 Super Aero, 7005 Ultralight Aluminium'), ('Fork', 'Smolik Motivation full carbon'), ('Headset', 'Tange Integrated'),
            ('Drivetrain', 'Shimano Dura-Ace, bar-end shifters'), ('Brake levers', 'Syntace SpaceControl'), ('Brakes', 'Shimano Dura-Ace'),
            ('Wheels', 'Citec 3000 front · Carbotec disc rear (Citec hubs)'), ('Cassette', 'Shimano Dura-Ace 12-23'), ('Tyres', 'Continental GP3000'),
            ('Crankset', 'FSA CK-805TT Carbon Pro Team Issue 54/42'), ('Cockpit', 'Syntace F99 stem · Stratos 400 bar · C2 clip-on'),
            ('Saddle', 'Selle San Marco Aspide'), ('Seatpost', 'Iridium Carbon'), ('Colour', 'Race Black Metallic')],
      geometry=[('Head angle', '73° (size 53)'), ('Seat angle', '75°'), ('Top tube', '540 mm (53)'), ('Chainstay', '410 mm published · 398 mm measured'), ('Wheelbase', '989 mm (53)')],
      unc=["Single 626 px photograph: 3.36 mm per pixel, the lowest-resolution source in the museum.",
           "Tyre width is not published ('Continental GP3000'); 23-622 is inferred and sets the scale.",
           "Chainstay measures 398 mm against Canyon's published 410 mm; the BB was confirmed by a chainring circle fit, so the conflict is recorded, not adjusted.",
           "The 2002-2005 geometry table is identical across years; that the frame shape was unchanged before 2004 is not confirmed by a photo."]),
 dict(key='speedmax-2007', id='canyon-speedmax-3-0-my2007', model='SpeedMax 3.0', family='SpeedMax', name='3.0 · MY2007',
      exhibit='02', era='2006–2008', my=2007, launch=2006, size='53 (photo-identified)', finish='Race Black',
      master='speedmax_2007_master.blend', viewer='Speedmax_2007_Museum.html',
      photo='assets/reference/heritage/photos/g2_speedmax9_wallpaper.jpg', photo_url=WB + '20061207042845/http://www.canyon.com:80/flash/bike/images/speedmax-9/r-black/wallpaper.jpg',
      spec_page='assets/reference/heritage/pages/spec_sm30_equip_2007.html', spec_url=WB + '20070221004213/http://www.canyon.com:80/_en/triathlonbikes/equipment.html?b=26',
      extra_refs=[('assets/reference/heritage/pages/spec_sm30_geo_2007.html', WB + '20070221004203/http://www.canyon.com:80/_en/triathlonbikes/geometry.html?b=26', 'Geometry table (archived 2007-02-21)')],
      lede="The New MR3 frame: straighter, deeper 7005 tubes, a Super Aero seat tube and carbon rear stays, raced by Canyon's pros in black.",
      story="For 2006-2007 Canyon rebuilt the SpeedMax around the New MR3 frame while keeping the proven triathlon geometry. In 2007 team UNIBET's time-trial riders used a separate SpeedMax TT Pro with its own TT geometry; no photograph of that bike survives in the archive.",
      stats=[('9.10 kg', 'Canyon weight'), ('54 × 42', 'Chainrings'), ('Disc', 'Carbotec rear')],
      spec=[('Frame', 'New MR3, 7005 Ultralight Aluminium, SuperAero shape, Opti-Size tubeset'), ('Fork', 'Smolik Motivation'), ('Headset', 'Tange integrated'),
            ('Drivetrain', 'Shimano Dura-Ace, bar-end shifters'), ('Brake levers', 'Syntace SpaceControl'), ('Brakes', 'Shimano Dura-Ace'),
            ('Wheels', 'Mavic Cosmic Elite front · Carbotec disc rear (Citec hub)'), ('Cassette', 'Shimano Dura-Ace 11-23'),
            ('Tyres', 'Continental Grand Prix Triathlon 23-622'), ('Crankset', 'FSA Team Issue MegaExo TT 54/42'),
            ('Cockpit', 'Syntace F99 stem · Stratos 200 bar · SLS aerobar'), ('Saddle', 'Selle Italia SLR T1'), ('Seatpost', 'Iridium Carbon Aero'), ('Colour', 'Race Black')],
      geometry=[('Head angle', '73° (size 53)'), ('Seat angle', '75°'), ('Top tube', '540 mm (53)'), ('Chainstay', '410 mm published · 405 mm measured'), ('Wheelbase', '989 mm (53) · 987 mm measured')],
      unc=["The photographed disc reads CITEC; the specification lists a Carbotec disc on a Citec hub. Both are recorded.",
           "Stays cross the grey disc wheel in the photo; their edges were read by eye from 1:1 crops.",
           "Head tube partly hidden by cable housings; its depth was set from the registered photo difference."]),
 dict(key='speedmax-al-2011', id='canyon-speedmax-al-9-my2011', model='Speedmax AL 9.0', family='Speedmax AL', name='9.0 · MY2011',
      exhibit='03', era='2009–2013', my=2011, launch=2010, size='M (photo; S not excluded)', finish='Team (white / black)',
      master='speedmax_al_2011_master.blend', viewer='Speedmax_AL_2011_Museum.html',
      photo='assets/reference/heritage/photos/g4_al9_team.jpg', photo_url=WB + '20101030155050/http://canyon.com/flash_2009/bike/images/bikes/speedmax-al-9/team/bike.jpg',
      spec_page='assets/reference/heritage/pages/spec_bike_2128.html', spec_url=WB + '20101023160922/http://www.canyon.com:80/_en/triathlonbikes/bike.html?b=2128',
      extra_refs=[('assets/reference/heritage/pages/20081201050505_http___www.canyon.com_80__en_triathlonbikes_series_speedmax_al.html.html', WB + '20081201050505/http://www.canyon.com:80/_en/triathlonbikes/series/speedmax_al.html', 'Series launch copy (archived 2008-12-01)')],
      lede="The aluminium Speedmax: Canyon's aero-era geometry and carbon fork on a 7005 alloy frame, at a fraction of the carbon bike's price.",
      story="Launched alongside the first carbon Speedmax at Eurobike 2008, the Speedmax AL carried the same adjustable-seat-angle geometry (75° or 78°) and sliding dropouts (380-395 mm chainstays) in 7005 aluminium with an AeroShape tubeset. It stayed in the range until MY2013.",
      stats=[('8.90 kg', 'Canyon weight'), ('53 × 39', 'Chainrings'), ('23-622', 'Tyres')],
      spec=[('Frame', 'Canyon New F8 Technology · 7005 Ultralight Aluminium, AeroShape, multi-butted'), ('Fork', 'Canyon Aero Fork CF'),
            ('Groupset', 'SRAM Force · SL 1090 R2C Aero shifters · SRAM TT Carbon levers'), ('Brakes', 'SRAM Force'), ('Wheels', 'Mavic Cosmic Elite'),
            ('Tyres', 'Continental Grand Prix 4000 S 23-622'), ('Crankset', 'FSA Vision TriMax Carbon 53/39'), ('Cassette', 'SRAM PG 1050 11-26'),
            ('Cockpit', 'Profile Aris stem · Profile T2 base bar / T2 Wing'), ('Seatpost', 'Canyon Aero Post CF'), ('Saddle', 'Selle Italia SL Kit Carbonio')],
      geometry=[('Head angle', '72.5°'), ('Seat angle', '75° (78° position)'), ('Chainstay', '380–395 mm (sliding) · 383 mm measured'), ('Wheelbase', '995–1010 mm (M) · 980–995 mm (S) · 992 mm measured'), ('Stack / reach', '518 / 430 mm (M)')],
      unc=["Single 740 px side photograph: 2.49 mm per pixel.", "Front tyre images 1.7% larger than the rear (studio perspective); scale uses their average.",
           "Frame size: wheelbase fits S (980-995 mm) and stack fits M; recorded as M with S not excluded."]),
 dict(key='speedmax-cf-2011', id='canyon-speedmax-cf-9-pro-my2011', model='Speedmax CF 9.0 Pro', family='Speedmax CF', name='9.0 Pro · MY2011',
      exhibit='04', era='2009–2012', my=2011, launch=2010, size='S (photo-identified)', finish='Team (white / carbon black)',
      master='speedmax_cf_2011_master.blend', viewer='Speedmax_CF_2011_Museum.html',
      photo='assets/reference/heritage/photos/g5_cf9pro_team.jpg', photo_url=WB + '20101031010716/http://canyon.com/flash_2009/bike/images/bikes/speedmax-cf-9-pro/team/bike.jpg',
      spec_page='assets/reference/heritage/pages/spec_bike_2131.html', spec_url=WB + '20101023160932/http://www.canyon.com:80/_en/triathlonbikes/bike.html?b=2131',
      extra_refs=[('assets/reference/heritage/pages/20081201050518_http___www.canyon.com_80__en_triathlonbikes_series_speedmax_cf.html.html', WB + '20081201050518/http://www.canyon.com:80/_en/triathlonbikes/series/speedmax_cf.html', 'Series launch copy (archived 2008-12-01)')],
      lede="Canyon's first carbon Speedmax: a seat tube that wraps the rear wheel, a deep carbon down tube and a 7.7 kg race build on Zipp.",
      story="Shown at Eurobike 2008 with the aluminium AL, the Speedmax CF brought Canyon's triathlon bike into carbon: Aero-Shape frame, aerodynamic fork, super-aero seat tube and an adjustable aero seatpost. It was replaced by the all-new Speedmax CF, previewed as Concept Speedmax at Eurobike 2011.",
      stats=[('7.70 kg', 'Canyon weight'), ('53 × 39', 'Chainrings'), ('404 / 808', 'Zipp depths')],
      spec=[('Frame', 'Canyon New F10 Technology TT, carbon'), ('Fork', 'Canyon Aero Fork CF'), ('Headset', 'Tange IS-22 SCT'),
            ('Groupset', 'SRAM Red rear / Force front · SL 1090 R2C Aero shifters · TT Carbon levers'), ('Brakes', 'SRAM Red'),
            ('Wheels', 'Zipp 404 / 808 Tubular'), ('Tyres', 'Continental Competition 22-622 tubular'), ('Crankset', 'Zipp VumaChrono 53/39'),
            ('Cassette', 'SRAM OG 1090 11-26'), ('Cockpit', 'Syntace F109 stem · Zipp VukaBull'), ('Seatpost', 'Canyon Aero Post CF'), ('Saddle', 'Selle Italia SLR T1')],
      geometry=[('Head angle', '72.5°'), ('Seat angle', '75° (78° position)'), ('Chainstay', '380–395 mm (sliding)'), ('Wheelbase', '970–985 mm (S) · 988 mm measured'), ('Stack / reach', '506 / 409 mm (S)')],
      unc=["Single 740 px side photograph: 2.48 mm per pixel; front tyre images 2.4% larger than the rear.",
           "BB junction is hidden behind the VumaChrono crank disc; its depth is inferred.",
           "Seat tube edges were measured row by row because white rim lettering merges with the white paint.",
           "Zipp rim graphics are not modelled."]),
]


def main():
    for b in BIKES:
        refs = [{'path': b['photo'], 'url': b['photo_url'], 'role': 'Canyon studio side photograph; sole shape source', 'sha256': h(b['photo'])},
                {'path': b['spec_page'], 'url': b['spec_url'], 'role': 'Canyon specification page (archived)', 'sha256': h(b['spec_page'])}]
        refs += [{'path': p, 'url': u, 'role': r, 'sha256': h(p)} for p, u, r in b['extra_refs']]
        prof = json.loads((ROOT / f"blender/heritage/{b['key']}/profile.json").read_text())
        cal = prof.get('calibration', {})
        mm_px = cal.get('mm_per_px', 2.5)
        wb_mm = cal.get('measured_wheelbase_mm', 990)
        unc = [f"Scale {mm_px:.3f} mm per pixel from tyre fits; measured wheelbase {wb_mm} mm."] + b['unc'] + COMMON_UNC
        man = {'schema_version': 1, 'id': b['id'], 'brand': 'Canyon', 'model': b['model'], 'model_year': b['my'], 'launch_year': b['launch'],
               'generation': b['era'], 'size': b['size'], 'finish': b['finish'], 'status': 'reference-study',
               'coordinate_system': {'unit': 'metre', 'forward': '+X', 'up': '+Z', 'drive_side': '-Y'},
               'reconstruction_adapter': f"heritage-{b['key']}-photo-v1",
               'pipeline': {'adapter_module': 'blender/heritage_build.py', 'profile': f"blender/heritage/{b['key']}/profile.json", 'out_dir': f"assets/heritage/{b['key']}"},
               'references': refs, 'uncertainties': unc,
               'deliverables': {'bike': f"assets/heritage/{b['key']}/{b['master']}", 'scene': f"assets/heritage/{b['key']}/speedmax_museum.blend",
                                'glb': f"assets/heritage/{b['key']}/speedmax_web.glb", 'viewer': b['viewer']},
               'validation': {'geometry': f"assets/heritage/{b['key']}/checks/geometry-checks.json", 'silhouette': f"assets/heritage/{b['key']}/checks/silhouette-report.json",
                              'renders': ['hero', 'side', 'cockpit', 'drivetrain', 'rear']},
               'viewer_profile': f"museum/viewer-{b['key']}.json"}
        (ROOT / f"museum/bikes/{b['id']}.json").write_text(json.dumps(man, indent=2))
        vp = {'schema_version': 1, 'bike': {
            'key': b['key'], 'exhibit': b['exhibit'], 'era': b['era'], 'family': b['family'], 'name': b['name'], 'years': f"MY{b['my']}",
            'size': b['size'].split(' ')[0], 'finishName': b['finish'], 'pageTitle': f"Canyon Museum — {b['model']} ({b['my']})",
            'lede': b['lede'], 'story': b['story'], 'stats': [{'value': v, 'label': l} for v, l in b['stats']],
            'spec': [list(r) for r in b['spec']], 'geometry': [list(r) for r in b['geometry']],
            'method': "Scale comes from circle fits to both tyres in Canyon's archived side photo. Every tube is a traced centreline with its side-view depth measured from the photo; widths across the bike are inferred. Parts are rebuilt from the archived specification.",
            'uncertainties': unc,
            'sources': [{'label': 'Canyon specification page (archived)', 'url': b['spec_url']}, {'label': 'Canyon studio photograph', 'url': b['photo_url']}] +
                       [{'label': r, 'url': u} for _, u, r in b['extra_refs']]},
            'presets': PRESETS,
            'partLabels': {'base_bar': 'Base bar', 'extensions': 'Clip-on extensions', 'cables': 'Cable housings'}}
        (ROOT / f"museum/viewer-{b['key']}.json").write_text(json.dumps(vp, indent=2, ensure_ascii=False))
        print('registered', b['id'])


if __name__ == '__main__':
    main()
