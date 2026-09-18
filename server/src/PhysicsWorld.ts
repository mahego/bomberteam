import { nextAttack } from '../../shared/gameplay.js';
import { BombState, GameEvent, MapType, PlayerState, PowerUpItem, CrateItem, PowerUpType } from '../../shared/types.js';
import { MAPS } from './Maps.js';

export class PhysicsWorld {
  static readonly GRAVITY = -26;
  static readonly PLAYER_RADIUS = 0.8;
  static readonly PLAYER_SPEED = 9.5;
  static readonly SPRINT_MULTIPLIER = 1.45;
  static readonly JUMP_VELOCITY = 10.5;

  static updatePlayer(
    player: PlayerState,
    input: {
      moveX: number;
      moveZ: number;
      jump: boolean;
      sprint: boolean;
      lookAngle: number;
    },
    mapType: MapType,
    dt: number,
    events: GameEvent[]
  ) {
    if (!player.isAlive) return;

    const map = MAPS[mapType];
    player.spawnGrace = Math.max(0, (player.spawnGrace ?? 0) - dt);

    player.comboTimer = Math.max(0, (player.comboTimer ?? 0) - dt);
    player.actionTimer = Math.max(0, (player.actionTimer ?? 0) - dt);
    player.grabCooldown = Math.max(0, (player.grabCooldown ?? 0) - dt);
    player.hitCreditTimer = Math.max(0, (player.hitCreditTimer ?? 0) - dt);
    if (!player.hitCreditTimer) player.lastAttackerId = null;

    // If carried by an opponent, carrier dictates position
    if (player.isCarried) {
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      return;
    }

    // Stun timer update
    if (player.isStunned) {
      player.stunTimer -= dt;
      if (player.stunTimer <= 0) {
        player.isStunned = false;
        player.stunTimer = 0;
      }
    }

    // Power-up timer update
    if (player.powerUp) {
      player.powerUpTimer -= dt;
      if (player.powerUpTimer <= 0) {
        player.powerUp = null;
        player.powerUpTimer = 0;
      }
    }

    // Punch cooldown
    if (player.punchCooldown > 0) {
      player.punchCooldown = Math.max(0, player.punchCooldown - dt);
      if (player.punchCooldown <= 0) {
        player.isPunching = false;
      }
    }

    // Smooth rotational turning (snappy, responsive angle lerp)
    const diffAngle = Math.atan2(Math.sin(input.lookAngle - player.rotY), Math.cos(input.lookAngle - player.rotY));
    player.rotY += diffAngle * Math.min(1, 55 * dt);

    // Status effect timer & damage handling ("daño progresivo como en pokemon")
    if (player.statusEffect) {
      player.statusEffect.timer -= dt;
      player.statusEffect.tickTimer = (player.statusEffect.tickTimer ?? 0) - dt;

      if (player.statusEffect.type === 'poison' && player.statusEffect.tickTimer <= 0) {
        player.statusEffect.tickTimer = 0.6;
        const dmg = 4;
        player.health = Math.max(0, player.health - dmg);
        events.push({
          type: 'status_damage',
          victimId: player.id,
          victimName: player.name,
          attackerId: player.statusEffect.attackerId,
          attackerName: player.statusEffect.attackerName,
          damage: dmg,
          x: player.x,
          y: player.y + 1,
          z: player.z,
        });
        if (player.health <= 0) {
          player.isAlive = false;
          player.deaths++;
          events.push({
            type: 'kill',
            attackerId: player.statusEffect.attackerId,
            attackerName: player.statusEffect.attackerName,
            victimId: player.id,
            victimName: player.name,
            x: player.x,
            y: player.y,
            z: player.z,
          });
        }
      } else if (player.statusEffect.type === 'burn' && player.statusEffect.tickTimer <= 0) {
        player.statusEffect.tickTimer = 0.5;
        const dmg = 6;
        player.health = Math.max(0, player.health - dmg);
        events.push({
          type: 'status_damage',
          victimId: player.id,
          victimName: player.name,
          attackerId: player.statusEffect.attackerId,
          attackerName: player.statusEffect.attackerName,
          damage: dmg,
          x: player.x,
          y: player.y + 1,
          z: player.z,
        });
        if (player.health <= 0) {
          player.isAlive = false;
          player.deaths++;
          events.push({
            type: 'kill',
            attackerId: player.statusEffect.attackerId,
            attackerName: player.statusEffect.attackerName,
            victimId: player.id,
            victimName: player.name,
            x: player.x,
            y: player.y,
            z: player.z,
          });
        }
      }

      if (player.statusEffect.timer <= 0 || !player.isAlive) {
        if (player.statusEffect.type === 'freeze') {
          events.push({
            type: 'freeze_shatter',
            victimId: player.id,
            victimName: player.name,
            x: player.x,
            y: player.y + 0.8,
            z: player.z,
          });
        }
        player.statusEffect = null;
      }
    }

    // Movement calculation
    const isImmobilized =
      player.isStunned ||
      player.statusEffect?.type === 'paralysis' ||
      player.statusEffect?.type === 'freeze';
    let speed = PhysicsWorld.PLAYER_SPEED;
    if (player.powerUp === 'speed') speed *= 1.4;
    if (input.sprint && !isImmobilized) speed *= PhysicsWorld.SPRINT_MULTIPLIER;
    if (player.carriedPlayerId) speed *= 0.88; // Slightly slower when carrying opponent

    if (!isImmobilized) {
      const len = Math.sqrt(input.moveX * input.moveX + input.moveZ * input.moveZ);
      if (len > 0.05) {
        const nx = input.moveX / len;
        const nz = input.moveZ / len;
        // Ultra-responsive, snappy horizontal acceleration
        const targetVx = nx * speed * Math.min(1, len);
        const targetVz = nz * speed * Math.min(1, len);
        const accelRate = player.isGrounded ? 20 : 12; // Snappy on ground, crisp air control
        player.vx += (targetVx - player.vx) * Math.min(1, accelRate * dt);
        player.vz += (targetVz - player.vz) * Math.min(1, accelRate * dt);
      } else {
        // Natural smooth friction
        const frictionRate = player.isGrounded ? 18 : 6;
        player.vx *= Math.max(0, 1 - frictionRate * dt);
        player.vz *= Math.max(0, 1 - frictionRate * dt);
      }

      // Jump
      if (input.jump && player.isGrounded) {
        const jumpMultiplier = player.powerUp === 'jump_boots' ? 1.75 : 1;
        player.vy = PhysicsWorld.JUMP_VELOCITY * jumpMultiplier;
        player.isGrounded = false;
        events.push({
          type: 'jump',
          attackerId: player.id,
          x: player.x,
          y: player.y,
          z: player.z,
        });
      }
    } else {
      // In stun/paralysis state, decelerate with friction
      player.vx *= Math.max(0, 1 - (player.isGrounded ? 7 : 0.7) * dt);
      player.vz *= Math.max(0, 1 - (player.isGrounded ? 7 : 0.7) * dt);
    }

    // Apply gravity
    player.vy += PhysicsWorld.GRAVITY * dt;

    // Apply velocity
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.z += player.vz * dt;

    // Ground and terrain collision
    const floorY = map.getFloorHeight(player.x, player.z);
    if (floorY !== null && player.y <= floorY && player.y - player.vy * dt >= floorY - 0.2 && player.vy <= 0) {
      player.y = floorY;
      player.vy = 0;
      player.isGrounded = true;
    } else {
      player.isGrounded = false;
    }

    // Hazard damage (e.g. lava ring)
    const hazardDmg = map.getHazardDamage(player.x, player.y, player.z, dt);
    if (hazardDmg > 0) {
      player.health = Math.max(0, player.health - hazardDmg);
      if (player.health <= 0) {
        player.isAlive = false;
        player.deaths++;
        events.push({
          type: 'kill',
          attackerId: player.lastAttackerId || undefined,
          victimId: player.id,
          victimName: player.name,
          x: player.x,
          y: player.y,
          z: player.z,
        });
      }
    }

    // Out of bounds fall check
    if (player.isAlive && map.isOutOfBounds(player.x, player.y, player.z)) {
      player.health = 0;
      player.isAlive = false;
      player.deaths++;

      const killerId = player.lastAttackerId;
      events.push({
        type: 'kill',
        attackerId: killerId || undefined,
        victimId: player.id,
        victimName: player.name,
        x: player.x,
        y: player.y,
        z: player.z,
      });
    }
  }

  static resolvePlayerCollisions(players: PlayerState[]) {
    const alivePlayers = players.filter((p) => p.isAlive && !p.isCarried);
    const count = alivePlayers.length;
    const minDist = PhysicsWorld.PLAYER_RADIUS * 2;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const p1 = alivePlayers[i];
        const p2 = alivePlayers[j];

        if (Math.abs(p1.y - p2.y) > 1.5) continue;
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;

          // Push apart
          p1.x -= nx * overlap;
          p1.z -= nz * overlap;
          p2.x += nx * overlap;
          p2.z += nz * overlap;

          // Momentum transfer
          const relVx = p1.vx - p2.vx;
          const relVz = p1.vz - p2.vz;
          const normalVel = relVx * nx + relVz * nz;

          if (normalVel > 0) {
            const impulse = normalVel * 0.5;
            p1.vx -= impulse * nx;
            p1.vz -= impulse * nz;
            p2.vx += impulse * nx;
            p2.vz += impulse * nz;
          }
        }
      }
    }
  }

  static executePunch(attacker: PlayerState, allPlayers: PlayerState[], events: GameEvent[], kick = false, sprint = false, crates: CrateItem[] = []) {
    if (!attacker.isAlive || attacker.isStunned || attacker.statusEffect?.type === 'paralysis' || attacker.isCarried || attacker.heldBombId || attacker.carriedPlayerId || attacker.punchCooldown > 0) return;
    const { combo, kind, duration } = nextAttack(attacker, kick, sprint);
    const dash = kind === 'dash';
    attacker.attackKind = kind;
    attacker.comboStep = combo;
    attacker.comboTimer = 1.15;
    attacker.attackSequence = (attacker.attackSequence ?? 0) + 1;
    attacker.isPunching = true;
    attacker.punchCooldown = duration;
    attacker.attackDuration = attacker.punchCooldown;
    attacker.actionTimer = attacker.punchCooldown;
    const fx = Math.sin(attacker.rotY), fz = Math.cos(attacker.rotY);
    const range = kick ? 2.9 : 2.45;
    // Boxing gloves double the punch and kick damage!
    const strength = attacker.powerUp === 'boxing_gloves' ? 2.0 : attacker.powerUp === 'strength' ? 1.4 : 1;

    // Check crate hits in front of attacker
    for (const crate of crates) {
      if (crate.health <= 0) continue;
      const cdx = crate.x - attacker.x;
      const cdz = crate.z - attacker.z;
      const cdist = Math.hypot(cdx, cdz);
      if (cdist <= range + 0.5 && Math.abs(crate.y - attacker.y) < 1.8 && (cdx * fx + cdz * fz) / (cdist || 1) > 0.25) {
        const crateDmg = (kick ? 16 : combo === 3 ? 28 : 14) * strength;
        crate.health = Math.max(0, crate.health - crateDmg);
        events.push({
          type: 'punch_hit',
          attackerId: attacker.id,
          attackerName: attacker.name,
          x: crate.x,
          y: crate.y + 0.6,
          z: crate.z,
        });
        if (crate.health <= 0) {
          events.push({
            type: 'crate_break',
            attackerId: attacker.id,
            attackerName: attacker.name,
            x: crate.x,
            y: crate.y + 0.6,
            z: crate.z,
          });
        }
      }
    }

    // A single, nearest opponent receives the blow; no attacks through a crowd.
    const targets = allPlayers.filter(v => {
      const dx = v.x - attacker.x, dz = v.z - attacker.z;
      const dist = Math.hypot(dx, dz);
      return v.id !== attacker.id && v.isAlive && !v.isCarried && (v.spawnGrace ?? 0) <= 0 && dist <= range && Math.abs(v.y - attacker.y) < 1.8 && (dx * fx + dz * fz) / (dist || 1) > 0.35;
    }).sort((a, b) => Math.hypot(a.x - attacker.x, a.z - attacker.z) - Math.hypot(b.x - attacker.x, b.z - attacker.z));
    const victim = targets[0];
    if (!victim) return;
    const shield = victim.powerUp === 'shield';
    if (shield) { victim.powerUp = null; victim.powerUpTimer = 0; }
    else victim.health = Math.max(0, victim.health - (kick ? 10 : combo === 3 ? 22 : 12) * strength);
    const damageScale = 1 + (1 - victim.health / victim.maxHealth) * 0.65;
    const force = (kick ? 20 : dash ? 22 : combo === 3 ? 18 : 11) * strength * damageScale * (shield ? 0.5 : 1);
    victim.vx = fx * force;
    victim.vz = fz * force;
    victim.vy = combo === 3 && !kick ? 10 : kick ? 5.5 : 5;
    victim.isGrounded = false;
    victim.isStunned = true;
    victim.stunTimer = kick || dash || combo === 3 ? 0.65 : 0.3;
    victim.lastAttackerId = attacker.id;
    victim.hitCreditTimer = 5;

    // Shatter freeze effect on hit
    if (victim.statusEffect?.type === 'freeze') {
      victim.statusEffect = null;
      events.push({
        type: 'freeze_shatter',
        attackerId: attacker.id,
        attackerName: attacker.name,
        victimId: victim.id,
        victimName: victim.name,
        x: victim.x,
        y: victim.y + 0.8,
        z: victim.z,
      });
    }

    events.push({ type: 'punch_hit', attackerId: attacker.id, victimId: victim.id, attackerName: attacker.name, victimName: victim.name, x: victim.x, y: victim.y + 0.8, z: victim.z });
    if (victim.health <= 0) {
      victim.isAlive = false;
      victim.deaths++;
      attacker.kills++;
      attacker.score += 100;
      events.push({ type: 'kill', attackerId: attacker.id, victimId: victim.id, attackerName: attacker.name, victimName: victim.name, x: victim.x, y: victim.y, z: victim.z });
    }
  }

  static updateBombs(
    bombs: BombState[],
    players: Record<string, PlayerState>,
    mapType: MapType,
    dt: number,
    events: GameEvent[]
  ): { explodedBombIds: string[]; triggeredCracks: string[] } {
    const map = MAPS[mapType];
    const explodedBombIds: string[] = [];

    for (const bomb of bombs) {
      if (bomb.isAttached && bomb.attachedToPlayerId) {
        const attachedPlayer = players[bomb.attachedToPlayerId];
        if (attachedPlayer && attachedPlayer.isAlive) {
          bomb.x = attachedPlayer.x + Math.sin(attachedPlayer.rotY) * 0.85;
          bomb.y = attachedPlayer.y + 1.15;
          bomb.z = attachedPlayer.z + Math.cos(attachedPlayer.rotY) * 0.85;
          bomb.vx = 0;
          bomb.vy = 0;
          bomb.vz = 0;
        } else {
          bomb.isAttached = false;
          bomb.attachedToPlayerId = null;
        }
      } else {
        // Sticky bomb latch onto opponent
        if (bomb.type === 'sticky' && !bomb.isAttached && bomb.fuse < bomb.maxFuse - 0.2) {
          for (const p of Object.values(players)) {
            if (!p.isAlive || p.id === bomb.ownerId) continue;
            const pdx = p.x - bomb.x;
            const pdy = p.y - bomb.y;
            const pdz = p.z - bomb.z;
            if (Math.hypot(pdx, pdz) < 1.3 && Math.abs(pdy) < 1.5) {
              bomb.isAttached = true;
              bomb.attachedToPlayerId = p.id;
              break;
            }
          }
        }

        // Normal physics
        bomb.vy += PhysicsWorld.GRAVITY * dt;
        bomb.x += bomb.vx * dt;
        bomb.y += bomb.vy * dt;
        bomb.z += bomb.vz * dt;

        // Ground check
        const floorY = map.getFloorHeight(bomb.x, bomb.z);
        if (floorY !== null && bomb.y <= floorY + bomb.radius) {
          bomb.y = floorY + bomb.radius;
          if (bomb.type === 'sticky') {
            bomb.vx = 0;
            bomb.vy = 0;
            bomb.vz = 0;
          } else {
            // Bounce
            if (Math.abs(bomb.vy) > 1.5) {
              bomb.vy = -bomb.vy * 0.45;
            } else {
              bomb.vy = 0;
            }
            bomb.vx *= Math.max(0, 1 - 8 * dt);
            bomb.vz *= Math.max(0, 1 - 8 * dt);
          }
        }

        // Landmine arming & proximity trigger
        if (bomb.type === 'landmine') {
          if (!bomb.isArmed) {
            if (bomb.fuse <= bomb.maxFuse - 1.0) {
              bomb.isArmed = true;
            }
          } else {
            // Check if any player steps near
            for (const p of Object.values(players)) {
              if (!p.isAlive) continue;
              const dx = p.x - bomb.x;
              const dz = p.z - bomb.z;
              if (Math.sqrt(dx * dx + dz * dz) < 1.7) {
                bomb.fuse = 0; // Detonate instantly
                break;
              }
            }
          }
        }
      }

      // Decrement fuse
      bomb.fuse -= dt;
      if (bomb.fuse <= 0) {
        explodedBombIds.push(bomb.id);
      }
    }

    return { explodedBombIds, triggeredCracks: [] };
  }

  static detonateExplosion(
    bomb: BombState,
    allBombs: BombState[],
    allPlayers: PlayerState[],
    crates: CrateItem[],
    events: GameEvent[]
  ) {
    const isLandmine = bomb.type === 'landmine';
    const blastRadius = isLandmine ? 6.5 : bomb.type === 'fire' ? 6.2 : 5.4;
    const blastForce = isLandmine ? 28 : bomb.type === 'sticky' ? 25 : 22;

    events.push({
      type: 'explosion',
      attackerId: bomb.ownerId,
      bombType: bomb.type,
      x: bomb.x,
      y: bomb.y,
      z: bomb.z,
    });

    const attacker = allPlayers.find((p) => p.id === bomb.ownerId);

    // Apply damage to crates
    for (const crate of crates) {
      if (crate.health <= 0) continue;
      const cdx = crate.x - bomb.x;
      const cdy = crate.y - bomb.y;
      const cdz = crate.z - bomb.z;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
      if (cdist <= blastRadius) {
        const factor = 1 - cdist / blastRadius;
        const damage = Math.floor(35 + 50 * factor);
        crate.health = Math.max(0, crate.health - damage);
        if (crate.health <= 0) {
          events.push({
            type: 'crate_break',
            attackerId: bomb.ownerId,
            attackerName: attacker ? attacker.name : undefined,
            x: crate.x,
            y: crate.y + 0.6,
            z: crate.z,
          });
        }
      }
    }

    // Apply damage, knockback and status effects to players
    for (const player of allPlayers) {
      if (!player.isAlive || (player.spawnGrace ?? 0) > 0) continue;

      const dx = player.x - bomb.x;
      const dy = player.y - bomb.y;
      const dz = player.z - bomb.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= blastRadius) {
        const factor = 1 - dist / blastRadius;
        const damage = Math.floor(25 + 65 * factor);

        if (player.powerUp === 'shield') {
          // Shield absorbs explosion!
          player.powerUp = null;
          player.powerUpTimer = 0;
        } else {
          player.health = Math.max(0, player.health - damage);

          // Apply special bomb status effects ("daño progresivo como en pokemon", parálisis, etc.)
          if (bomb.type === 'paralysis') {
            player.statusEffect = {
              type: 'paralysis',
              timer: 2.5,
              attackerId: bomb.ownerId,
              attackerName: attacker ? attacker.name : undefined,
            };
            player.isStunned = true;
            player.stunTimer = 2.5;
          } else if (bomb.type === 'poison') {
            player.statusEffect = {
              type: 'poison',
              timer: 6.0,
              attackerId: bomb.ownerId,
              attackerName: attacker ? attacker.name : undefined,
              tickTimer: 0.3,
            };
          } else if (bomb.type === 'fire') {
            player.statusEffect = {
              type: 'burn',
              timer: 4.5,
              attackerId: bomb.ownerId,
              attackerName: attacker ? attacker.name : undefined,
              tickTimer: 0.2,
            };
          } else if (bomb.type === 'ice') {
            player.statusEffect = {
              type: 'freeze',
              timer: 3.0,
              attackerId: bomb.ownerId,
              attackerName: attacker ? attacker.name : undefined,
            };
            player.isStunned = true;
            player.stunTimer = 3.0;
            player.vx = 0;
            player.vz = 0;
          }
        }

        if (player.isCarried && player.carrierPlayerId) {
          const carrier = allPlayers.find(p => p.id === player.carrierPlayerId);
          if (carrier) carrier.carriedPlayerId = null;
          player.isCarried = false;
          player.carrierPlayerId = null;
        }
        player.lastAttackerId = bomb.ownerId !== player.id ? bomb.ownerId : null;
        player.hitCreditTimer = 5;

        // Stun victim
        if (bomb.type !== 'paralysis' && bomb.type !== 'ice') {
          player.isStunned = true;
          player.stunTimer = 1.0;
        }

        // Knockback vector (Ice bombs freeze in place rather than launching)
        if (bomb.type === 'ice') {
          player.vx = 0;
          player.vy = 0;
          player.vz = 0;
        } else {
          const normDist = dist > 0.2 ? dist : 0.2;
          const dirX = dx / normDist;
          const dirY = (dy + 0.6) / normDist;
          const dirZ = dz / normDist;

          player.vx = dirX * blastForce * factor;
          player.vy = Math.max(8, dirY * blastForce * factor);
          player.vz = dirZ * blastForce * factor;
          player.isGrounded = false;
        }

        if (player.health <= 0) {
          player.isAlive = false;
          player.deaths++;
          if (attacker && attacker.id !== player.id) {
            attacker.kills++;
            attacker.score += 150;
          }
          events.push({
            type: 'kill',
            attackerId: attacker ? attacker.id : undefined,
            victimId: player.id,
            attackerName: attacker ? attacker.name : 'Explosión',
            victimName: player.name,
            x: player.x,
            y: player.y,
            z: player.z,
          });
        }
      }
    }

    // Detonate chained bombs within radius
    for (const otherBomb of allBombs) {
      if (otherBomb.id === bomb.id) continue;
      const dx = otherBomb.x - bomb.x;
      const dy = otherBomb.y - bomb.y;
      const dz = otherBomb.z - bomb.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= blastRadius) {
        // Chain reaction! Cut fuse down to instant trigger
        if (otherBomb.fuse > 0.15) {
          otherBomb.fuse = 0.15;
        }
        // Blast other bomb away
        const normDist = dist > 0.2 ? dist : 0.2;
        otherBomb.vx += (dx / normDist) * blastForce * 0.6;
        otherBomb.vy += 8;
        otherBomb.vz += (dz / normDist) * blastForce * 0.6;
      }
    }
  }
}
