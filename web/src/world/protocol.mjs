const ID_RE = /^[a-z0-9][a-z0-9:_-]{1,95}$/;

export const WORLD_PROTOCOL_VERSION = '0.1.0';

export function assertStableId(value, label = 'id') {
  if (typeof value !== 'string' || !ID_RE.test(value)) {
    throw new TypeError(`${label} must be a stable lowercase id (2-96 chars)`);
  }
  return value;
}

export function assertWorldManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new TypeError('world manifest must be an object');
  }
  assertStableId(manifest.worldId, 'worldId');
  if (typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    throw new TypeError('world version must be semver-like');
  }
  if (manifest.protocolVersion !== WORLD_PROTOCOL_VERSION) {
    throw new TypeError(`unsupported protocol version: ${manifest.protocolVersion}`);
  }
  if (manifest.entryPoints && !Array.isArray(manifest.entryPoints)) {
    throw new TypeError('entryPoints must be an array');
  }
  return Object.freeze({ ...manifest });
}

export function createAnonymousPassport({ playerId, originWorld, createdAt = new Date().toISOString() }) {
  assertStableId(playerId, 'playerId');
  assertStableId(originWorld, 'originWorld');
  return {
    schemaVersion: 1,
    playerId,
    originWorld,
    createdAt,
    visitedWorlds: [originWorld],
    discoveries: [],
    achievements: [],
    inventory: [],
    portalHistory: [],
  };
}

export function validatePassport(passport) {
  if (!passport || passport.schemaVersion !== 1) throw new TypeError('unsupported passport');
  assertStableId(passport.playerId, 'playerId');
  assertStableId(passport.originWorld, 'originWorld');
  for (const key of ['visitedWorlds', 'discoveries', 'achievements', 'inventory', 'portalHistory']) {
    if (!Array.isArray(passport[key])) throw new TypeError(`${key} must be an array`);
  }
  return passport;
}

export function createWorldEvent({ worldId, type, entityId, occurredAt = new Date().toISOString(), metadata = {} }) {
  assertStableId(worldId, 'worldId');
  assertStableId(type, 'event type');
  if (entityId != null) assertStableId(entityId, 'entityId');
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new TypeError('metadata must be an object');
  }
  return Object.freeze({
    protocolVersion: WORLD_PROTOCOL_VERSION,
    worldId,
    type,
    ...(entityId ? { entityId } : {}),
    occurredAt,
    metadata: { ...metadata },
  });
}

export function createPortalTransition({ fromWorld, portalId, targetWorld, spawnId }) {
  for (const [label, value] of Object.entries({ fromWorld, portalId, targetWorld, spawnId })) {
    assertStableId(value, label);
  }
  if (fromWorld === targetWorld && portalId === spawnId) {
    throw new TypeError('portal transition must change portal or world');
  }
  return Object.freeze({
    protocolVersion: WORLD_PROTOCOL_VERSION,
    kind: 'world-transition',
    fromWorld,
    portalId,
    targetWorld,
    spawnId,
  });
}
