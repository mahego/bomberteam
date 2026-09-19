import * as THREE from 'three';
import { isMobileDevice } from '../utils/device';

interface Particle {
  mesh: THREE.Mesh;
  material: THREE.Material;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scaleGrowth?: number;
}

export class ParticleSystem {
  public group = new THREE.Group();
  private particles: Particle[] = [];

  private isMobile = isMobileDevice();
  private maxParticles = this.isMobile ? 100 : 350;

  // Shared geometry instances for zero runtime geometry allocations
  private starGeo = new THREE.OctahedronGeometry(0.18);
  private smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
  private fireballGeo = new THREE.SphereGeometry(1.2, 14, 12);
  private ringGeo = new THREE.RingGeometry(0.5, 1.2, 32);
  private plankGeo = new THREE.BoxGeometry(0.28, 0.12, 0.5);
  private sparkGeo = new THREE.SphereGeometry(0.08, 4, 4);

  spawnExplosion(x: number, y: number, z: number, color = 0xff9933) {
    // 1. Expanding fireball core
    const fireballMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(2),
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const fireball = new THREE.Mesh(this.fireballGeo, fireballMat);
    fireball.position.set(x, y + 0.5, z);
    this.group.add(fireball);

    this.add({
      mesh: fireball,
      material: fireballMat,
      vx: 0,
      vy: 1.2,
      vz: 0,
      life: 0.35,
      maxLife: 0.35,
      scaleGrowth: 14,
    });

    // 2. Shockwave ring on ground
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y + 0.1, z);
    this.group.add(ring);

    this.add({
      mesh: ring,
      material: ringMat,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.45,
      maxLife: 0.45,
      scaleGrowth: 18,
    });

    // 3. Smoke puffs
    const smokeCount = this.isMobile ? 6 : 12;
    for (let i = 0; i < smokeCount; i++) {
      const mat = new THREE.MeshLambertMaterial({
        color: Math.random() > 0.5 ? 0x64748b : 0x94a3b8,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const puff = new THREE.Mesh(this.smokeGeo, mat);
      puff.position.set(x, y + 0.5, z);
      this.group.add(puff);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      this.add({
        mesh: puff,
        material: mat,
        vx: Math.cos(angle) * speed,
        vy: 3 + Math.random() * 5,
        vz: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.8,
      });
    }

    // 4. Flying fiery sparks
    const sparkCount = this.isMobile ? 8 : 16;
    for (let i = 0; i < sparkCount; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        depthWrite: false,
      });
      const spark = new THREE.Mesh(this.sparkGeo, sparkMat);
      spark.position.set(x, y + 0.5, z);
      this.group.add(spark);

      const angle = Math.random() * Math.PI * 2;
      const speed = 7 + Math.random() * 10;
      this.add({
        mesh: spark,
        material: sparkMat,
        vx: Math.cos(angle) * speed,
        vy: 4 + Math.random() * 8,
        vz: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.6,
      });
    }
  }

  spawnPunchImpact(x: number, y: number, z: number) {
    const count = this.isMobile ? 4 : 6;
    for (let i = 0; i < count; i++) {
      const starMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        depthWrite: false,
      });
      const star = new THREE.Mesh(this.starGeo, starMat);
      star.position.set(x, y, z);
      this.group.add(star);

      const angle = (i / count) * Math.PI * 2;
      const speed = 4 + Math.random() * 3;
      this.add({
        mesh: star,
        material: starMat,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 3,
        vz: Math.sin(angle) * speed,
        life: 0.35,
        maxLife: 0.35,
      });
    }
  }

  spawnRespawnPuff(x: number, y: number, z: number) {
    const count = this.isMobile ? 5 : 8;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        depthWrite: false,
      });
      const spark = new THREE.Mesh(this.sparkGeo, mat);
      spark.position.set(x, y + 0.5, z);
      this.group.add(spark);

      const angle = Math.random() * Math.PI * 2;
      this.add({
        mesh: spark,
        material: mat,
        vx: Math.cos(angle) * 3,
        vy: 3 + Math.random() * 4,
        vz: Math.sin(angle) * 3,
        life: 0.4,
        maxLife: 0.4,
      });
    }
  }

  spawnCrateBreak(x: number, y: number, z: number) {
    const count = this.isMobile ? 6 : 10;
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.8,
      transparent: true,
      depthWrite: false,
    });

    for (let i = 0; i < count; i++) {
      const plank = new THREE.Mesh(this.plankGeo, woodMat.clone());
      plank.position.set(x + (Math.random() - 0.5) * 0.4, y + 0.5, z + (Math.random() - 0.5) * 0.4);
      plank.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.group.add(plank);

      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.add({
        mesh: plank,
        material: plank.material as THREE.Material,
        vx: Math.cos(angle) * speed,
        vy: 4 + Math.random() * 4,
        vz: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.8,
      });
    }
    woodMat.dispose();
  }

  spawnPoisonCloud(x: number, y: number, z: number) {
    const count = this.isMobile ? 7 : 14;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshLambertMaterial({
        color: i % 2 === 0 ? 0x15803d : 0x22c55e,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      const puff = new THREE.Mesh(this.smokeGeo, mat);
      puff.position.set(x, y + 0.4, z);
      this.group.add(puff);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.add({
        mesh: puff,
        material: mat,
        vx: Math.cos(angle) * speed,
        vy: 1.5 + Math.random() * 3,
        vz: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        scaleGrowth: 4,
      });
    }
  }

  spawnFireBurst(x: number, y: number, z: number) {
    const count = this.isMobile ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.4 ? 0xef4444 : 0xf97316,
        transparent: true,
        depthWrite: false,
      });
      const spark = new THREE.Mesh(this.sparkGeo, mat);
      spark.position.set(x, y + 0.5, z);
      this.group.add(spark);

      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 7;
      this.add({
        mesh: spark,
        material: mat,
        vx: Math.cos(angle) * speed,
        vy: 4 + Math.random() * 6,
        vz: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
      });
    }
  }

  spawnParalysisShock(x: number, y: number, z: number) {
    const count = this.isMobile ? 6 : 12;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        depthWrite: false,
      });
      const crystal = new THREE.Mesh(this.starGeo, mat);
      crystal.position.set(x, y + 0.6, z);
      this.group.add(crystal);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 5;
      this.add({
        mesh: crystal,
        material: mat,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 4,
        vz: Math.sin(angle) * speed,
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  spawnHealAura(x: number, y: number, z: number) {
    const count = this.isMobile ? 5 : 10;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        depthWrite: false,
      });
      const spark = new THREE.Mesh(this.sparkGeo, mat);
      spark.position.set(x + (Math.random() - 0.5) * 0.6, y + 0.3, z + (Math.random() - 0.5) * 0.6);
      this.group.add(spark);

      this.add({
        mesh: spark,
        material: mat,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 3 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 0.8,
        life: 0.6,
        maxLife: 0.6,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.release(p);
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 9.8 * dt; // Gravity

      // Scale growth (e.g. shockwaves and fireball)
      if (p.scaleGrowth) {
        p.mesh.scale.addScalar(p.scaleGrowth * dt);
      }

      // Direct opacity fade (Zero traverse overhead)
      const ratio = p.life / p.maxLife;
      (p.material as any).opacity = ratio;
    }
  }

  private add(particle: Particle) {
    if (this.particles.length >= this.maxParticles) {
      this.release(this.particles.shift()!);
    }
    this.particles.push(particle);
  }

  private release(particle: Particle) {
    this.group.remove(particle.mesh);
    particle.material.dispose();
  }

  clear() {
    for (const particle of this.particles) {
      this.release(particle);
    }
    this.particles = [];
  }

  destroy() {
    this.clear();
    for (const geometry of [this.starGeo, this.smokeGeo, this.sparkGeo, this.fireballGeo, this.ringGeo, this.plankGeo]) {
      geometry.dispose();
    }
  }
}
