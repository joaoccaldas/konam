# Story / Experience Contract V1

A Story is a transport-neutral sequence of sourced beats that can be rendered as a museum walk, product page, athlete feature, science explainer, event replay, social sequence, partner embed, or future agent-generated experience.

## Why

The platform should not implement:
- a special Canyon story renderer;
- a different athlete-story renderer;
- another science-story renderer;
- another sponsor-campaign renderer.

They are compositions of the same primitives.

## Story types

- product
- athlete
- science
- race
- history
- place
- campaign

## Beat primitives

- reveal
- inspect
- compare
- explain
- timeline
- location
- data
- choice
- cta

A surface may render them differently. A 3D museum can turn `inspect` into a spatial interaction; an embed can turn it into a product viewer; MCP can expose the underlying structured beat.

## Evidence

Each story and individual beat can carry source records. Assertions should remain tied to the source/evidence layer rather than becoming untraceable prose embedded in UI code.

## Sponsorship

Sponsored experiences require explicit disclosure metadata and an editorial-independence flag. A sponsor does not silently convert editorial content into advertising.

## Scale rule

A new story should mainly be:
- stable entity references;
- ordered beats;
- source records;
- optional scene references.

It should not require a new renderer unless it introduces a genuinely new reusable interaction primitive.
