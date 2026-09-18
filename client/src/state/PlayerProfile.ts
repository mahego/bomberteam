export interface PlayerProfile { matches: number; kills: number; score: number; experienceSeconds: number; }
const empty = (): PlayerProfile => ({ matches: 0, kills: 0, score: 0, experienceSeconds: 0 });
export function readProfile(): PlayerProfile {
  try {
    const stored = JSON.parse(localStorage.getItem('bomber_stats') ?? '{}');
    const profile = empty();
    for (const key of Object.keys(profile) as (keyof PlayerProfile)[]) {
      const value = stored?.[key];
      profile[key] = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
    }
    return profile;
  } catch { return empty(); }
}
export function updateProfile(delta: Partial<PlayerProfile>) {
  const profile = readProfile();
  for (const key of Object.keys(delta) as (keyof PlayerProfile)[]) profile[key] += delta[key] ?? 0;
  try { localStorage.setItem('bomber_stats', JSON.stringify(profile)); } catch { /* In-memory play still works if storage is unavailable. */ }
  return profile;
}
