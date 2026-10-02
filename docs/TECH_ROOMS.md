# Tech Rooms Roadmap

Purpose: reusable technology showrooms/labs inside the triathlon world.

A Tech Room combines:
- product discovery;
- interactive 3D hardware;
- software/feature explanation;
- setup compatibility;
- maintenance/setup guidance;
- comparison;
- vendor/affiliate commerce;
- partner-demo capability.

It must not become a bespoke mini-app per brand.

## Prototype 01 — Zwift Lab / Marketplace

Status: roadmap / partner-demo concept
Production dependency: none
Trademark/endorsement status: unofficial concept unless Zwift explicitly partners.

### Why Zwift first

Zwift currently combines:
- Zwift Ride V2 Smart Frame;
- Zwift Ride with Wahoo KICKR CORE 2;
- Wahoo KICKR CORE 2 with Zwift Cog and Click;
- Zwift Cog/Click upgrade products;
- direct product sales and accessories;
- virtual shifting;
- handlebar controls/steering/navigation/PowerUps/Ride Ons;
- setup/fit content;
- a direct affiliate programme for hardware/accessories.

This makes it a strong test of the full product loop:
inspect -> understand -> compare -> configure -> maintain/setup -> buy.

### Room zones

1. **Ride V2**
   - frame geometry/adjustability;
   - crank lengths;
   - saddle adjustment;
   - handlebar/controller system;
   - multi-user fit story.

2. **Trainer Lab**
   - KICKR CORE 2;
   - resistance/gradient behaviour;
   - trainer interfaces;
   - Cog;
   - Click;
   - compatibility.

3. **Control / Virtual Shifting**
   - virtual gears;
   - steering;
   - menu/navigation control;
   - PowerUps;
   - Ride Ons;
   - controller interaction.

4. **Setup Builder**
   - Ride Smart Frame + compatible trainer;
   - outdoor bike + Zwift Ready trainer;
   - device/tablet/TV;
   - fan;
   - mat;
   - HR monitor;
   - accessories.

5. **Marketplace**
   - current Zwift store hardware/accessories;
   - official vendor links;
   - approved affiliate links only after acceptance;
   - prices are time-sensitive and must carry source/freshness metadata.

6. **Setup & Maintenance**
   - assembly guides;
   - fit;
   - firmware/pairing;
   - trainer setup;
   - Cog/Click;
   - accessory installation;
   - link back to current official Zwift/Wahoo support.

### Initial product objects

- zwift-ride-v2-smart-frame
- zwift-ride-kickr-core-2
- wahoo-kickr-core-2-zwift
- zwift-cog-click-upgrade
- zwift-ride-tablet-holder
- zwift-training-mat
- zwift-adjustable-crank-arms

Additional accessories stay data-driven.

### Feature objects

Software features should be separate from hardware so they can be reused across compatible products:
- virtual-shifting
- steering
- handlebar-control
- smart-resistance
- powerups
- ride-ons
- workout/training
- multi-platform-device-support

### Commerce

Zwift's official affiliate programme currently:
- is available for hardware/accessories in US, UK and EU;
- uses Impact;
- states 5% of basket value excluding tax on most Zwift-shop hardware/accessories;
- does not currently pay commission on memberships/subscriptions.

Do not store affiliate IDs/secrets in the public repo.
Until application approval, links remain ordinary official product/shop links.

### Partner pitch

The demo should answer:
"Imagine your entire hardware and software ecosystem as an explorable digital showroom inside a triathlon world."

Possible partner outcomes:
- official branded room;
- product education;
- hardware configuration;
- affiliate/commerce;
- product launches;
- creator/influencer activations;
- event expo room;
- partner embed.

## Reusable Tech Room schema

Every future Tech Room should be mostly data:
- brand/provider ID;
- products[];
- features[];
- stories[];
- compatibility rules;
- support/maintenance sources;
- offers[];
- room theme;
- disclosure/partnership status.

No brand-specific renderer unless a genuinely reusable interaction primitive is missing.

## Future Tech Rooms

Potential later categories:
- Garmin / Wahoo / COROS / Suunto wearables
- smart trainers
- power meters
- bike computers
- FORM goggles
- WHOOP/Oura recovery tech
- aero sensors
- environmental sensors
- race timing/tracker technology

Each should reuse the same product, story, maintenance, compatibility and commerce contracts.
