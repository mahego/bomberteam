import type { PlayerState } from '../../../shared/types.js';

interface Experience { seconds: number; kills: number; deaths: number; pressure: number; }
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Room difficulty follows the least experienced human. Bots never train the director. */
export class ExperienceDirector {
  private players = new Map<string, Experience>();
  public difficulty = 0.08;

  join(id: string, priorSeconds: unknown = 0) {
    const seconds = typeof priorSeconds === 'number' && Number.isFinite(priorSeconds) ? clamp(priorSeconds, 0, 36_000) : 0;
    if (this.players.size === 0) this.difficulty = this.base(seconds);
    this.players.set(id, { seconds, kills: 0, deaths: 0, pressure: 0 });
    // A novice joining an experienced room immediately gets the gentler baseline.
    this.difficulty = Math.min(this.difficulty, this.base(seconds));
  }
  leave(id: string) { this.players.delete(id); }
  private base(seconds: number) { return 0.08 + 0.72 * (1 - Math.exp(-seconds / 2400)); }

  update(dt: number, players: Iterable<PlayerState>) {
    let target = 1;
    let humans = 0;
    for (const player of players) {
      const experience = this.players.get(player.id);
      if (!experience) continue;
      humans++;
      if (player.isAlive) experience.seconds += dt;
      experience.pressure += (player.kills - experience.kills) * 0.018 - (player.deaths - experience.deaths) * 0.07;
      experience.pressure = clamp(experience.pressure * Math.exp(-dt / 100), -0.2, 0.1);
      experience.kills = player.kills;
      experience.deaths = player.deaths;
      target = Math.min(target, clamp(this.base(experience.seconds) + experience.pressure, 0.04, 0.9));
    }
    if (!humans) target = 0.08;
    const limit = (target > this.difficulty ? 0.002 : 0.025) * dt;
    this.difficulty += clamp(target - this.difficulty, -limit, limit);
    return this.difficulty;
  }
}
