# Mobile World Navigation V1

## Default

Phone/tablet enters the 3D world in **elevated third-person / orbit** mode.

A simple semi-transparent humanoid placeholder represents the visitor.

Future roadmap:
- avatar chosen/generated from RaceIdentity
- equipment from UserEquipment/RaceSetup
- accessibility-safe avatar alternatives
- no face upload required

## Familiar mobile gestures

- one-finger drag: orbit camera around avatar / adjust view
- pinch: zoom
- tap ground / destination: move toward point
- tap object: select / Inspect when actionable
- two-finger rotate: optional fine heading control
- visible recenter button: return camera behind/above avatar
- camera-mode button: Third person / First person

First person is optional, never required for the core museum journey.

## Movement

Tap-to-move is primary for casual mobile exploration.
A small virtual stick may remain as an advanced/direct-control option, but it must not be the only understandable way to move.

## Accessibility / deterministic access

Every object reachable through proximity must also be reachable through:
- Discover/list
- Map/navigation
- direct deep link where supported

Proximity suggests. It never gates essential content.

## Camera defaults

Phone:
- elevated third person
- target: avatar upper torso / world ahead
- moderate follow smoothing
- collision-safe zoom bounds

Desktop:
- existing free-walk remains available
- third-person/orbit can be selected

## Acceptance

- fresh mobile world entry is not first-person
- placeholder avatar visible
- drag/pinch/tap work without tutorial dependency
- first-person toggle exists
- recenter exists
- no essential action requires joystick precision
- avatar renderer consumes a stable AvatarProfile contract so placeholder can later be replaced without camera rewrite
