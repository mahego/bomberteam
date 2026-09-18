import test from 'node:test';
import assert from 'node:assert/strict';
import { ExperienceDirector } from '../server/src/ai/ExperienceDirector.js';
import { BotController, safeMovement } from '../server/src/ai/BotController.js';
import { PhysicsWorld } from '../server/src/PhysicsWorld.js';
import { MAPS } from '../server/src/Maps.js';
import { normalizeMovement, nextAttack } from '../shared/gameplay.js';
import type { GameInput, PlayerState } from '../shared/types.js';

function player(id: string, z = 0): PlayerState {
  return { id, name: id, character: 'robot', color: '#3399ff', x: 8, y: 0, z, vx: 0, vy: 0, vz: 0, rotY: 0,
    health: 100, maxHealth: 100, isAlive: true, isGrounded: true, isPunching: false, punchCooldown: 0, isStunned: false,
    stunTimer: 0, heldBombId: null, carriedPlayerId: null, carrierPlayerId: null, isCarried: false, powerUp: null,
    powerUpTimer: 0, score: 0, kills: 0, deaths: 0, ping: 0 };
}
const idle: GameInput = { moveX: 0, moveZ: 0, jump: false, punch: false, kick: false, throwBomb: false, dropBomb: false, grab: false, sprint: false, lookAngle: 0, seq: 0 };

test('experience increases slowly, losses reduce pressure and bots never increase experience', () => {
  const director = new ExperienceDirector(); const human = player('human');
  director.join(human.id);
  const start = director.difficulty;
  for (let i = 0; i < 9000; i++) {
    const previous = director.difficulty;
    director.update(1 / 30, [human, { ...player('bot_1'), kills: 10000 }]);
    assert.ok(director.difficulty - previous <= 0.002 / 30 + 1e-10);
  }
  assert.ok(director.difficulty > start);
  assert.ok(director.difficulty < 0.2, 'first five minutes should still be gentle');
  const beforeDeaths = director.difficulty;
  human.deaths = 3;
  for (let i = 0; i < 150; i++) director.update(1 / 30, [human]);
  assert.ok(director.difficulty < beforeDeaths);
});

test('experienced players start higher; novice joining lowers the room difficulty', () => {
  const director = new ExperienceDirector();
  director.join('veteran', 7200);
  assert.ok(director.difficulty > 0.7);
  director.join('newcomer', 0);
  assert.equal(director.difficulty, 0.08);
  director.update(1, [player('veteran'), player('newcomer')]);
  assert.ok(director.difficulty < 0.1);
  for (const value of [NaN, Infinity, -100, 'oops', null]) {
    const safe = new ExperienceDirector(); safe.join('human', value);
    assert.equal(safe.difficulty, 0.08);
  }
});

function simulate(difficulty: number, hz: number, seconds: number, protectedHuman = false) {
  const ai = new BotController(() => 0.5);
  const bot = player('bot_1'), human = player('human', 2);
  if (protectedHuman) human.spawnGrace = 4;
  const inputs: GameInput[] = []; let windups = 0;
  for (let i = 0; i < hz * seconds; i++) {
    ai.update(1 / hz, [bot.id], { players: new Map([[bot.id, bot], [human.id, human]]), mapType: 'floating_arena', difficulty,
      send: (_, input) => inputs.push(input), respawn: () => {} });
    if (bot.botIntent === 'winding_up') windups++;
  }
  return { attacks: inputs.filter(i => i.punch || i.kick || i.grab || i.throwBomb).length, inputs, windups };
}

test('bots telegraph attacks, leave recovery gaps and never sprint against beginners', () => {
  const easy = simulate(0.08, 30, 20), hard = simulate(0.8, 30, 20);
  assert.ok(easy.attacks > 0 && easy.attacks <= 6);
  assert.ok(hard.attacks > easy.attacks);
  assert.ok(easy.windups > 0);
  assert.ok(easy.inputs.every(i => !i.sprint && !i.kick && !i.grab && !i.throwBomb));
  assert.ok(easy.inputs.every(i => Math.hypot(i.moveX, i.moveZ) < 0.4));
  assert.ok(Math.abs(simulate(0.08, 60, 20).attacks - easy.attacks) <= 1, 'AI cadence is independent of tick rate');
  assert.equal(simulate(0.08, 30, 20, true).attacks, 0);
});

test('steering avoids the central hole and analog motion keeps partial speed', () => {
  const bot = { x: 3.6, y: 0, z: 0 };
  const movement = safeMovement(bot, -0.5, 0, 'floating_arena');
  const length = Math.hypot(movement.x, movement.z);
  if (length > 0) for (const step of [0.5, 1.2, 2]) {
    assert.notEqual(MAPS.floating_arena.getFloorHeight(bot.x + movement.x / length * step, bot.z + movement.z / length * step), null);
  }
  const slow = player('slow'), fast = player('fast');
  for (let i = 0; i < 15; i++) {
    PhysicsWorld.updatePlayer(slow, { ...idle, moveZ: 0.3 }, 'floating_arena', 1 / 30, []);
    PhysicsWorld.updatePlayer(fast, { ...idle, moveZ: 1 }, 'floating_arena', 1 / 30, []);
  }
  assert.ok(slow.vz < fast.vz * 0.4);
  assert.deepEqual(normalizeMovement(0.08, 0), { x: 0, z: 0 });
  assert.ok(Math.abs(Math.hypot(...Object.values(normalizeMovement(1, 1))) - 1) < 1e-10);
  assert.equal(nextAttack({ ...slow, comboStep: 2, comboTimer: 0 }, false, false).kind, 'jab');
});

test('spawn protection prevents punches and wears off normally', () => {
  const a = player('a'), b = player('b', 2); b.spawnGrace = 0.5;
  PhysicsWorld.executePunch(a, [a, b], []);
  assert.equal(b.health, 100);
  for (let i = 0; i < 16; i++) PhysicsWorld.updatePlayer(b, idle, 'floating_arena', 1 / 30, []);
  a.punchCooldown = 0;
  PhysicsWorld.executePunch(a, [a, b], []);
  assert.ok(b.health < 100);
});
