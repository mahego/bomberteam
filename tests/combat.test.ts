import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom } from '../server/src/GameRoom.js';
import { PhysicsWorld } from '../server/src/PhysicsWorld.js';
import type { PlayerState, GameEvent } from '../shared/types.js';
import type { WebSocket } from 'ws';

const idle = { moveX: 0, moveZ: 0, jump: false, punch: false, throwBomb: false, dropBomb: false, grab: false, sprint: false, lookAngle: 0, seq: 1 };
function setup() {
  const room = new GameRoom('test'); room.stop();
  const socket = { readyState: 3 } as WebSocket;
  const a = room.addPlayer('a', socket, 'A', 'robot', '#ff0000');
  const b = room.addPlayer('b', socket, 'B', 'ninja', '#00ff00');
  for (const id of [...room.players.keys()]) if (id.startsWith('bot_')) room.players.delete(id);
  room.powerUps.clear();
  Object.assign(a, { x: 8, y: 0, z: 0, rotY: 0, isGrounded: true, spawnGrace: 0 });
  Object.assign(b, { x: 8, y: 0, z: 2, rotY: Math.PI, isGrounded: true, spawnGrace: 0 });
  return { room, a, b };
}
function tick(room: GameRoom, count = 1) {
  for (let i = 0; i < count; i++) (room as unknown as { update(dt: number): void }).update(1 / 30);
}

test('three punches form a combo, cooldown blocks spam, kick launches farther', () => {
  const { a, b } = setup(); const events: GameEvent[] = [];
  for (const kind of ['jab', 'hook', 'uppercut']) {
    a.punchCooldown = 0;
    PhysicsWorld.executePunch(a, [a, b], events);
    assert.equal(a.attackKind, kind);
    const health = b.health;
    PhysicsWorld.executePunch(a, [a, b], events);
    assert.equal(b.health, health);
  }
  assert.equal(b.vy, 10);
  a.punchCooldown = 0;
  PhysicsWorld.executePunch(a, [a, b], events, true);
  assert.equal(a.attackKind, 'kick');
  assert.ok(b.vz > 20);
  assert.equal(b.lastAttackerId, a.id);
});

test('punch respects facing, height and carried state', () => {
  const { a, b } = setup();
  b.z = -2;
  PhysicsWorld.executePunch(a, [a, b], []);
  assert.equal(b.health, 100);
  a.punchCooldown = 0; b.z = 2; b.y = 4;
  PhysicsWorld.executePunch(a, [a, b], []);
  assert.equal(b.health, 100);
  a.punchCooldown = 0; a.isCarried = true; b.y = 0;
  PhysicsWorld.executePunch(a, [a, b], []);
  assert.equal(b.health, 100);
});

test('grab, carry and throw preserve momentum and credit ring-out exactly once', () => {
  const { room, a, b } = setup();
  a.x = b.x = 10; a.z = 10; b.z = 12;
  room.handleInput(a.id, { ...idle, grab: true });
  assert.equal(a.carriedPlayerId, b.id);
  tick(room);
  assert.equal(b.y, a.y + 1.85);
  room.handleInput(a.id, { ...idle, grab: true });
  assert.equal(b.isCarried, false);
  assert.equal(b.carrierPlayerId, null);
  assert.equal(b.lastAttackerId, a.id);
  tick(room);
  assert.ok(b.vz > 18, 'throw must not be cancelled by movement friction');
  tick(room, 100);
  assert.equal(b.isAlive, false);
  assert.equal(a.kills, 1);
  assert.equal(b.deaths, 1);
  tick(room, 10);
  assert.equal(a.kills, 1);
});

test('carried player cannot attack; carry expires and respawn clears relationships', () => {
  const { room, a, b } = setup();
  room.handleInput(a.id, { ...idle, grab: true });
  room.handleInput(b.id, { ...idle, punch: true, throwBomb: true, kick: true });
  assert.equal(room.bombs.size, 0);
  assert.equal(a.health, 100);
  tick(room, 91);
  assert.equal(a.carriedPlayerId, null);
  assert.equal(b.isCarried, false);
  Object.assign(a, { carriedPlayerId: b.id });
  Object.assign(b, { isCarried: true, carrierPlayerId: a.id });
  room.respawnPlayer(a);
  assert.equal(b.isCarried, false);
  assert.equal(b.carrierPlayerId, null);
});

test('bomb can be held, thrown and returned without renewing fuse', () => {
  const { room, a } = setup();
  room.handleInput(a.id, { ...idle, throwBomb: true });
  const id = a.heldBombId!;
  assert.ok(id);
  tick(room, 12);
  const bomb = room.bombs.get(id)!;
  assert.ok(bomb.fuse < 2.5);
  const fuse = bomb.fuse;
  room.handleInput(a.id, { ...idle, throwBomb: true });
  assert.equal(a.heldBombId, null);
  assert.equal(bomb.isAttached, false);
  assert.equal(bomb.fuse, fuse);
  assert.ok(bomb.vz >= 17);
  tick(room, 25);
  Object.assign(bomb, { x: a.x, y: a.y + 0.5, z: a.z, vx: 0, vy: 0, vz: 0 });
  const remaining = bomb.fuse;
  room.handleInput(a.id, { ...idle, throwBomb: true });
  assert.equal(a.heldBombId, id);
  assert.equal(bomb.fuse, remaining);
  room.handleInput(a.id, { ...idle, dropBomb: true });
  assert.equal(a.heldBombId, null);
  assert.equal(bomb.vy, 1);
});

test('held bomb detonates and clears hand; stun drops bomb', () => {
  const { room, a } = setup();
  room.handleInput(a.id, { ...idle, throwBomb: true });
  const bomb = room.bombs.get(a.heldBombId!)!;
  bomb.fuse = 0.01;
  tick(room);
  assert.equal(a.heldBombId, null);
  assert.equal(room.bombs.size, 0);
  assert.ok(a.health < 100);
  room.respawnPlayer(a);
  room.handleInput(a.id, { ...idle, throwBomb: true });
  const next = room.bombs.get(a.heldBombId!)!;
  a.isStunned = true; a.stunTimer = 1;
  tick(room);
  assert.equal(a.heldBombId, null);
  assert.equal(next.isAttached, false);
});

test('fallen players cannot snap back onto a platform from below', () => {
  const { a } = setup();
  a.y = -2; a.vy = -4; a.isGrounded = false;
  PhysicsWorld.updatePlayer(a, idle, 'floating_arena', 1 / 30, []);
  assert.ok(a.y < -2);
  assert.equal(a.isGrounded, false);
});

test('kick ring-out awards a kill, but expired hit credit does not', () => {
  const { room, a, b } = setup();
  a.x = b.x = 10; a.z = 10; b.z = 12;
  room.handleInput(a.id, { ...idle, kick: true });
  tick(room, 100);
  assert.equal(b.isAlive, false);
  assert.equal(a.kills, 1);
  room.respawnPlayer(b);
  Object.assign(b, { x: 10, y: -4.9, z: 20, vy: -10, lastAttackerId: a.id, hitCreditTimer: 0.01 });
  tick(room);
  assert.equal(a.kills, 1, 'old attacks cannot claim later falls');
});

test('blast releases a carried victim before applying the launch', () => {
  const { room, a, b } = setup();
  room.handleInput(a.id, { ...idle, grab: true });
  tick(room);
  const bomb = { id: 'blast', type: 'normal' as const, ownerId: a.id, x: b.x, y: b.y, z: b.z - 1,
    vx: 0, vy: 0, vz: 0, fuse: 0, maxFuse: 2.8, isAttached: false, attachedToPlayerId: null, radius: 0.55, isArmed: true };
  PhysicsWorld.detonateExplosion(bomb, [], [a, b], [], []);
  assert.equal(b.isCarried, false);
  assert.equal(a.carriedPlayerId, null);
  assert.ok(b.vz > 0);
});

test('a short jump press survives later packets until the next physics tick', () => {
  const { room, a } = setup();
  room.handleInput(a.id, { ...idle, jump: true });
  room.handleInput(a.id, { ...idle, jump: false });
  tick(room);
  assert.ok(a.vy > 0);
  assert.equal(room.playerInputs.get(a.id)?.jump, false);
});
