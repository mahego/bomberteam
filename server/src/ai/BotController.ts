import type { PlayerState, MapType, ClientMessage } from '../../../shared/types.js';
import { MAPS } from '../Maps.js';

type Input = Omit<Extract<ClientMessage, { type: 'input' }>, 'type'>;
type Action = 'punch' | 'kick' | 'grab' | 'throwBomb';
interface Brain {
  target: string | null; decision: number; recovery: number; windup: number;
  action: Action | null; moveX: number; moveZ: number; desiredX: number; desiredZ: number;
  angle: number; deadTime: number; side: number; bombWait: number;
}
export interface BotContext {
  players: Map<string, PlayerState>; mapType: MapType; difficulty: number;
  send: (id: string, input: Input) => void; respawn: (player: PlayerState) => void;
}

/** Timed observe → approach → wind-up → recover loop, independent of render/network frequency. */
export class BotController {
  private brains = new Map<string, Brain>();
  constructor(private random: () => number = Math.random) {}
  remove(id: string) { this.brains.delete(id); }
  reset() { this.brains.clear(); }

  update(dt: number, ids: string[], context: BotContext) {
    const difficulty = Math.min(1, Math.max(0, context.difficulty));
    const claims = new Map<string, number>();
    for (const id of ids) {
      const bot = context.players.get(id);
      if (!bot) continue;
      let brain = this.brains.get(id);
      if (!brain) {
        brain = { target: null, decision: 0, recovery: 1.5 + this.random(), windup: 0, action: null,
          moveX: 0, moveZ: 0, desiredX: 0, desiredZ: 0, angle: bot.rotY, deadTime: 0, side: this.random() < 0.5 ? -1 : 1, bombWait: 8 };
        this.brains.set(id, brain);
      }
      const input: Input = { moveX: 0, moveZ: 0, lookAngle: brain.angle, jump: false, punch: false, kick: false,
        throwBomb: false, dropBomb: false, grab: false, sprint: false, seq: 0 };
      if (!bot.isAlive) {
        brain.deadTime += dt;
        if (brain.deadTime >= 3.5) { context.respawn(bot); this.brains.delete(id); }
        continue;
      }
      if (bot.isStunned || bot.isCarried || (bot.spawnGrace ?? 0) > 0) {
        brain.action = null; brain.windup = 0; brain.recovery = 1;
        brain.moveX = brain.moveZ = 0;
        bot.botIntent = 'observing';
        context.send(id, input);
        continue;
      }
      brain.decision -= dt;
      brain.recovery = Math.max(0, brain.recovery - dt);
      brain.bombWait = Math.max(0, brain.bombWait - dt);
      let target = brain.target ? context.players.get(brain.target) : undefined;
      const eligible = (p: PlayerState) => p.id !== id && p.isAlive && !p.isCarried && (p.spawnGrace ?? 0) <= 0;
      if (!target || !eligible(target) || brain.decision <= 0) {
        const candidates = [...context.players.values()].filter(eligible).filter(p => p.id.startsWith('bot_') || (claims.get(p.id) ?? 0) < (difficulty < 0.65 ? 1 : 2));
        target = candidates.sort((a, b) => Math.hypot(a.x - bot.x, a.z - bot.z) - Math.hypot(b.x - bot.x, b.z - bot.z))[0];
        brain.target = target?.id ?? null;
        brain.decision = 0.9 - difficulty * 0.6;
      }
      if (target && !target.id.startsWith('bot_')) {
        if ((claims.get(target.id) ?? 0) >= (difficulty < 0.65 ? 1 : 2)) target = undefined;
        else claims.set(target.id, (claims.get(target.id) ?? 0) + 1);
      }
      if (!target) {
        brain.desiredX = brain.desiredZ = 0; brain.action = null;
        bot.botIntent = 'observing';
      } else {
        const dx = target.x - bot.x, dz = target.z - bot.z;
        const distance = Math.hypot(dx, dz);
        const angle = Math.atan2(dx, dz);
        const difference = Math.atan2(Math.sin(angle - brain.angle), Math.cos(angle - brain.angle));
        brain.angle += Math.max(-dt * (1.8 + difficulty * 3), Math.min(dt * (1.8 + difficulty * 3), difference));
        input.lookAngle = brain.angle;
        const speed = 0.28 + difficulty * 0.5;
        const facing = Math.cos(angle - brain.angle) > 0.8;
        if (brain.action) {
          brain.windup -= dt;
          brain.desiredX = brain.desiredZ = 0;
          bot.botIntent = 'winding_up';
          if (brain.windup <= 0) {
            if (facing && (brain.action === 'throwBomb' || bot.carriedPlayerId || distance < 2.6)) input[brain.action] = true;
            brain.action = null;
            brain.recovery = 2.3 - difficulty * 1.5 + this.random() * 0.5;
            bot.botIntent = 'recovering';
          }
        } else if (brain.recovery > 0) {
          // Give the opponent space to respond, using a slow sideways retreat.
          brain.desiredX = Math.cos(angle) * speed * 0.35 * brain.side - (distance < 3 ? Math.sin(angle) * speed * 0.3 : 0);
          brain.desiredZ = -Math.sin(angle) * speed * 0.35 * brain.side - (distance < 3 ? Math.cos(angle) * speed * 0.3 : 0);
          bot.botIntent = 'recovering';
        } else if (facing && (distance < 2.5 || bot.carriedPlayerId || (difficulty > 0.22 && distance > 5 && distance < 11 && brain.bombWait === 0))) {
          brain.action = bot.carriedPlayerId ? 'grab' : distance > 5 ? 'throwBomb' : difficulty > 0.55 && this.random() < 0.15 ? 'grab' : difficulty > 0.35 && this.random() < 0.25 ? 'kick' : 'punch';
          brain.windup = 0.85 - difficulty * 0.5;
          if (brain.action === 'throwBomb') brain.bombWait = 11 - difficulty * 5;
          brain.desiredX = brain.desiredZ = 0;
          bot.botIntent = 'winding_up';
        } else {
          brain.desiredX = Math.sin(angle) * speed;
          brain.desiredZ = Math.cos(angle) * speed;
          bot.botIntent = 'approaching';
        }
      }
      const safe = safeMovement(bot, brain.desiredX, brain.desiredZ, context.mapType);
      const blend = 1 - Math.exp(-dt * 3);
      brain.moveX += (safe.x - brain.moveX) * blend;
      brain.moveZ += (safe.z - brain.moveZ) * blend;
      // Check the smoothed vector too: a turn must not interpolate through a hole.
      const movement = safeMovement(bot, brain.moveX, brain.moveZ, context.mapType);
      input.moveX = movement.x; input.moveZ = movement.z;
      context.send(id, input);
    }
  }
}

export function safeMovement(bot: Pick<PlayerState, 'x' | 'y' | 'z'>, x: number, z: number, mapType: MapType) {
  const length = Math.hypot(x, z);
  if (length < 0.001) return { x: 0, z: 0 };
  const map = MAPS[mapType];
  const angle = Math.atan2(x, z);
  for (const offset of [0, 0.55, -0.55, 1.1, -1.1, Math.PI]) {
    const nx = Math.sin(angle + offset), nz = Math.cos(angle + offset);
    const safe = [0.5, 1.2, 2].every(distance => {
      const px = bot.x + nx * distance, pz = bot.z + nz * distance;
      const floor = map.getFloorHeight(px, pz);
      return floor !== null && Math.abs(floor - bot.y) < 1.6 && map.getHazardDamage(px, floor, pz, 1) <= 0;
    });
    if (safe) return { x: nx * length, z: nz * length };
  }
  return { x: 0, z: 0 };
}
