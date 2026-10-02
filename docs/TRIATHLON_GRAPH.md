# Triathlon Knowledge Graph V0

This graph is the shared semantic layer beneath Museum, Kona, Race Setup, science stories, MCP, partner embeds and future commerce.

## Why it exists

A product should be modelled once and reused everywhere.

Example:

`canyon-speedmax-cfr`

can participate in:
- a museum exhibit;
- a Kona history story;
- a Race Setup;
- a science explainer;
- a share card;
- an MCP response;
- a partner embed;
- a commerce offer.

The graph stores relationships rather than duplicating the object for every surface.

## Node kinds

Current V0 kinds:
- brand
- product
- athlete
- event
- course
- place
- result
- story
- research
- collection
- race_setup
- experience
- sponsor
- commerce_offer
- media

## Relationship examples

- product `manufactured_by` brand
- product `raced_by` athlete
- product `appeared_at` event
- result `used_in` event
- product `configured_for` course
- product `explained_by` research
- athlete `featured_in` story
- experience `sponsored_by` sponsor
- product `available_via` commerce_offer
- place `part_of` event
- race_setup `contains` product

## Evidence

Edges may be marked:
- published
- reference-calibrated
- inferred
- generated
- provisional

An inferred or provisional relationship must never be presented as verified fact.

## Scale rule

Adding a new product should prefer:
1. create/update one canonical product node;
2. attach sourced relationships;
3. expose it through capabilities;
4. let surfaces consume it.

Do not create a separate product record for Museum, Setup, MCP, SEO and commerce.

## Privacy

Private/local user state is not inserted into the public graph by default.

A local RaceSetup may reference public product IDs, but the user's private setup remains local unless explicitly shared.
