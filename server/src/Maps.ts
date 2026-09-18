import { MapType, CrateItem, PowerUpItem, PowerUpType } from '../../shared/types.js';

export interface MapDefinition {
  id: MapType;
  name: string;
  themeColor: string;
  ambientColor: string;
  spawns: Array<{ x: number; y: number; z: number }>;
  bombSpawners: Array<{ x: number; y: number; z: number }>;
  powerUpSpawners: Array<{ x: number; y: number; z: number }>;
  initialCrates: Array<{ x: number; y: number; z: number }>;
  isOutOfBounds: (x: number, y: number, z: number) => boolean;
  getFloorHeight: (x: number, z: number) => number | null; // null if abyss/hole
  getHazardDamage: (x: number, y: number, z: number, dt: number) => number; // for lava/danger zones
}

export const MAPS: Record<MapType, MapDefinition> = {
  floating_arena: {
    id: 'floating_arena',
    name: 'Arena Flotante',
    themeColor: '#4f46e5',
    ambientColor: '#818cf8',
    spawns: [
      { x: -10, y: 1, z: -10 },
      { x: 10, y: 1, z: -10 },
      { x: -10, y: 1, z: 10 },
      { x: 10, y: 1, z: 10 },
      { x: 0, y: 1, z: -12 },
      { x: 0, y: 1, z: 12 },
      { x: -12, y: 1, z: 0 },
      { x: 12, y: 1, z: 0 },
    ],
    bombSpawners: [
      { x: -6, y: 1, z: -6 },
      { x: 6, y: 1, z: -6 },
      { x: -6, y: 1, z: 6 },
      { x: 6, y: 1, z: 6 },
      { x: 0, y: 1, z: -7 },
      { x: 0, y: 1, z: 7 },
    ],
    powerUpSpawners: [
      { x: -9, y: 1, z: 0 },
      { x: 9, y: 1, z: 0 },
      { x: 0, y: 1, z: -9 },
      { x: 0, y: 1, z: 9 },
    ],
    initialCrates: [
      { x: -4, y: 0.5, z: -4 },
      { x: 4, y: 0.5, z: -4 },
      { x: -4, y: 0.5, z: 4 },
      { x: 4, y: 0.5, z: 4 },
      { x: -8, y: 0.5, z: -8 },
      { x: 8, y: 0.5, z: 8 },
    ],
    isOutOfBounds: (x, y, z) => {
      if (y < -5) return true;
      const dist = Math.sqrt(x * x + z * z);
      return dist > 24;
    },
    getFloorHeight: (x, z) => {
      const dist = Math.sqrt(x * x + z * z);
      // Central drop hole
      if (dist < 3.2) return null;
      // Main arena platform
      if (dist <= 16) return 0;
      // Outer satellite pads
      const satellites = [
        { cx: 18, cz: 0, r: 3.8 },
        { cx: -18, cz: 0, r: 3.8 },
        { cx: 0, cz: 18, r: 3.8 },
        { cx: 0, cz: -18, r: 3.8 },
      ];
      for (const s of satellites) {
        const dx = x - s.cx;
        const dz = z - s.cz;
        if (Math.sqrt(dx * dx + dz * dz) <= s.r) return 0;
      }
      return null;
    },
    getHazardDamage: () => 0,
  },

  urban_rooftop: {
    id: 'urban_rooftop',
    name: 'Azotea Urbana',
    themeColor: '#059669',
    ambientColor: '#34d399',
    spawns: [
      { x: -14, y: 1, z: -14 },
      { x: 14, y: 1, z: -14 },
      { x: -14, y: 1, z: 14 },
      { x: 14, y: 1, z: 14 },
      { x: 0, y: 1, z: -10 },
      { x: 0, y: 1, z: 10 },
    ],
    bombSpawners: [
      { x: -7, y: 1, z: -7 },
      { x: 7, y: 1, z: -7 },
      { x: -7, y: 1, z: 7 },
      { x: 7, y: 1, z: 7 },
      { x: 0, y: 2, z: 0 },
    ],
    powerUpSpawners: [
      { x: -11, y: 1, z: 0 },
      { x: 11, y: 1, z: 0 },
      { x: 0, y: 2.2, z: 0 },
    ],
    initialCrates: [
      { x: -3, y: 0.5, z: -3 },
      { x: 3, y: 0.5, z: -3 },
      { x: -3, y: 0.5, z: 3 },
      { x: 3, y: 0.5, z: 3 },
      { x: 7, y: 0.5, z: 0 },
      { x: -7, y: 0.5, z: 0 },
      { x: 0, y: 0.5, z: 8 },
      { x: 0, y: 0.5, z: -8 },
    ],
    isOutOfBounds: (x, y, z) => {
      if (y < -5) return true;
      return Math.abs(x) > 20 || Math.abs(z) > 20;
    },
    getFloorHeight: (x, z) => {
      // Elevated central helipad / duct
      if (Math.abs(x) <= 4 && Math.abs(z) <= 4) {
        return 1.2;
      }
      // Main rooftop
      if (Math.abs(x) <= 17 && Math.abs(z) <= 17) {
        return 0;
      }
      return null;
    },
    getHazardDamage: () => 0,
  },

  danger_island: {
    id: 'danger_island',
    name: 'Isla de Magma',
    themeColor: '#dc2626',
    ambientColor: '#f87171',
    spawns: [
      { x: -8, y: 1, z: -8 },
      { x: 8, y: 1, z: -8 },
      { x: -8, y: 1, z: 8 },
      { x: 8, y: 1, z: 8 },
      { x: 0, y: 1, z: 0 },
    ],
    bombSpawners: [
      { x: -5, y: 1, z: 0 },
      { x: 5, y: 1, z: 0 },
      { x: 0, y: 1, z: -5 },
      { x: 0, y: 1, z: 5 },
      { x: 0, y: 1, z: 0 },
    ],
    powerUpSpawners: [
      { x: -6, y: 1, z: -6 },
      { x: 6, y: 1, z: -6 },
      { x: -6, y: 1, z: 6 },
      { x: 6, y: 1, z: 6 },
    ],
    initialCrates: [
      { x: -6, y: 0.5, z: 0 },
      { x: 6, y: 0.5, z: 0 },
      { x: 0, y: 0.5, z: -6 },
      { x: 0, y: 0.5, z: 6 },
    ],
    isOutOfBounds: (x, y, z) => {
      if (y < -4) return true;
      const dist = Math.sqrt(x * x + z * z);
      return dist > 22;
    },
    getFloorHeight: (x, z) => {
      const dist = Math.sqrt(x * x + z * z);
      if (dist <= 18) return 0;
      return null;
    },
    getHazardDamage: (x, y, z, dt) => {
      // Lava burns on outer ring
      const dist = Math.sqrt(x * x + z * z);
      if (dist > 13) {
        return 20 * dt; // 20 damage per second when stepping into magma
      }
      return 0;
    },
  },

  power_tournament: {
    id: 'power_tournament',
    name: 'Torneo del Poder',
    themeColor: '#7c3aed',
    ambientColor: '#c084fc',
    spawns: Array.from({ length: 48 }, (_, i) => {
      // 32 on outer ring, 16 on inner ring
      if (i < 32) {
        const angle = (i / 32) * Math.PI * 2;
        return {
          x: Math.cos(angle) * 24,
          y: 1,
          z: Math.sin(angle) * 24,
        };
      } else {
        const angle = ((i - 32) / 16) * Math.PI * 2;
        return {
          x: Math.cos(angle) * 14,
          y: 1,
          z: Math.sin(angle) * 14,
        };
      }
    }),
    bombSpawners: Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      return {
        x: Math.cos(angle) * 19,
        y: 1,
        z: Math.sin(angle) * 19,
      };
    }),
    powerUpSpawners: Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      return {
        x: Math.cos(angle) * 10,
        y: 1,
        z: Math.sin(angle) * 10,
      };
    }),
    initialCrates: [
      // Ring of crates around central pillar
      ...Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return {
          x: Math.cos(angle) * 6.5,
          y: 0.5,
          z: Math.sin(angle) * 6.5,
        };
      }),
      // Outer ring of crates
      ...Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 + Math.PI / 12;
        return {
          x: Math.cos(angle) * 17,
          y: 0.5,
          z: Math.sin(angle) * 17,
        };
      }),
    ],
    isOutOfBounds: (x, y, z) => {
      if (y < -5) return true;
      const dist = Math.sqrt(x * x + z * z);
      return dist > 34;
    },
    getFloorHeight: (x, z) => {
      const dist = Math.sqrt(x * x + z * z);
      // Central Kachi Katchin Column / Sundial pedestal
      if (dist <= 4.0) {
        return 2.4;
      }
      // Main arena platform
      if (dist <= 30) {
        return 0;
      }
      // Raised rim edge
      if (dist <= 33) {
        return 0.3;
      }
      return null;
    },
    getHazardDamage: () => 0,
  },
};

export const MAP_ROTATION: MapType[] = ['floating_arena', 'power_tournament', 'urban_rooftop', 'danger_island'];
