import { BotController } from './ai/BotController.js';
import { ExperienceDirector } from './ai/ExperienceDirector.js';
import { WebSocket } from 'ws';
import {
  BombState,
  BombType,
  CharacterType,
  ClientMessage,
  CrateItem,
  GameEvent,
  GameInput,
  LeaderboardEntry,
  MapType,
  PlayerState,
  PowerUpItem,
  PowerUpType,
  RoomState,
} from '../../shared/types.js';
import { MAPS, MAP_ROTATION } from './Maps.js';
import { PhysicsWorld } from './PhysicsWorld.js';

type ClientInputState = GameInput;

export class GameRoom {
  readonly id: string;
  mapType: MapType = 'floating_arena';
  timeRemaining = 300; // 5 minutes
  roundState: 'playing' | 'round_over' = 'playing';
  roundOverTimer = 0;

  players = new Map<string, PlayerState>();
  sockets = new Map<string, WebSocket>();
  playerInputs = new Map<string, ClientInputState>();
  bombs = new Map<string, BombState>();
  crates = new Map<string, CrateItem>();
  powerUps = new Map<string, PowerUpItem>();
  private spawnerCooldowns = new Map<number, number>();
  private dropLifespans = new Map<string, number>();

  private tickCount = 0;
  private tickInterval: NodeJS.Timeout | null = null;
  private recentEvents: GameEvent[] = [];
  private bombIdCounter = 0;
  private bombCooldowns = new Map<string, number>();

  // AI Bots to keep the arena populated with 4-6 players
  private botIds: string[] = [];
  private bots = new BotController();
  private experience = new ExperienceDirector();

  constructor(id: string) {
    this.id = id;
    this.initializeMap(this.mapType);
    this.startLoop();
  }

  private initializeMap(mapType: MapType) {
    this.mapType = mapType;
    this.bots.reset();
    this.bombs.clear();
    this.crates.clear();
    this.powerUps.clear();
    this.spawnerCooldowns.clear();
    this.dropLifespans.clear();
    this.recentEvents = [];

    const map = MAPS[mapType];

    // Initialize crates
    map.initialCrates.forEach((c, idx) => {
      this.crates.set(`crate_${idx}`, {
        id: `crate_${idx}`,
        x: c.x,
        y: c.y,
        z: c.z,
        health: 25,
        maxHealth: 25,
      });
    });

    // Initialize power-ups with diverse pool
    const pTypes: PowerUpType[] = [
      'boxing_gloves',
      'jump_boots',
      'senzu_bean',
      'bomb_fire',
      'bomb_ice',
      'bomb_poison',
      'bomb_paralysis',
      'shield',
      'speed',
      'bomb_sticky',
    ];
    map.powerUpSpawners.forEach((sp, idx) => {
      this.powerUps.set(`pu_${idx}`, {
        id: `pu_${idx}`,
        type: pTypes[idx % pTypes.length],
        x: sp.x,
        y: sp.y + 0.5,
        z: sp.z,
      });
    });

    // Respawn all existing players
    for (const player of this.players.values()) {
      this.respawnPlayer(player);
    }
  }

  private getRandomSpawn(): { x: number; y: number; z: number } {
    const spawns = MAPS[this.mapType].spawns;
    const sp = spawns[Math.floor(Math.random() * spawns.length)];
    return {
      x: sp.x + (Math.random() - 0.5) * 2,
      y: sp.y + 0.5,
      z: sp.z + (Math.random() - 0.5) * 2,
    };
  }

  addPlayer(
    id: string,
    ws: WebSocket,
    name: string,
    character: CharacterType,
    color: string,
    experienceSeconds = 0
  ): PlayerState {
    const sp = this.getRandomSpawn();
    const player: PlayerState = {
      id,
      name: name || `Bomber_${id.slice(0, 4)}`,
      character: character || 'robot',
      color: color || '#3b82f6',
      x: sp.x,
      y: sp.y,
      z: sp.z,
      vx: 0,
      vy: 0,
      vz: 0,
      rotY: 0,
      health: 100,
      maxHealth: 100,
      isAlive: true,
      isGrounded: false,
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
      ping: 0,
      spawnGrace: 4,
    };

    this.experience.join(id, experienceSeconds);
    this.players.set(id, player);
    this.sockets.set(id, ws);
    this.playerInputs.set(id, {
      moveX: 0,
      moveZ: 0,
      jump: false,
      punch: false,
      throwBomb: false,
      dropBomb: false,
      grab: false,
      sprint: false,
      lookAngle: 0,
      seq: 0,
    });

    this.recentEvents.push({
      type: 'respawn',
      attackerId: id,
      attackerName: player.name,
      x: player.x,
      y: player.y,
      z: player.z,
    });

    this.ensureBots();
    return player;
  }

  removePlayer(id: string) {
    const player = this.players.get(id);
    if (player) {
      this.releaseHeldBomb(player);
      if (player.carriedPlayerId) {
        const victim = this.players.get(player.carriedPlayerId);
        if (victim) {
          victim.isCarried = false;
          victim.carrierPlayerId = null;
        }
      }
      if (player.carrierPlayerId) {
        const carrier = this.players.get(player.carrierPlayerId);
        if (carrier) {
          carrier.carriedPlayerId = null;
        }
      }
    }
    this.experience.leave(id);
    this.players.delete(id);
    this.sockets.delete(id);
    this.playerInputs.delete(id);
    this.bombCooldowns.delete(id);
    this.ensureBots();
  }

  handleInput(id: string, input: ClientInputState) {
    const player = this.players.get(id);
    if (!player || !player.isAlive) return;

    input.jump = input.jump || !!this.playerInputs.get(id)?.jump;
    this.playerInputs.set(id, input);
    if (player.isCarried || player.isStunned || this.roundState !== 'playing') return;
    if (input.punch || input.kick || input.grab || input.throwBomb || input.dropBomb) player.spawnGrace = 0;
    if (Number.isFinite(input.lookAngle)) player.rotY = input.lookAngle;
    if (input.kick) {
      PhysicsWorld.executePunch(player, Array.from(this.players.values()), this.recentEvents, true, input.sprint, Array.from(this.crates.values()));
    } else if (input.punch && !player.isPunching && player.punchCooldown <= 0) {
      // If holding an opponent, punch throws them!
      if (player.carriedPlayerId) {
        this.throwCarriedPlayer(player);
      } else {
        PhysicsWorld.executePunch(player, Array.from(this.players.values()), this.recentEvents, false, input.sprint, Array.from(this.crates.values()));
      }
    }

    // Grab / Lift opponent trigger
    if (input.grab) {
      if (player.carriedPlayerId) {
        this.throwCarriedPlayer(player);
      } else {
        this.handleGrabOpponent(player);
      }
    }

    // Throw / Spawn bomb trigger
    if (input.throwBomb) {
      if (player.carriedPlayerId) {
        // If holding an opponent, throw button throws the opponent towards edge!
        this.throwCarriedPlayer(player);
      } else {
        this.handlePlayerBombAction(player, false);
      }
    }

    // Drop bomb / drop opponent gently
    if (input.dropBomb) {
      if (player.carriedPlayerId) {
        const victim = this.players.get(player.carriedPlayerId);
        player.carriedPlayerId = null;
        if (victim) {
          victim.isCarried = false;
          victim.carrierPlayerId = null;
        }
      } else {
        this.handlePlayerBombAction(player, true);
      }
    }
  }

  private handleGrabOpponent(player: PlayerState) {
    if (!player.isAlive || player.isStunned || player.isCarried || player.heldBombId || player.carriedPlayerId || (player.grabCooldown ?? 0) > 0) return;
    player.grabCooldown = 0.65;

    let target: PlayerState | null = null;
    let minDistance = 2.4;
    const forwardX = Math.sin(player.rotY);
    const forwardZ = Math.cos(player.rotY);

    for (const other of this.players.values()) {
      if (other.id === player.id || !other.isAlive || other.isCarried || other.carriedPlayerId || (other.spawnGrace ?? 0) > 0) continue;
      const dx = other.x - player.x;
      const dy = other.y - player.y;
      const dz = other.z - player.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= minDistance && Math.abs(dy) <= 1.8) {
        const dot = (dx / (dist || 1)) * forwardX + (dz / (dist || 1)) * forwardZ;
        if (dot > 0.15) { // In front of player
          target = other;
          minDistance = dist;
        }
      }
    }

    if (target) {
      if (target.powerUp === 'shield') return;
      this.releaseHeldBomb(target);
      player.carryTimer = 0;
      player.carriedPlayerId = target.id;
      target.carrierPlayerId = player.id;
      target.isCarried = true;
      target.vx = 0;
      target.vy = 0;
      target.vz = 0;

      this.recentEvents.push({
        type: 'player_grab',
        attackerId: player.id,
        attackerName: player.name,
        victimId: target.id,
        victimName: target.name,
        x: target.x,
        y: target.y,
        z: target.z,
      });
    }
  }

  private throwCarriedPlayer(carrier: PlayerState) {
    if (!carrier.carriedPlayerId || carrier.isStunned || carrier.isCarried) return;

    const victim = this.players.get(carrier.carriedPlayerId);
    carrier.carriedPlayerId = null;

    if (victim && victim.isAlive) {
      victim.isCarried = false;
      victim.carrierPlayerId = null;
      victim.lastAttackerId = carrier.id;
      victim.hitCreditTimer = 5;
      victim.isStunned = true;
      victim.stunTimer = 0.85;
      carrier.actionTimer = 0.4;
      carrier.grabCooldown = 0.65;
      victim.isGrounded = false;

      const forwardX = Math.sin(carrier.rotY);
      const forwardZ = Math.cos(carrier.rotY);
      const throwSpeed = carrier.powerUp === 'strength' ? 28 : 20;

      // Hurl victim forward and upward
      victim.vx = forwardX * throwSpeed + carrier.vx * 0.4;
      victim.vy = 8.5;
      victim.vz = forwardZ * throwSpeed + carrier.vz * 0.4;

      this.recentEvents.push({
        type: 'player_throw',
        attackerId: carrier.id,
        attackerName: carrier.name,
        victimId: victim.id,
        victimName: victim.name,
        x: victim.x,
        y: victim.y,
        z: victim.z,
      });
    }
  }

  respawnPlayer(player: PlayerState) {
    this.releaseHeldBomb(player);
    if (player.carriedPlayerId) {
      const victim = this.players.get(player.carriedPlayerId);
      if (victim) { victim.isCarried = false; victim.carrierPlayerId = null; }
    }
    if (player.carrierPlayerId) {
      const carrier = this.players.get(player.carrierPlayerId);
      if (carrier) carrier.carriedPlayerId = null;
    }
    player.spawnGrace = 4;
    player.isGrounded = false;
    player.isPunching = false;
    player.punchCooldown = 0;
    player.comboStep = player.comboTimer = player.actionTimer = player.hitCreditTimer = player.carryTimer = player.grabCooldown = 0;
    player.lastAttackerId = null;
    const sp = this.getRandomSpawn();
    player.x = sp.x;
    player.y = sp.y;
    player.z = sp.z;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    player.health = 100;
    player.isAlive = true;
    player.isStunned = false;
    player.stunTimer = 0;
    player.heldBombId = null;
    player.carriedPlayerId = null;
    player.carrierPlayerId = null;
    player.isCarried = false;
    player.powerUp = null;
    player.powerUpTimer = 0;
    player.specialBombType = null;
    player.specialBombAmmo = 0;
    player.statusEffect = null;

    this.recentEvents.push({
      type: 'respawn',
      victimId: player.id,
      victimName: player.name,
      x: player.x,
      y: player.y,
      z: player.z,
    });
  }

  private releaseHeldBomb(player: PlayerState) {
    const bomb = player.heldBombId ? this.bombs.get(player.heldBombId) : undefined;
    if (bomb) { bomb.isAttached = false; bomb.attachedToPlayerId = null; }
    player.heldBombId = null;
    return bomb;
  }

  private handlePlayerBombAction(player: PlayerState, isDrop: boolean) {
    if (!player.isAlive || player.isStunned || player.statusEffect?.type === 'paralysis' || player.isCarried) return;
    const fx = Math.sin(player.rotY), fz = Math.cos(player.rotY);
    let bomb = player.heldBombId ? this.releaseHeldBomb(player) : undefined;
    if (!bomb) {
      if ((this.bombCooldowns.get(player.id) ?? 0) > 0) return;
      // Return a live bomb without resetting its fuse.
      bomb = Array.from(this.bombs.values()).filter(b => !b.isAttached && Math.hypot(b.x - player.x, b.y - player.y, b.z - player.z) < 2)
        .sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0];
      if (!bomb) {
        const id = `bomb_${++this.bombIdCounter}`;
        let bType: BombType = 'normal';
        let fuse = 2.8;
        if (player.specialBombType && (player.specialBombAmmo ?? 0) > 0) {
          bType = player.specialBombType;
          player.specialBombAmmo = (player.specialBombAmmo ?? 0) - 1;
          if (player.specialBombAmmo <= 0) {
            player.specialBombType = null;
          }
          if (bType === 'sticky') fuse = 3.2;
          else if (bType === 'fire') fuse = 2.4;
          else if (bType === 'poison') fuse = 2.6;
          else if (bType === 'paralysis') fuse = 2.8;
        }
        bomb = { id, type: bType, ownerId: player.id, x: player.x + fx * 0.85, y: player.y + 1.15, z: player.z + fz * 0.85,
          vx: 0, vy: 0, vz: 0, fuse, maxFuse: fuse, isAttached: false, attachedToPlayerId: null, radius: 0.55, isArmed: true };
        this.bombs.set(id, bomb);
      }
      bomb.ownerId = player.id;
      if (!isDrop && !player.id.startsWith('bot_')) {
        player.heldBombId = bomb.id;
        bomb.isAttached = true;
        bomb.attachedToPlayerId = player.id;
        bomb.x = player.x + fx * 0.85;
        bomb.y = player.y + 1.15;
        bomb.z = player.z + fz * 0.85;
        return;
      }
    }
    const speed = isDrop ? 2.5 : player.powerUp === 'strength' ? 23 : 17;
    bomb.x = player.x + fx * 0.85;
    bomb.y = player.y + 1.15;
    bomb.z = player.z + fz * 0.85;
    bomb.vx = fx * speed + player.vx * 0.4;
    bomb.vy = isDrop ? 1 : 7;
    bomb.vz = fz * speed + player.vz * 0.4;
    player.actionTimer = 0.4;
    this.bombCooldowns.set(player.id, 0.8);
    this.recentEvents.push({ type: 'bomb_throw', attackerId: player.id, bombType: bomb.type, x: bomb.x, y: bomb.y, z: bomb.z });
  }

  private ensureBots() {
    const realPlayerCount = Array.from(this.players.values()).filter(
      (p) => !p.id.startsWith('bot_')
    ).length;

    const targetBotCount = Math.max(0, 4 - realPlayerCount);

    // Remove surplus bots
    while (this.botIds.length > targetBotCount) {
      const bId = this.botIds.pop()!;
      const removedBot = this.players.get(bId);
      if (removedBot) {
        this.releaseHeldBomb(removedBot);
        const victim = removedBot.carriedPlayerId ? this.players.get(removedBot.carriedPlayerId) : undefined;
        if (victim) { victim.isCarried = false; victim.carrierPlayerId = null; }
        const carrier = removedBot.carrierPlayerId ? this.players.get(removedBot.carrierPlayerId) : undefined;
        if (carrier) carrier.carriedPlayerId = null;
      }
      this.players.delete(bId);
      this.playerInputs.delete(bId);
      this.bots.remove(bId);
    }

    // Add required bots
    const botNames = ['NitroBot', 'Bombastic', 'Sparky', 'Dynamo', 'Gizmo', 'Clank'];
    const botCharacters: CharacterType[] = ['robot', 'ninja', 'pirate', 'alien', 'astronaut', 'explorer'];
    const botColors = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    while (this.botIds.length < targetBotCount) {
      const idx = this.botIds.length;
      const bId = `bot_${idx + 1}`;
      const sp = this.getRandomSpawn();
      const botPlayer: PlayerState = {
        id: bId,
        name: botNames[idx % botNames.length],
        character: botCharacters[idx % botCharacters.length],
        color: botColors[idx % botColors.length],
        x: sp.x,
        y: sp.y,
        z: sp.z,
        vx: 0,
        vy: 0,
        vz: 0,
        rotY: Math.random() * Math.PI * 2,
        health: 100,
        maxHealth: 100,
        isAlive: true,
        isGrounded: false,
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
        ping: 5,
      };

      this.players.set(bId, botPlayer);
      this.botIds.push(bId);

      this.playerInputs.set(bId, {
        moveX: 0,
        moveZ: 0,
        jump: false,
        punch: false,
        throwBomb: false,
        dropBomb: false,
        grab: false,
        sprint: false,
        lookAngle: 0,
        seq: 0,
      });
    }
  }

  private updateBots(dt: number) {
    this.bots.update(dt, this.botIds, {
      players: this.players,
      mapType: this.mapType,
      difficulty: this.experience.difficulty,
      send: (id, input) => this.handleInput(id, input),
      respawn: player => this.respawnPlayer(player),
    });
  }

  private startLoop() {
    const TICK_RATE = 45;
    const dt = 1 / TICK_RATE;

    this.tickInterval = setInterval(() => {
      this.update(dt);
    }, 1000 / TICK_RATE);
  }

  private update(dt: number) {
    this.tickCount++;

    // Decrement bomb cooldowns
    for (const [pId, cd] of this.bombCooldowns.entries()) {
      if (cd > 0) {
        this.bombCooldowns.set(pId, Math.max(0, cd - dt));
      }
    }

    // Round timer logic
    if (this.roundState === 'playing') {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.roundState = 'round_over';
        this.roundOverTimer = 6.0; // 6s victory screen
      }
    } else if (this.roundState === 'round_over') {
      this.roundOverTimer -= dt;
      if (this.roundOverTimer <= 0) {
        // Advance to next map
        const currentIndex = MAP_ROTATION.indexOf(this.mapType);
        const nextIndex = (currentIndex + 1) % MAP_ROTATION.length;
        const nextMap = MAP_ROTATION[nextIndex];
        this.mapType = nextMap;
        this.timeRemaining = 300;
        this.roundState = 'playing';
        this.initializeMap(nextMap);
      }
    }

    // Update bots
    if (this.roundState === 'playing') {
      this.experience.update(dt, this.players.values());
      this.updateBots(dt);
    } else {
      for (const input of this.playerInputs.values()) { input.moveX = input.moveZ = 0; input.jump = false; }
    }

    // Process carried players: timer, tech recovery breakout, and expiration
    for (const carrier of this.players.values()) {
      if (carrier.carriedPlayerId) {
        const victim = this.players.get(carrier.carriedPlayerId);
        carrier.carryTimer = (carrier.carryTimer ?? 0) + dt;

        if (victim && victim.isAlive && carrier.isAlive && !carrier.isStunned && carrier.carryTimer < 3) {
          // Sweet-spot tech escape window: between 0.5s and 1.8s
          const inTechWindow = carrier.carryTimer >= 0.5 && carrier.carryTimer <= 1.8;
          victim.techWindow = inTechWindow;

          // Check if victim attempts a breakout (Jump, Punch, or Grab)
          const victimInput = this.playerInputs.get(victim.id);
          let wantsBreakout = false;
          if (victimInput && (victimInput.jump || victimInput.punch || victimInput.grab)) {
            wantsBreakout = true;
            victimInput.jump = false;
            victimInput.punch = false;
            victimInput.grab = false;
          }

          // Smart bot tech breakout based on difficulty
          if (!wantsBreakout && victim.name.startsWith('Bot_')) {
            const diff = this.experience.difficulty;
            if (inTechWindow && Math.random() < diff * 0.08) {
              wantsBreakout = true;
            }
          }

          if (wantsBreakout && inTechWindow) {
            // SUCCESSFUL GRAB TECH BREAKOUT!
            carrier.carriedPlayerId = null;
            carrier.isStunned = true;
            carrier.stunTimer = 1.2;
            carrier.grabCooldown = 2.0;

            // Knock carrier back
            const fwdX = Math.sin(carrier.rotY);
            const fwdZ = Math.cos(carrier.rotY);
            carrier.vx = -fwdX * 5.5;
            carrier.vz = -fwdZ * 5.5;

            // Acrobatic backflip escape for victim
            victim.isCarried = false;
            victim.carrierPlayerId = null;
            victim.techWindow = false;
            victim.isGrounded = false;
            victim.vy = 12.5; // Vault high up
            victim.vx = -fwdX * 7.5;
            victim.vz = -fwdZ * 7.5;
            victim.spawnGrace = 0.6; // Brief iframe

            this.recentEvents.push({
              type: 'grab_breakout',
              attackerId: victim.id,
              attackerName: victim.name,
              victimId: carrier.id,
              victimName: carrier.name,
              x: victim.x,
              y: victim.y + 1,
              z: victim.z,
            });
            continue;
          }
        } else {
          // Carrier stunned, died, or timer expired: release
          carrier.carriedPlayerId = null;
          if (victim) {
            victim.isCarried = false;
            victim.carrierPlayerId = null;
            victim.techWindow = false;
            victim.isGrounded = false;
            carrier.grabCooldown = 1;
          }
        }
      }
    }

    // Update each player with physics
    for (const [id, player] of this.players.entries()) {
      const input = this.playerInputs.get(id) || {
        moveX: 0,
        moveZ: 0,
        jump: false,
        punch: false,
        throwBomb: false,
        dropBomb: false,
        sprint: false,
        lookAngle: 0,
        seq: 0,
      };
      const wasAlive = player.isAlive;
      PhysicsWorld.updatePlayer(player, input, this.mapType, dt, this.recentEvents);
      input.jump = false;
      if (wasAlive && !player.isAlive) {
        const killer = player.lastAttackerId ? this.players.get(player.lastAttackerId) : undefined;
        if (killer && killer.id !== player.id) {
          killer.kills++;
          killer.score += 100;
          const event = [...this.recentEvents].reverse().find(e => e.type === 'kill' && e.victimId === player.id);
          if (event) event.attackerName = killer.name;
        }
      }
      if (player.heldBombId && (!player.isAlive || player.isStunned)) this.releaseHeldBomb(player);
    }

    // Synchronize positions of carried opponents above carrier's head
    for (const carrier of this.players.values()) {
      if (carrier.carriedPlayerId) {
        const victim = this.players.get(carrier.carriedPlayerId);
        if (victim && victim.isAlive) {
          victim.x = carrier.x;
          victim.y = carrier.y + 1.85;
          victim.z = carrier.z;
          victim.rotY = carrier.rotY;
          victim.vx = carrier.vx;
          victim.vy = carrier.vy;
          victim.vz = carrier.vz;
        }
      }
    }

    // Player vs Player collisions
    PhysicsWorld.resolvePlayerCollisions(Array.from(this.players.values()));

    // 1. Process spawner respawn cooldowns
    const currentMap = MAPS[this.mapType];
    const pPool: PowerUpType[] = [
      'boxing_gloves',
      'jump_boots',
      'senzu_bean',
      'bomb_fire',
      'bomb_ice',
      'bomb_poison',
      'bomb_paralysis',
      'shield',
      'speed',
      'bomb_sticky',
    ];

    for (const [idx, timer] of this.spawnerCooldowns.entries()) {
      const nextTimer = timer - dt;
      if (nextTimer <= 0) {
        this.spawnerCooldowns.delete(idx);
        const sp = currentMap.powerUpSpawners[idx];
        if (sp) {
          const newType = pPool[Math.floor(Math.random() * pPool.length)];
          this.powerUps.set(`pu_${idx}`, {
            id: `pu_${idx}`,
            type: newType,
            x: sp.x,
            y: sp.y + 0.5,
            z: sp.z,
          });
        }
      } else {
        this.spawnerCooldowns.set(idx, nextTimer);
      }
    }

    // 2. Process crate drop lifespans (auto-despawn uncollected drops after 25s)
    for (const [dropId, timer] of this.dropLifespans.entries()) {
      const nextTimer = timer - dt;
      if (nextTimer <= 0) {
        this.dropLifespans.delete(dropId);
        this.powerUps.delete(dropId);
      } else {
        this.dropLifespans.set(dropId, nextTimer);
      }
    }

    // 3. Power-up pickups
    const collectedPuIds: string[] = [];
    for (const pu of this.powerUps.values()) {
      for (const p of this.players.values()) {
        if (!p.isAlive) continue;
        const dx = p.x - pu.x;
        const dy = p.y - pu.y;
        const dz = p.z - pu.z;
        if (Math.hypot(dx, dz) < 1.6 && Math.abs(dy) < 2.0) {
          if (pu.type === 'senzu_bean') {
            p.health = Math.min(p.maxHealth, p.health + 50);
            this.recentEvents.push({
              type: 'heal',
              attackerId: p.id,
              attackerName: p.name,
              damage: 50,
              x: p.x,
              y: p.y + 1,
              z: p.z,
            });
          } else if (pu.type.startsWith('bomb_')) {
            const bType = pu.type.replace('bomb_', '') as BombType;
            p.specialBombType = bType;
            p.specialBombAmmo = 3; // 3 special bombs loaded!
          } else {
            p.powerUp = pu.type;
            p.powerUpTimer = pu.type === 'boxing_gloves' || pu.type === 'jump_boots' ? 15.0 : 12.0;
          }

          this.recentEvents.push({
            type: 'powerup_pickup',
            attackerId: p.id,
            attackerName: p.name,
            powerUpType: pu.type,
            x: pu.x,
            y: pu.y,
            z: pu.z,
          });

          collectedPuIds.push(pu.id);
          if (pu.id.startsWith('pu_')) {
            const idx = parseInt(pu.id.replace('pu_', ''), 10);
            if (!isNaN(idx)) {
              this.spawnerCooldowns.set(idx, 10.0); // 10 second respawn cooldown
            }
          } else if (pu.id.startsWith('drop_')) {
            this.dropLifespans.delete(pu.id);
          }
          break;
        }
      }
    }
    for (const id of collectedPuIds) {
      this.powerUps.delete(id);
    }

    // Update bombs
    const bombArray = Array.from(this.bombs.values());
    const playerRecord: Record<string, PlayerState> = {};
    for (const [k, v] of this.players.entries()) playerRecord[k] = v;

    const { explodedBombIds } = PhysicsWorld.updateBombs(
      bombArray,
      playerRecord,
      this.mapType,
      dt,
      this.recentEvents
    );

    // Explode finished bombs
    for (const bId of explodedBombIds) {
      const bomb = this.bombs.get(bId);
      if (bomb) {
        PhysicsWorld.detonateExplosion(
          bomb,
          bombArray,
          Array.from(this.players.values()),
          Array.from(this.crates.values()),
          this.recentEvents
        );
        for (const player of this.players.values()) {
          if (player.heldBombId === bId) player.heldBombId = null;
        }
        this.bombs.delete(bId);
      }
    }

    // Process broken crates and drop rewards
    for (const [cId, crate] of this.crates.entries()) {
      if (crate.health <= 0) {
        this.crates.delete(cId);
        // 85% chance of item drop from broken crate
        if (Math.random() < 0.85) {
          const dropPool: PowerUpType[] = [
            'boxing_gloves',
            'jump_boots',
            'senzu_bean',
            'bomb_fire',
            'bomb_ice',
            'bomb_poison',
            'bomb_paralysis',
            'bomb_sticky',
            'shield',
            'speed',
          ];
          const chosen = dropPool[Math.floor(Math.random() * dropPool.length)];
          const dropId = `drop_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
          const floorY = currentMap.getFloorHeight(crate.x, crate.z);
          const dropY = (floorY !== null && !isNaN(floorY)) ? floorY + 0.5 : crate.y + 0.4;
          this.powerUps.set(dropId, {
            id: dropId,
            type: chosen,
            x: crate.x,
            y: dropY,
            z: crate.z,
          });
          this.dropLifespans.set(dropId, 25.0); // 25s auto-despawn
        }
      }
    }

    // Periodically respawn crates if arena is depleted
    if (this.crates.size < 6 && this.tickCount % 450 === 0) {
      const map = MAPS[this.mapType];
      const template = map.initialCrates[Math.floor(Math.random() * map.initialCrates.length)];
      if (template) {
        const id = `crate_res_${this.tickCount}`;
        this.crates.set(id, {
          id,
          x: template.x + (Math.random() - 0.5) * 2,
          y: template.y,
          z: template.z + (Math.random() - 0.5) * 2,
          health: 25,
          maxHealth: 25,
        });
      }
    }

    // Broadcast snapshot to all connected clients
    this.broadcastSnapshot();
    this.recentEvents = []; // Clear events after broadcast
  }

  private broadcastSnapshot() {
    const playersObj: Record<string, PlayerState> = {};
    for (const [id, p] of this.players.entries()) {
      playersObj[id] = p;
    }

    const bombsObj: Record<string, BombState> = {};
    for (const [id, b] of this.bombs.entries()) {
      bombsObj[id] = b;
    }

    const cratesObj: Record<string, CrateItem> = {};
    for (const [id, c] of this.crates.entries()) {
      cratesObj[id] = c;
    }

    const powerUpsObj: Record<string, PowerUpItem> = {};
    for (const [id, pu] of this.powerUps.entries()) {
      powerUpsObj[id] = pu;
    }

    // Compute leaderboard (Top 5)
    const leaderboard: LeaderboardEntry[] = Array.from(this.players.values())
      .map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        kills: p.kills,
        deaths: p.deaths,
        color: p.color,
      }))
      .sort((a, b) => b.kills * 100 + b.score - (a.kills * 100 + a.score))
      .slice(0, 6);

    const roomState: RoomState = {
      roomId: this.id,
      difficulty: this.experience.difficulty,
      mapType: this.mapType,
      timeRemaining: Math.ceil(this.timeRemaining),
      roundState: this.roundState,
      players: playersObj,
      bombs: bombsObj,
      crates: cratesObj,
      powerUps: powerUpsObj,
      leaderboard,
    };

    const message = JSON.stringify({
      type: 'snapshot',
      tick: this.tickCount,
      serverTime: Date.now(),
      state: roomState,
      events: this.recentEvents,
    });

    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
