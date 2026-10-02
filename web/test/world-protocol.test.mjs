import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_PROTOCOL_VERSION,
  assertWorldManifest,
  createAnonymousPassport,
  createPortalTransition,
  createWorldEvent,
  validatePassport,
} from '../src/world/protocol.mjs';

test('world manifest is explicit and versioned', () => {
  const manifest = assertWorldManifest({
    worldId: 'world:canyonmuseum',
    version: '0.1.0',
    protocolVersion: WORLD_PROTOCOL_VERSION,
    entryPoints: ['spawn:main'],
  });
  assert.equal(manifest.worldId, 'world:canyonmuseum');
});

test('anonymous passport contains no personal profile fields', () => {
  const p = createAnonymousPassport({
    playerId: 'player:local_7f4k91',
    originWorld: 'world:canyonmuseum',
    createdAt: '2026-09-29T08:30:00.000Z',
  });
  validatePassport(p);
  assert.deepEqual(p.visitedWorlds, ['world:canyonmuseum']);
  for (const forbidden of ['name', 'email', 'phone', 'address', 'birthdate', 'location']) {
    assert.ok(!(forbidden in p), forbidden);
  }
});

test('events use stable cross-world entity ids', () => {
  const event = createWorldEvent({
    worldId: 'world:canyonmuseum',
    type: 'discovery:found',
    entityId: 'bike:canyon:speedmax:cfr:2027',
    metadata: { source: 'kona-champions-room' },
    occurredAt: '2026-09-29T08:31:00.000Z',
  });
  assert.equal(event.entityId, 'bike:canyon:speedmax:cfr:2027');
});

test('portal transition is data, never an arbitrary URL', () => {
  const transition = createPortalTransition({
    fromWorld: 'world:canyonmuseum',
    portalId: 'portal:eclipse',
    targetWorld: 'world:konaworld',
    spawnId: 'spawn:canyon-arrival',
  });
  assert.equal(transition.targetWorld, 'world:konaworld');
  assert.ok(!('url' in transition));
});

test('invalid ids and protocol versions fail closed', () => {
  assert.throws(() => assertWorldManifest({
    worldId: 'https://evil.example',
    version: '0.1.0',
    protocolVersion: WORLD_PROTOCOL_VERSION,
  }));
  assert.throws(() => assertWorldManifest({
    worldId: 'world:canyonmuseum',
    version: '0.1.0',
    protocolVersion: '99.0.0',
  }));
});
