import type { PlayerState } from './types.js';

export const ATTACK_DURATION = { jab: 0.18, hook: 0.18, uppercut: 0.32, dash: 0.32, kick: 0.38 } as const;
export const INPUT_DEADZONE = 0.12;
export function normalizeMovement(x: number, z: number) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { x: 0, z: 0 };
  const length = Math.hypot(x, z);
  if (length <= INPUT_DEADZONE) return { x: 0, z: 0 };
  const scale = Math.min(1, (length - INPUT_DEADZONE) / (1 - INPUT_DEADZONE));
  return { x: x / length * scale, z: z / length * scale };
}
export function nextAttack(player: PlayerState, kick: boolean, sprint: boolean): { combo: number; kind: keyof typeof ATTACK_DURATION; duration: number } {
  const combo = kick ? 0 : ((player.comboTimer ?? 0) > 0 ? (player.comboStep ?? 0) % 3 : 0) + 1;
  const kind = kick ? 'kick' : sprint && Math.hypot(player.vx, player.vz) > 8 ? 'dash' : combo === 3 ? 'uppercut' : combo === 2 ? 'hook' : 'jab';
  return { combo, kind, duration: ATTACK_DURATION[kind] };
}
export function difficultyLabel(value: number) {
  return value < 0.25 ? 'Aprendiz' : value < 0.5 ? 'En progreso' : value < 0.75 ? 'Experimentado' : 'Veterano';
}
