# Progressive shell policy v1

Status: foundation only. No live navigation change in this PR.

## Why

Kona.m already has five canonical destinations: Home, Discover, Garage, Plan and Me. The product direction does not require replacing those routes. It requires revealing them when they become meaningful.

The persistent shell therefore uses a pure state policy rather than hardcoded feature flags.

## Rules

- Home is always visible.
- Me appears when RaceIdentity exists.
- Garage appears when canonical equipment exists.
- Plan appears when race context exists.
- Discover appears after meaningful world exploration or progression beyond Level 1.
- Admin inspection may expose all five.
- Hidden navigation does **not** disable routes. Home cards, deep links, direct accessibility routes and explicit actions remain valid.

## Safety

Progressive disclosure must never hide:
- privacy, consent, safety or error information;
- a route required to complete an in-progress task;
- essential race information;
- non-3D alternatives to spatial content.

## Next integration

After the Race Week convergence PR is merged, wire `navigationForState(readGameState())` into `ui/kona-shell.js`, subscribe/recompute after canonical state-changing actions, and remove automatic first-run tour presentation while retaining manual replay under Help/User Studio.
