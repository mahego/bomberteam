import { RenderPipeline } from './rendering/RenderPipeline';
import { nextAttack } from '@shared/gameplay';
import { readProfile } from '../state/PlayerProfile';
import * as THREE from 'three';
import {
  CharacterType,
  ClientMessage,
  GameEvent,
  MapType,
  PlayerState,
  RoomState,
  ServerMessage,
} from '@shared/types';
import { CharacterModel } from './CharacterModel';
import { BombModel, PowerUpModel, CrateModel } from './BombModel';
import { ParticleSystem } from './ParticleSystem';
import { MapRenderer } from './MapRenderer';
import { soundManager } from './SoundEffects';
import { InputManager, InputState } from './InputManager';

export class GameEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private pipeline!: RenderPipeline;

  private characters = new Map<string, CharacterModel>();
  private bombs = new Map<string, BombModel>();
  private powerUps = new Map<string, PowerUpModel>();
  private crates = new Map<string, CrateModel>();

  private particles = new ParticleSystem();
  private mapRenderer = new MapRenderer();
  public inputManager = new InputManager();

  private ws: WebSocket | null = null;
  public myPlayerId: string | null = null;
  public currentRoomState: RoomState | null = null;
  public ping = 0;

  // Camera dynamics
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraOffset = new THREE.Vector3(0, 20, 16);
  private screenShakeIntensity = 0;
  private aimRay = new THREE.Raycaster();
  private aimPointer = new THREE.Vector2();
  private hasPointer = false;
  private snapshotAge = 0;
  private aimArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1.8, 0x67e8f9, 0.45, 0.3);
  private throwArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 25 }, () => new THREE.Vector3())), new THREE.LineDashedMaterial({ color: 0xfbbf24, dashSize: 0.3, gapSize: 0.18, transparent: true, opacity: 0.8 }));

  // Event callbacks for UI
  public onStateUpdate?: (state: RoomState, myPlayer?: PlayerState) => void;
  public onKillFeed?: (event: GameEvent) => void;
  public onConnected?: () => void;
  public onDisconnected?: () => void;

  private isRunning = false;
  private lastTime = performance.now();
  private animFrameId: number | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private inputElapsed = 0;
  private destroyed = false;

  // Local client prediction state
  private predictedAction: { state: Partial<PlayerState>; remaining: number } | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initThree();
    this.setupListeners();
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep modern dark slate
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.018);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.pipeline = new RenderPipeline(this.renderer, this.scene, this.camera);
    this.pipeline.resize(width, height);

    // Add particle and map systems
    this.scene.add(this.mapRenderer.group);
    this.scene.add(this.particles.group, this.aimArrow, this.throwArc);
    this.aimArrow.visible = this.throwArc.visible = false;
  }

  private setupListeners() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
    this.inputManager.onAction = this.flushImmediateAction;
  }

  private onResize = () => {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.pipeline.resize(width, height);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('button, .combat-joystick, .combat-actions')) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.aimPointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.hasPointer = true;
    this.inputManager.aimWithMouse = true;
  };

  private updateAim() {
    const player = this.getMyPlayer();
    if (!player || !this.hasPointer || !this.inputManager.aimWithMouse) return;
    this.aimRay.setFromCamera(this.aimPointer, this.camera);
    const point = new THREE.Vector3();
    if (this.aimRay.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -player.y), point)) {
      this.inputManager.lookAngle = Math.atan2(point.x - player.x, point.z - player.z);
    }
  }

  private toScreenPosition(pos: THREE.Vector3): { x: number; y: number } {
    const v = pos.clone().project(this.camera);
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    return {
      x: ((v.x + 1) * width) / 2,
      y: ((-v.y + 1) * height) / 2,
    };
  }

  connect(playerName: string, character: CharacterType, color: string) {
    // Determine WebSocket host URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In dev, Vite proxies /ws to :3001. If accessed directly on port, connect to :3001 or current host
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log(`[Client] Connecting to WebSocket at ${wsUrl}...`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[Client] Connected to server!');
      this.onConnected?.();

      const joinMsg: ClientMessage = {
        type: 'join',
        experienceSeconds: readProfile().experienceSeconds,
        name: playerName,
        character,
        color,
      };
      this.send(joinMsg);
      this.startPingLoop();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch (err) {
        console.error('[Client] Message parse error:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[Client] Disconnected from server');
      this.destroy();
      this.onDisconnected?.();
    };

    this.ws.onerror = (err) => {
      console.error('[Client] WebSocket error:', err);
    };

    this.startRenderLoop();
  }

  private send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startPingLoop() {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', clientTime: Date.now() });
      }
    }, 2000);
  }

  private handleServerMessage(msg: ServerMessage) {
    if (msg.type === 'init') {
      this.myPlayerId = msg.playerId;
      this.mapRenderer.buildMap(msg.mapType);
      this.pipeline.setTheme(msg.mapType);
    } else if (msg.type === 'snapshot') {
      this.currentRoomState = msg.state;
      this.snapshotAge = 0;
      this.mapRenderer.buildMap(msg.state.mapType);
      this.pipeline.setTheme(msg.state.mapType);

      // Trigger events (sounds, particles, screen shake)
      for (const ev of msg.events) {
        this.handleGameEvent(ev);
      }

      // Sync entities
      this.syncEntities(msg.state);

      // Update UI HUD
      const myPlayer = this.getMyPlayer();
      this.onStateUpdate?.(msg.state, myPlayer);
    } else if (msg.type === 'pong') {
      this.ping = Math.round((Date.now() - msg.clientTime) / 2);
    }
  }

  private handleGameEvent(ev: GameEvent) {
    const x = ev.x ?? 0;
    const y = ev.y ?? 0;
    const z = ev.z ?? 0;

    if (ev.type === 'explosion') {
      soundManager.playExplosion();
      if (ev.bombType === 'poison') {
        soundManager.playPoison();
        this.particles.spawnPoisonCloud(x, y, z);
      } else if (ev.bombType === 'fire') {
        soundManager.playBurn();
        this.particles.spawnFireBurst(x, y, z);
      } else if (ev.bombType === 'paralysis') {
        soundManager.playFreeze();
        this.particles.spawnParalysisShock(x, y, z);
      } else if (ev.bombType === 'ice') {
        soundManager.playFreeze();
        this.particles.spawnExplosion(x, y, z, 0x38bdf8);
      }
      this.particles.spawnExplosion(
        x,
        y,
        z,
        ev.bombType === 'poison' ? 0x4ade80 : ev.bombType === 'paralysis' || ev.bombType === 'ice' ? 0x67dfff : 0xff9b35
      );
      this.pipeline.impact(
        x,
        y,
        z,
        ev.bombType === 'poison' ? 0x4ade80 : ev.bombType === 'paralysis' || ev.bombType === 'ice' ? 0x67dfff : 0xff9b35
      );
      this.triggerScreenShake(0.85);
    } else if (ev.type === 'punch_hit') {
      soundManager.playPunch();
      this.particles.spawnPunchImpact(x, y, z);
      this.triggerScreenShake(0.3);
    } else if (ev.type === 'freeze_shatter') {
      soundManager.playFreezeShatter();
      this.particles.spawnCrateBreak(x, y, z);
      this.triggerScreenShake(0.4);
    } else if (ev.type === 'grab_breakout') {
      soundManager.playGrabBreakout();
      this.particles.spawnRespawnPuff(x, y, z);
      this.triggerScreenShake(0.65);
    } else if (ev.type === 'crate_break') {
      soundManager.playCrateBreak();
      this.particles.spawnCrateBreak(x, y, z);
      this.triggerScreenShake(0.35);
    } else if (ev.type === 'heal') {
      soundManager.playHeal();
      this.particles.spawnHealAura(x, y, z);
    } else if (ev.type === 'status_damage') {
      if (ev.victimId === this.myPlayerId) {
        this.triggerScreenShake(0.12);
      }
    } else if (ev.type === 'bomb_throw') {
      soundManager.playThrow();
    } else if (ev.type === 'jump') {
      soundManager.playJump();
    } else if (ev.type === 'powerup_pickup') {
      soundManager.playPowerup();
    } else if (ev.type === 'respawn') {
      soundManager.playRespawn();
      this.particles.spawnRespawnPuff(x, y, z);
    } else if (ev.type === 'player_grab') {
      soundManager.playPunch();
      this.triggerScreenShake(0.25);
    } else if (ev.type === 'player_throw') {
      soundManager.playThrow();
      this.triggerScreenShake(0.45);
    } else if (ev.type === 'kill') {
      this.onKillFeed?.(ev);
      this.triggerScreenShake(0.5);
    }
  }

  private syncEntities(state: RoomState) {
    // 1. Players
    const activePlayerIds = new Set(Object.keys(state.players));

    // Remove deleted players
    for (const [id, model] of this.characters.entries()) {
      if (!activePlayerIds.has(id)) {
        this.scene.remove(model.group);
        model.destroy();
        this.characters.delete(id);
      }
    }

    // Add or update players
    for (const [id, p] of Object.entries(state.players)) {
      let model = this.characters.get(id);
      if (!model) {
        model = new CharacterModel(p.character, p.color, p.name);
        this.characters.set(id, model);
        this.scene.add(model.group);
      }
      // Animation and interpolation run every rendered frame.
    }

    // 2. Bombs
    const activeBombIds = new Set(Object.keys(state.bombs));
    for (const [id, model] of this.bombs.entries()) {
      if (!activeBombIds.has(id)) {
        this.scene.remove(model.group);
        model.destroy();
        this.bombs.delete(id);
      }
    }
    for (const [id, b] of Object.entries(state.bombs)) {
      let model = this.bombs.get(id);
      if (!model) {
        model = new BombModel(b);
        this.bombs.set(id, model);
        this.scene.add(model.group);
      }
      model.update(b, 0.033);
    }

    // 3. PowerUps
    const activePuIds = new Set(Object.keys(state.powerUps));
    for (const [id, model] of this.powerUps.entries()) {
      if (!activePuIds.has(id)) {
        this.scene.remove(model.group);
        model.destroy();
        this.powerUps.delete(id);
      }
    }
    for (const [id, pu] of Object.entries(state.powerUps)) {
      let model = this.powerUps.get(id);
      if (!model) {
        model = new PowerUpModel(pu);
        this.powerUps.set(id, model);
        this.scene.add(model.group);
      } else {
        model.updateData(pu);
      }
    }

    // 4. Crates
    const activeCrateIds = new Set(Object.keys(state.crates));
    for (const [id, model] of this.crates.entries()) {
      if (!activeCrateIds.has(id)) {
        this.scene.remove(model.group);
        model.destroy();
        this.crates.delete(id);
      }
    }
    for (const [id, crate] of Object.entries(state.crates)) {
      let model = this.crates.get(id);
      if (!model) {
        model = new CrateModel(crate);
        this.crates.set(id, model);
        this.scene.add(model.group);
      } else {
        model.updateData(crate);
      }
    }
  }

  public getMyPlayer(): PlayerState | undefined {
    if (!this.myPlayerId || !this.currentRoomState) return undefined;
    return this.currentRoomState.players[this.myPlayerId];
  }

  public respawnNow() {
    this.send({ type: 'respawn' });
  }

  public triggerScreenShake(intensity: number) {
    this.screenShakeIntensity = Math.min(1.5, this.screenShakeIntensity + intensity);
  }

  private startRenderLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
      this.lastTime = currentTime;

      this.update(dt);
      this.pipeline.render(dt, this.scene, this.camera);

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private predictLocalAction(input: ReturnType<InputManager['getCurrentInput']>) {
    const localPlayer = this.getMyPlayer();
    if (!localPlayer || !localPlayer.isAlive || localPlayer.isStunned || localPlayer.isCarried) return;

    if ((input.kick || input.punch) && !localPlayer.heldBombId && !localPlayer.carriedPlayerId && localPlayer.punchCooldown <= 0 && !this.predictedAction) {
      const attack = nextAttack(localPlayer, input.kick, input.sprint);
      this.predictedAction = { remaining: 0.12, state: { isPunching: true, attackKind: attack.kind, comboStep: attack.combo, punchCooldown: attack.duration, actionTimer: attack.duration, attackDuration: attack.duration } };
      soundManager.playSwing(input.kick);
    }
  }

  private flushImmediateAction = () => {
    this.updateAim();
    const input = this.inputManager.getCurrentInput();
    this.send({ type: 'input', ...input });
    this.predictLocalAction(input);
  };

  private update(dt: number) {
    this.snapshotAge = Math.min(0.1, this.snapshotAge + dt);
    if (this.predictedAction) {
      this.predictedAction.remaining -= dt;
      this.predictedAction.state.punchCooldown = Math.max(0, (this.predictedAction.state.punchCooldown ?? 0) - dt);
      if (this.predictedAction.remaining <= 0) this.predictedAction = null;
    }
    this.updateAim();
    // Send client input
    const input = this.inputManager.getCurrentInput();
    this.inputElapsed += dt;
    if (this.inputElapsed >= 1 / 30 || input.jump || input.punch || input.kick || input.grab || input.throwBomb || input.dropBomb) {
      this.send({ type: 'input', ...input });
      this.inputElapsed %= 1 / 30;
    }

    if (this.currentRoomState) {
      for (const [id, model] of this.characters) {
        const player = this.currentRoomState.players[id];
        const isLocal = id === this.myPlayerId;
        if (player) {
          model.update(
            {
              ...player,
              punchCooldown: Math.max(0, player.punchCooldown - this.snapshotAge),
              actionTimer: Math.max(0, (player.actionTimer ?? 0) - this.snapshotAge),
              ...(isLocal ? this.predictedAction?.state : {}),
            },
            dt,
            isLocal
          );
        }
      }
    }

    const localPlayer = this.getMyPlayer();
    this.aimArrow.visible = !!localPlayer?.isAlive && !localPlayer.isCarried;
    this.throwArc.visible = this.aimArrow.visible && !!localPlayer?.heldBombId;
    if (localPlayer && this.aimArrow.visible) {
      const fx = Math.sin(input.lookAngle), fz = Math.cos(input.lookAngle);
      const renderedPosition = this.characters.get(localPlayer.id)?.group.position;
      this.aimArrow.position.set(renderedPosition?.x ?? localPlayer.x, (renderedPosition?.y ?? localPlayer.y) + 0.12, renderedPosition?.z ?? localPlayer.z);
      this.aimArrow.setDirection(new THREE.Vector3(fx, 0, fz));
      if (this.throwArc.visible) {
        const points: THREE.Vector3[] = [];
        const speed = localPlayer.powerUp === 'strength' ? 23 : 17;
        for (let i = 0; i <= 24; i++) {
          const t = i * 0.04;
          const y = localPlayer.y + 1.15 + 7 * t - 13 * t * t;
          if (y < localPlayer.y && i > 0) break;
          points.push(new THREE.Vector3(localPlayer.x + fx * 0.85 + (fx * speed + localPlayer.vx * 0.4) * t, y, localPlayer.z + fz * 0.85 + (fz * speed + localPlayer.vz * 0.4) * t));
        }
        this.throwArc.geometry.setFromPoints(points);
        this.throwArc.geometry.setDrawRange(0, points.length);
        this.throwArc.geometry.computeBoundingSphere();
        this.throwArc.computeLineDistances();
      }
    }

    // Update powerups animation
    for (const pu of this.powerUps.values()) {
      pu.update(dt);
    }

    // Update map elements (fans, lava pulse)
    this.mapRenderer.update(dt);

    // Update particles
    this.particles.update(dt);

    // Smooth camera tracking on local player
    const myPlayer = this.getMyPlayer();
    if (myPlayer && myPlayer.isAlive) {
      // Damped target interpolation
      this.cameraTarget.lerp(new THREE.Vector3(myPlayer.x, myPlayer.y, myPlayer.z), 1 - Math.exp(-8 * dt));
    }

    // Apply camera positioning
    const desiredPos = this.cameraTarget.clone().add(this.cameraOffset);

    // Apply screen shake
    if (this.screenShakeIntensity > 0.01) {
      const sx = (Math.random() - 0.5) * this.screenShakeIntensity * 1.6;
      const sy = (Math.random() - 0.5) * this.screenShakeIntensity * 1.6;
      const sz = (Math.random() - 0.5) * this.screenShakeIntensity * 1.6;
      desiredPos.add(new THREE.Vector3(sx, sy, sz));
      this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - dt * 2.8);
    }

    this.camera.position.lerp(desiredPos, 1 - Math.exp(-13 * dt));
    this.camera.lookAt(this.cameraTarget);
  }

  setGraphicsQuality(cinematic: boolean) { this.pipeline.setQuality(cinematic); }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.inputManager.onAction = undefined;
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.inputManager.destroy();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.close();
    }
    for (const model of this.characters.values()) model.destroy();
    for (const model of this.bombs.values()) model.destroy();
    this.aimArrow.dispose();
    this.throwArc.geometry.dispose();
    this.throwArc.material.dispose();
    for (const model of this.powerUps.values()) model.destroy();
    for (const model of this.crates.values()) model.destroy();
    this.mapRenderer.clear();
    this.particles.destroy();
    this.pipeline.destroy();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
