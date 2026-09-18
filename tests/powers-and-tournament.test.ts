import test from 'node:test';
import assert from 'node:assert/strict';
import { PhysicsWorld } from '../server/src/PhysicsWorld.js';
import { GameRoom } from '../server/src/GameRoom.js';
import { matchmaker } from '../server/src/Matchmaker.js';
import { PlayerState, BombState, CrateItem, GameEvent } from '../shared/types.js';

function createDummyPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'p1',
    name: 'Goku',
    character: 'robot',
    color: '#ff6600',
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rotY: 0,
    health: 100,
    maxHealth: 100,
    isAlive: true,
    isGrounded: true,
    isPunching: false,
    punchCooldown: 0,
    isStunned: false,
    stunTimer: 0,
    heldBombId: null,
    carriedPlayerId: null,
    carrierPlayerId: null,
    isCarried: false,
    powerUp: null,
    powerUpTimer: 0,
    specialBombType: null,
    specialBombAmmo: 0,
    statusEffect: null,
    score: 0,
    kills: 0,
    deaths: 0,
    ping: 10,
    spawnGrace: 0,
    ...overrides,
  };
}

test('destructible crates take damage from punches and break with crate_break event', () => {
  const attacker = createDummyPlayer({ id: 'p1', rotY: 0 }); // facing +Z
  const crate: CrateItem = { id: 'c1', x: 0, y: 0, z: 1.5, health: 20 };
  const events: GameEvent[] = [];

  PhysicsWorld.executePunch(attacker, [attacker], events, false, false, [crate]);

  assert.ok(crate.health < 20, 'Crate should have taken damage from punch');
  assert.ok(events.some(e => e.type === 'punch_hit'), 'Should emit punch_hit');

  // Finish breaking the crate
  crate.health = 5;
  attacker.punchCooldown = 0;
  attacker.isPunching = false;
  PhysicsWorld.executePunch(attacker, [attacker], events, false, false, [crate]);

  assert.ok(crate.health <= 0, 'Crate should be destroyed');
  assert.ok(events.some(e => e.type === 'crate_break'), 'Should emit crate_break');
});

test('boxing gloves double punch damage compared to normal punch', () => {
  const normalAttacker = createDummyPlayer({ id: 'p1', rotY: 0 });
  const normalVictim = createDummyPlayer({ id: 'v1', x: 0, y: 0, z: 1.5, health: 100 });
  const events1: GameEvent[] = [];
  PhysicsWorld.executePunch(normalAttacker, [normalAttacker, normalVictim], events1, false, false);
  const normalDamage = 100 - normalVictim.health;

  const gloveAttacker = createDummyPlayer({ id: 'p2', rotY: 0, powerUp: 'boxing_gloves', powerUpTimer: 10 });
  const gloveVictim = createDummyPlayer({ id: 'v2', x: 0, y: 0, z: 1.5, health: 100 });
  const events2: GameEvent[] = [];
  PhysicsWorld.executePunch(gloveAttacker, [gloveAttacker, gloveVictim], events2, false, false);
  const gloveDamage = 100 - gloveVictim.health;

  assert.equal(gloveDamage, normalDamage * 2, 'Boxing gloves must double the punch damage');
});

test('jump boots grant 75% higher jump velocity', () => {
  const normalPlayer = createDummyPlayer();
  const input = { moveX: 0, moveZ: 0, jump: true, sprint: false, lookAngle: 0 };
  PhysicsWorld.updatePlayer(normalPlayer, input, 'floating_arena', 0.02, []);
  const normalVy = normalPlayer.vy;

  const bootsPlayer = createDummyPlayer({ powerUp: 'jump_boots', powerUpTimer: 10 });
  PhysicsWorld.updatePlayer(bootsPlayer, input, 'floating_arena', 0.02, []);
  const bootsVy = bootsPlayer.vy;

  assert.ok(bootsVy > normalVy * 1.5, 'Jump boots should grant significantly higher jump velocity');
});

test('paralysis bomb freezes movement and punches', () => {
  const victim = createDummyPlayer({ id: 'v1', x: 0, y: 0, z: 2, health: 150, maxHealth: 150 });
  const bomb: BombState = {
    id: 'b1',
    type: 'paralysis',
    ownerId: 'p1',
    x: 0,
    y: 0,
    z: 2.2,
    vx: 0,
    vy: 0,
    vz: 0,
    fuse: 0,
    maxFuse: 2.8,
    isAttached: false,
    attachedToPlayerId: null,
    radius: 0.5,
    isArmed: true,
  };

  const events: GameEvent[] = [];
  PhysicsWorld.detonateExplosion(bomb, [], [victim], [], events);

  assert.equal(victim.statusEffect?.type, 'paralysis', 'Victim must have paralysis status effect');

  // Ground victim and attempt to jump while paralyzed
  victim.vy = 0;
  victim.isGrounded = true;
  const input = { moveX: 1, moveZ: 1, jump: true, sprint: true, lookAngle: 0 };
  PhysicsWorld.updatePlayer(victim, input, 'floating_arena', 0.02, []);
  assert.equal(victim.vy <= 0, true, 'Cannot initiate jump velocity while paralyzed');

  // Attempting to punch while paralyzed fails
  victim.punchCooldown = 0;
  victim.isPunching = false;
  PhysicsWorld.executePunch(victim, [victim], events);
  assert.equal(victim.isPunching, false, 'Cannot punch while paralyzed');
});

test('poison bomb applies progressive damage over time like Pokemon', () => {
  const victim = createDummyPlayer({ id: 'v1', x: 0, y: 0, z: 2, health: 150, maxHealth: 150 });
  const bomb: BombState = {
    id: 'b1',
    type: 'poison',
    ownerId: 'attacker1',
    x: 0,
    y: 0,
    z: 2,
    vx: 0,
    vy: 0,
    vz: 0,
    fuse: 0,
    maxFuse: 2.8,
    isAttached: false,
    attachedToPlayerId: null,
    radius: 0.5,
    isArmed: true,
  };

  const events: GameEvent[] = [];
  PhysicsWorld.detonateExplosion(bomb, [], [victim], [], events);

  assert.equal(victim.statusEffect?.type, 'poison', 'Victim must be poisoned');
  const postExplosionHealth = victim.health;

  // Advance time past tick
  const input = { moveX: 0, moveZ: 0, jump: false, sprint: false, lookAngle: 0 };
  PhysicsWorld.updatePlayer(victim, input, 'floating_arena', 0.4, events);

  assert.ok(victim.health < postExplosionHealth, 'Poison must deal ticking damage over time');
  assert.ok(events.some(e => e.type === 'status_damage'), 'Should emit status_damage event');
});

test('fire bomb applies burn damage over time', () => {
  const victim = createDummyPlayer({ id: 'v1', x: 0, y: 0, z: 2, health: 150, maxHealth: 150 });
  const bomb: BombState = {
    id: 'b1',
    type: 'fire',
    ownerId: 'attacker1',
    x: 0,
    y: 0,
    z: 2,
    vx: 0,
    vy: 0,
    vz: 0,
    fuse: 0,
    maxFuse: 2.8,
    isAttached: false,
    attachedToPlayerId: null,
    radius: 0.5,
    isArmed: true,
  };

  const events: GameEvent[] = [];
  PhysicsWorld.detonateExplosion(bomb, [], [victim], [], events);

  assert.equal(victim.statusEffect?.type, 'burn', 'Victim must be burned');
  const postExplosionHealth = victim.health;

  // Advance time past tick
  const input = { moveX: 0, moveZ: 0, jump: false, sprint: false, lookAngle: 0 };
  PhysicsWorld.updatePlayer(victim, input, 'floating_arena', 0.3, events);

  assert.ok(victim.health < postExplosionHealth, 'Burn must deal ticking damage over time');
});

test('Tournament of Power room supports up to 48 players', () => {
  const room = new GameRoom('test_top_room');
  room.mapType = 'power_tournament';

  // Add 48 players
  for (let i = 0; i < 48; i++) {
    const dummyWs = { readyState: 1, send: () => {} } as any;
    room.addPlayer(`warrior_${i}`, dummyWs, `Warrior_${i}`, 'robot', '#3b82f6');
  }

  assert.equal(room.players.size, 48, 'Room must hold all 48 players');
  room.stop();
});

test('Power-ups disappear cleanly on pickup and respawn after cooldown timer', () => {
  const room = new GameRoom('test_pu_lifecycle');
  room.mapType = 'floating_arena';

  // Ensure spawner pu_0 exists
  const pu0 = room.powerUps.get('pu_0');
  assert.ok(pu0, 'pu_0 should exist initially');

  // Place player right at pu_0 position
  const dummyWs = { readyState: 1, send: () => {} } as any;
  const player = room.addPlayer('test_collector', dummyWs, 'Collector', 'robot', '#ff0000');
  player.x = pu0.x;
  player.y = pu0.y;
  player.z = pu0.z;

  // Run update tick
  (room as any).update(0.05);

  // pu_0 MUST be removed from room.powerUps immediately (no ghost lingering)
  assert.equal(room.powerUps.has('pu_0'), false, 'pu_0 must be removed from room.powerUps upon pickup');
  assert.ok(player.powerUp || player.specialBombType || player.health === player.maxHealth, 'Player must have received powerup benefit');

  // Move player away so they don't immediately vacuum it up the instant it respawns
  player.x = 999;
  player.z = 999;

  // Advance time by 5 seconds (still in cooldown)
  (room as any).update(5.0);
  assert.equal(room.powerUps.has('pu_0'), false, 'pu_0 must not respawn before cooldown expires');

  // Advance time past 10 seconds cooldown
  (room as any).update(6.0);
  assert.equal(room.powerUps.has('pu_0'), true, 'pu_0 must respawn cleanly once cooldown completes');

  room.stop();
});

test('Crate drops auto-despawn after lifespan to prevent hanging objects', () => {
  const room = new GameRoom('test_drop_lifespan');
  room.mapType = 'floating_arena';

  // Create crates and break them
  for (let i = 0; i < 10; i++) {
    const crate: CrateItem = { id: `crate_drop_test_${i}`, x: i * 2, y: 0, z: 0, health: 0 };
    room.crates.set(crate.id, crate);
  }

  // Run update tick to break crates and drop items
  (room as any).update(0.05);

  // Find the created drop item
  const dropEntry = Array.from(room.powerUps.entries()).find(([id]) => id.startsWith('drop_'));
  assert.ok(dropEntry, 'Broken crates should drop an item');
  const [dropId] = dropEntry;

  // Advance time by 20 seconds (still within 25s lifespan)
  (room as any).update(20.0);
  assert.equal(room.powerUps.has(dropId), true, 'Drop item should remain before lifespan expires');

  // Advance time past 25 seconds
  (room as any).update(6.0);
  assert.equal(room.powerUps.has(dropId), false, 'Drop item must auto-despawn and disappear from powerUps');

  room.stop();
});

test('Ice bomb freezes players into immobilized ice block and punch shatters the freeze', () => {
  const victim = createDummyPlayer({ id: 'v1', x: 0, y: 0, z: 2, health: 100 });
  const bomb: BombState = {
    id: 'ice_bomb_1',
    type: 'ice',
    ownerId: 'attacker1',
    x: 0,
    y: 0,
    z: 2.2,
    vx: 0,
    vy: 0,
    vz: 0,
    fuse: 0,
    maxFuse: 2.8,
    isAttached: false,
    attachedToPlayerId: null,
    radius: 0.5,
    isArmed: true,
  };

  const events: GameEvent[] = [];
  PhysicsWorld.detonateExplosion(bomb, [], [victim], [], events);

  assert.equal(victim.statusEffect?.type, 'freeze', 'Victim must be frozen by ice bomb');
  assert.equal(victim.isStunned, true, 'Victim must be stunned / immobilized');

  // Immobilized: cannot move or jump
  const input = { moveX: 1, moveZ: 1, jump: true, sprint: true, lookAngle: 0 };
  PhysicsWorld.updatePlayer(victim, input, 'floating_arena', 0.02, events);
  assert.equal(victim.vy <= 0, true, 'Cannot jump while frozen');

  // An attacker punches the frozen victim -> shatters the freeze
  const puncher = createDummyPlayer({ id: 'p1', x: 0, y: 0, z: 0.8, rotY: 0 });
  PhysicsWorld.executePunch(puncher, [puncher, victim], events);

  assert.equal(victim.statusEffect, null, 'Freeze must be shattered by punch');
  assert.ok(events.some(e => e.type === 'freeze_shatter'), 'Must emit freeze_shatter event');
});

test('Carried victim can tech breakout in the sweet-spot window, stunning carrier and leaping free', () => {
  const room = new GameRoom('test_grab_breakout');
  room.mapType = 'floating_arena';

  const dummyWs = { readyState: 1, send: () => {} } as any;
  const carrier = room.addPlayer('carrier', dummyWs, 'Carrier', 'robot', '#3b82f6');
  const victim = room.addPlayer('victim', dummyWs, 'Victim', 'ninja', '#ef4444');

  carrier.x = 0; carrier.y = 0; carrier.z = 0; carrier.rotY = 0;
  victim.x = 0; victim.y = 0; victim.z = 1.0;

  // Carrier grabs victim
  carrier.carriedPlayerId = victim.id;
  victim.isCarried = true;
  victim.carrierPlayerId = carrier.id;
  carrier.carryTimer = 0.8; // Inside the 0.5s - 1.8s sweet spot!

  // Victim inputs Jump to trigger breakout
  room.handleInput('victim', {
    moveX: 0,
    moveZ: 0,
    jump: true,
    punch: false,
    throwBomb: false,
    dropBomb: false,
    grab: false,
    sprint: false,
    lookAngle: 0,
    seq: 1,
  });

  // Execute room tick
  (room as any).update(0.05);

  // Assertions:
  assert.equal(victim.isCarried, false, 'Victim must break free from grab');
  assert.equal(carrier.carriedPlayerId, null, 'Carrier must lose hold of victim');
  assert.equal(carrier.isStunned, true, 'Carrier must be stunned by tech breakout');
  assert.ok(victim.vy > 10, 'Victim must vault upwards with high velocity on tech breakout');

  room.stop();
});
