# Kona.m Product

## Positioning

Kona.m is a race-week, gear, identity, story and challenge companion for triathlon.

It should not attempt to replace:

- Strava's activity/social graph
- TrainingPeaks' training-analysis/planning depth
- IRONMAN's authoritative timing/event infrastructure
- Zwift's indoor training platform

Its differentiating layer is:

> **race identity + real/dream equipment + confirmed race history + race-week context + optional immersive 3D + collections + progression + shareable personal story**

## Consumer object

The primary consumer object is `RaceIdentity`.

A RaceIdentity combines:

- event
- real/dream/surprise mode
- equipment references
- goal
- avatar
- share state

## Core loop

`FAST ENTRY → IDENTITY → REWARD → HOME → DISCOVER → COLLECT / MASTER → SHARE → RETURN`

## First-session rule

Value precedes registration.

1. Understand what Kona.m is.
2. Continue as guest or choose the account path.
3. Build enough identity/setup to make the experience personal.
4. Reach Home quickly.
5. Discover or collect something real.
6. Optionally save/backup.
7. Optionally share.

Do not turn the first session into a questionnaire, account wall, 3D loading screen or product tutorial.

## Second-session rule

Returning users should see continuity, not onboarding again.

Prioritize:

- next useful action
- RaceIdentity/setup continuity
- race-week context
- progression
- new relevant content
- collection/challenge progress

## Product proposition

**Race the version of yourself.**

The promise is personal rather than transactional: build the athlete, understand the machine, know the place, discover the stories, and keep moving.

Kona.m should feel useful before it feels impressive.

## Launch language

English is the required initial language.

Additional locales belong behind complete runtime extraction, translated metadata and human QA rather than partial UI translation.

## 3D rule

3D is optional depth.

A user must be able to understand, personalize and navigate the core app without loading the immersive world. High-fidelity 3D is used where it creates meaning, product understanding or memorable discovery, not as a default rendering tax.

## About/company story

The public About surface is the full Field Guide plus company/project history. It may explain the origin through three depths:

- Short
- Scenic Route
- Unfiltered / ADHD

The story stays anonymous on the frontend. It can be personal in voice without identifying the builder by name.

Content authority:
- `content/company-history.json` owns the stable public history phases and principles.
- `promo.html` is the rich Field Guide surface.
- `about.html` is generated from `promo.html` by `tools/build_about_company.mjs`; do not maintain a second hand-edited copy.
- `tools/build_public_story.mjs` injects the machine-readable history and tutorial-film map into the Field Guide before hardening.

## Tutorial film rule

`content/tutorial-video-suite.json` defines the nine-part tutorial film map.

Tutorial films are optional depth, not first-session gates:

- value before tutorial
- no autoplay audio
- always skippable
- keep each film at or below 15 seconds unless there is a documented reason
- do not render a play control until the repository contains the verified binary asset
- company/origin films explain meaning; walkthrough films explain tasks; island films explain place/context

The first session must still work if every film fails to load.

## Launch decision rule

A pre-launch change must strengthen one of these:

- reliability, security or privacy
- state continuity
- first-use understanding
- mobile accessibility or performance
- factual/provenance accuracy
- architectural clarity without destabilizing runtime

Everything else is outside the launch surface.
