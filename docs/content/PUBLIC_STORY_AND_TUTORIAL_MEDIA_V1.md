# Kona.m public story and tutorial media contract

## Purpose

This contract keeps the company/project history, public About page, Field Guide and tutorial films from drifting into four different stories.

## Authorities

- `content/company-history.json`: stable history phases, public principles and anonymous-front-end rule.
- `content/tutorial-video-suite.json`: nine-part film map, durations, source filenames and intended use.
- `promo.html`: rich Field Guide presentation surface.
- `about.html`: generated alias of the Field Guide, with About-specific metadata.
- `tools/build_public_story.mjs`: injects history + film map into the Field Guide.
- `tools/build_about_company.mjs`: derives About from the same content surface.

## Public history

The project history is told as phases rather than invented corporate mythology:

`training → Excel → AI + bikes → CanyonMuseum proof-of-concept → Kona.m → world / 141 → shared contracts → finished enough to let you in`

CanyonMuseum is described as a working proof-of-concept, not a brand partnership. Kona.m is the broader product identity.

## Tutorial films

The nine films are grouped into:

1. Brand & origin: Arrival, Machines, Race Self.
2. Real app walkthroughs: First Entry, Race Self + Home, Garage + optional sync.
3. Island / Field Guide / telemetry: Spatial Rooms, Field Guide + Passport, Hawi / Telemetry.

Source MP4s supplied in the current production package:
- `kona_intro_05_step_auth_avatar.mp4`
- `kona_intro_07_course_crucible.mp4`
- `kona_intro_08_field_guide_passport.mp4`
- `kona_intro_09_telemetry_cockpit.mp4`

Those binary files are not considered published web assets until they exist under the repository-controlled tutorial asset path and pass normal staging/security checks.

## Onboarding boundary

The films may help onboarding, but onboarding must never wait for them. A user must still be able to enter, understand the core proposition, create enough identity to personalize the app, reach Home, and discover something useful without playing a video.

## Truth and privacy

- No local `file://` paths in public HTML.
- No personal builder identity is required on the public frontend.
- Referenced athletes, events and brands do not imply endorsement or partnership.
- Historical claims should remain tied to repository evidence/provenance where they become specific.
