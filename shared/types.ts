export type CharacterType = 'robot' | 'pirate' | 'ninja' | 'astronaut' | 'alien' | 'explorer';

export type BombType = 'normal' | 'sticky' | 'landmine' | 'paralysis' | 'poison' | 'fire' | 'ice';

export type PowerUpType =
  | 'shield'
  | 'speed'
  | 'strength'
  | 'boxing_gloves'
  | 'jump_boots'
  | 'senzu_bean'
  | 'bomb_sticky'
  | 'bomb_paralysis'
  | 'bomb_poison'
  | 'bomb_fire'
  | 'bomb_ice';

export type MapType = 'floating_arena' | 'urban_rooftop' | 'danger_island' | 'power_tournament';

export const MAP_INFO: Record<MapType, { name: string; description: string }> = {
  power_tournament: { name: 'Torneo del Poder', description: 'Gran arena cósmica de Dragon Ball para 48 luchadores con pilar central' },
  floating_arena: { name: 'Arena Flotante', description: 'Plataformas flotantes y abismo central' },
  urban_rooftop: { name: 'Azotea Urbana', description: 'Azotea con obstáculos y rejillas de ventilación' },
  danger_island: { name: 'Isla de Magma', description: 'Anillo volcánico de lava ardiente' },
};

export interface PlayerStatusEffect {
  type: 'burn' | 'poison' | 'paralysis' | 'freeze';
  timer: number;
  attackerId?: string;
  attackerName?: string;
  tickTimer?: number;
}

export interface PlayerState {
  id: string;
  name: string;
  character: CharacterType;
  color: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotY: number;
  health: number;
  maxHealth: number;
  isAlive: boolean;
  isGrounded: boolean;
  isPunching: boolean;
  punchCooldown: number;
  isStunned: boolean;
  stunTimer: number;
  spawnGrace?: number;
  botIntent?: 'observing' | 'approaching' | 'winding_up' | 'recovering';
  attackKind?: 'jab' | 'hook' | 'uppercut' | 'kick' | 'dash';
  attackSequence?: number;
  attackDuration?: number;
  comboStep?: number;
  comboTimer?: number;
  actionTimer?: number;
  lastAttackerId?: string | null;
  hitCreditTimer?: number;
  carryTimer?: number;
  grabCooldown?: number;
  heldBombId: string | null;
  carriedPlayerId: string | null;
  carrierPlayerId: string | null;
  isCarried: boolean;
  techWindow?: boolean;
  powerUp: PowerUpType | null;
  powerUpTimer: number;
  specialBombType?: BombType | null;
  specialBombAmmo?: number;
  statusEffect?: PlayerStatusEffect | null;
  score: number;
  kills: number;
  deaths: number;
  ping: number;
}

export interface BombState {
  id: string;
  type: BombType;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fuse: number; // in seconds
  maxFuse: number;
  isAttached: boolean;
  attachedToPlayerId: string | null;
  radius: number;
  isArmed: boolean;
}

export interface PowerUpItem {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  z: number;
}

export interface CrateItem {
  id: string;
  x: number;
  y: number;
  z: number;
  health: number;
  maxHealth?: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  kills: number;
  deaths: number;
  color: string;
}

export interface GameEvent {
  type:
    | 'kill'
    | 'punch_hit'
    | 'explosion'
    | 'powerup_pickup'
    | 'jump'
    | 'respawn'
    | 'bomb_throw'
    | 'player_grab'
    | 'player_throw'
    | 'grab_breakout'
    | 'freeze_shatter'
    | 'crate_break'
    | 'heal'
    | 'status_damage';
  attackerId?: string;
  victimId?: string;
  attackerName?: string;
  victimName?: string;
  x?: number;
  y?: number;
  z?: number;
  bombType?: BombType;
  powerUpType?: PowerUpType;
  damage?: number;
}

export interface RoomState {
  roomId: string;
  difficulty?: number;
  mapType: MapType;
  timeRemaining: number;
  roundState: 'playing' | 'round_over';
  players: Record<string, PlayerState>;
  bombs: Record<string, BombState>;
  crates: Record<string, CrateItem>;
  powerUps: Record<string, PowerUpItem>;
  leaderboard: LeaderboardEntry[];
}

export type ClientMessage =
  | {
      type: 'join';
      name: string;
      character: CharacterType;
      color: string;
      cosmeticHat?: string;
      experienceSeconds?: number;
    }
  | {
      type: 'input';
      moveX: number;
      moveZ: number;
      jump: boolean;
      punch: boolean;
      kick?: boolean;
      throwBomb: boolean;
      dropBomb: boolean;
      grab: boolean;
      sprint: boolean;
      lookAngle: number;
      seq: number;
    }
  | {
      type: 'respawn';
    }
  | {
      type: 'ping';
      clientTime: number;
    };

export type ServerMessage =
  | {
      type: 'init';
      playerId: string;
      roomId: string;
      mapType: MapType;
    }
  | {
      type: 'snapshot';
      tick: number;
      serverTime: number;
      state: RoomState;
      events: GameEvent[];
    }
  | {
      type: 'pong';
      clientTime: number;
      serverTime: number;
    }
  | {
      type: 'map_change';
      mapType: MapType;
    };

export type GameInput = Omit<Extract<ClientMessage, { type: 'input' }>, 'type'>;
