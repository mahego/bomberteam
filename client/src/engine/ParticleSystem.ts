import * as THREE from 'three';

interface Particle {
  mesh: THREE.Object3D;
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

  private starGeo = new THREE.OctahedronGeometry(0.18);
  private smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
  private fireballGeo = new THREE.SphereGeometry(1.2, 20, 16);
  private ringGeo = new THREE.RingGeometry(0.5, 1.2, 64);
  private plankGeo = new THREE.BoxGeometry(0.28, 0.12, 0.5);
  private sparkGeo = new THREE.SphereGeometry(0.08, 4, 4);

  spawnExplosion(x: number, y: number, z: number, color = 0xff9933) {
    // 1. Expanding fireball core
    const fireballGeo = this.fireballGeo;
    const fireballMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(2),
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
    });
    const fireball = new THREE.Mesh(fireballGeo, fireballMat);
    fireball.position.set(x, y + 0.5, z);
    this.group.add(fireball);

    this.add({
      mesh: fireball,
      vx: 0,
      vy: 1.2,
      vz: 0,
      life: 0.35,
      maxLife: 0.35,
      scaleGrowth: 14,
    });

    // 2. Shockwave ring on ground
    const ringGeo = this.ringGeo;
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y + 0.1, z);
    this.group.add(ring);

    this.add({
      mesh: ring,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.45,
      maxLife: 0.45,
      scaleGrowth: 18,
    });

    // 3. Smoke puffs
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshLambertMaterial({
        color: Math.random() > 0.5 ? 0x64748b : 0x94a3b8,
        transparent: true,
        opacity: 0.8,
      });
      const puff = new THREE.Mesh(this.smokeGeo, mat);
      puff.position.set(x, y + 0.5, z);
      this.group.add(puff);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      this.add({
        mesh: puff,
        vx: Math.cos(angle) * speed,
        vy: 3 + Math.random() * 5,
        vz: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.8,
      });
    }

    // 4. Flying fiery sparks
    for (let i = 0; i < 16; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const spark = new THREE.Mesh(this.sparkGeo, sparkMat);
      spark.position.set(x, y + 0.5, z);
      this.group.add(spark);

      const angle = Math.random() * Math.PI * 2;
      const speed = 7 + Math.random() * 10;
      this.add({
        mesh: spark,
        vx: Math.cos(angle) * speed,
        vy: 4 + Math.random() * 8,
        vz: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.6,
      });
    }
  }

  spawnPunchImpact(x: number, y: number, z: number) {
    for (let i = 0; i < 6; i++) {
      const starMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const star = new THREE.Mesh(this.starGeo, starMat);
      star.position.set(x, y, z);
      this.group.add(star);

      const angle = (i / 6) * Math.PI * 2;
      const speed = 4 + Math.random() * 3;
      this.add({
        mesh: star,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 3,
        vz: Math.sin(angle) * speed,
        life: 0.35,
        maxLife: 0.35,
      });
    }
  }

  spawnRespawnPuff(x: number, y: number, z: number) {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const spark = new THREE.Mesh(this.sparkGeo, mat);
      spark.position.set(x, y + 0.5, z);
      this.group.add(spark);

      const angle = Math.random() * Math.PI * 2;
      this.add({
        mesh: spark,
        vx: Math.cos(angle) * 3,
        vy: 3 + Math.random() * 4,
        vz: Math.sin(angle) * 3,
        life: 0.4,
        maxLife: 0.4,
      });
    }
  }

  spawnCrateBreak(x: number, y: number, z: number) {
    // Flying wooden splinters and planks
    const plankGeo = this.plankGeo;
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });

    for (let i = 0; i < 10; i++) {
      const plank = new THREE.Mesh(plankGeo, woodMat.clone());
      plank.position.set(x + (Math.random() - 0.5) * 0.4, y + 0.5, z + (Math.random() - 0.5) * 0.4);
      plank.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.group.add(plank);

      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.add({
        mesh: plank,
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
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshLambertMaterial({
        color: i % 2 === 0 ? 0x15803d : 0x22c55e,
        transparent: true,
        opacity: 0.75,
      });
      const puff = new THREE.Mesh(this.smokeGeo, mat);
      puff.position.set(x, y + 0.4, z);
      this.group.add(puff);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.add({
        mesh: puff,
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
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.4 ? 0xef4444 : 0xf97316,
      });
      const spark = new THREE.Mesh(this.sparkGeo, mat);
      spark.position.set(x, y + 0.5, z);
      this.group.add(spark);

      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 7;
      this.add({
        mesh: spark,
        vx: Math.cos(angle) * speed,
        vy: 4 + Math.random() * 6,
        vz: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
      });
    }
  }

  spawnParalysisShock(x: number, y: number, z: number) {
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const crystal = new THREE.Mesh(this.starGeo, mat);
      crystal.position.set(x, y + 0.6, z);
      this.group.add(crystal);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 5;
      this.add({
        mesh: crystal,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 4,
        vz: Math.sin(angle) * speed,
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  spawnHealAura(x: number, y: number, z: number) {
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
      const spark = new THREE.Mesh(this.sparkGeo, mat);
      spark.position.set(x + (Math.random() - 0.5) * 0.6, y + 0.3, z + (Math.random() - 0.5) * 0.6);
      this.group.add(spark);

      this.add({
        mesh: spark,
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

      // Fade out opacity
      const ratio = p.life / p.maxLife;
      p.mesh.traverse((child) => {
        const mat = (child as THREE.Mesh).material as THREE.Material;
        if (mat && 'opacity' in mat) {
          mat.opacity = ratio;
        }
      });
    }
  }

  private add(particle: Particle) {
    particle.mesh.traverse(object => {
      const material = (object as THREE.Mesh).material as THREE.Material;
      if (material) { material.transparent = true; material.depthWrite = false; }
    });
    if (this.particles.length >= 400) this.release(this.particles.shift()!);
    this.particles.push(particle);
  }
  private release(particle: Particle) {
    this.group.remove(particle.mesh);
    particle.mesh.traverse(object => { ((object as THREE.Mesh).material as THREE.Material)?.dispose(); });
  }
  clear() {
    for (const particle of this.particles) this.release(particle);
    this.particles = [];
  }
  destroy() {
    this.clear();
    for (const geometry of [this.starGeo, this.smokeGeo, this.sparkGeo, this.fireballGeo, this.ringGeo, this.plankGeo]) geometry.dispose();
  }
}
