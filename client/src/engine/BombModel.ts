import { disposeObject } from './rendering/SurfaceMaterials';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as THREE from 'three';
import { BombState, BombType, PowerUpType, PowerUpItem, CrateItem } from '@shared/types';

export class BombModel {
  public group: THREE.Group;
  public id: string;
  private bombMesh!: THREE.Mesh;
  private ledMesh?: THREE.Mesh;
  private fuseSpark?: THREE.Mesh;
  private animatedMesh?: THREE.Object3D;
  private bombType: BombType;

  constructor(bomb: BombState) {
    this.id = bomb.id;
    this.bombType = bomb.type;
    this.group = new THREE.Group();
    this.buildBomb();
    this.update(bomb, 0);
  }

  private buildBomb() {
    if (this.bombType === 'fire') {
      // Molten fiery magma bomb
      const bodyGeo = new THREE.DodecahedronGeometry(0.56, 1);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        roughness: 0.7,
        metalness: 0.2,
      });
      this.bombMesh = new THREE.Mesh(bodyGeo, bodyMat);
      this.bombMesh.castShadow = true;
      this.group.add(this.bombMesh);

      // Fiery incandescent core / cracks
      const coreGeo = new THREE.SphereGeometry(0.48, 12, 12);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      this.animatedMesh = core;
      this.group.add(core);

      // Orbiting flame embers
      for (let i = 0; i < 3; i++) {
        const ember = new THREE.Mesh(
          new THREE.TetrahedronGeometry(0.12),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        ember.position.set(
          Math.cos((i / 3) * Math.PI * 2) * 0.65,
          0.2,
          Math.sin((i / 3) * Math.PI * 2) * 0.65
        );
        this.group.add(ember);
      }
    } else if (this.bombType === 'poison') {
      // Toxic chemical flask / radioactive grenade
      const canGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.75, 16);
      const canMat = new THREE.MeshStandardMaterial({
        color: 0x14532d,
        metalness: 0.6,
        roughness: 0.3,
      });
      this.bombMesh = new THREE.Mesh(canGeo, canMat);
      this.bombMesh.castShadow = true;
      this.group.add(this.bombMesh);

      // Glowing radioactive fluid core
      const fluidGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.35, 16);
      const fluidMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const fluid = new THREE.Mesh(fluidGeo, fluidMat);
      this.animatedMesh = fluid;
      this.group.add(fluid);

      // Biohazard warning cap
      const capGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 12);
      const capMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.46;
      this.group.add(cap);
    } else if (this.bombType === 'paralysis') {
      // Cryo / electro-paralysis orb
      const sphereGeo = new THREE.SphereGeometry(0.52, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.2,
        metalness: 0.8,
      });
      this.bombMesh = new THREE.Mesh(sphereGeo, sphereMat);
      this.bombMesh.castShadow = true;
      this.group.add(this.bombMesh);

      // Electric / ice crystal spires
      const spikeGeo = new THREE.OctahedronGeometry(0.18, 0);
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        const phi = (i / 6) * Math.PI * 2;
        spike.position.set(Math.cos(phi) * 0.58, 0, Math.sin(phi) * 0.58);
        this.group.add(spike);
      }

      // Rotating electric halo ring
      const ringGeo = new THREE.TorusGeometry(0.72, 0.035, 6, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      this.animatedMesh = ring;
      this.group.add(ring);
    } else if (this.bombType === 'ice') {
      // Crystalline frost bomb with radiating ice spikes
      const iceGeo = new THREE.OctahedronGeometry(0.55, 1);
      const iceMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.1,
        metalness: 0.15,
        transparent: true,
        opacity: 0.88,
      });
      this.bombMesh = new THREE.Mesh(iceGeo, iceMat);
      this.bombMesh.castShadow = true;
      this.group.add(this.bombMesh);

      // 6 radiating icy crystal cones
      const spikeGeo = new THREE.ConeGeometry(0.12, 0.35, 4);
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        const phi = (i / 6) * Math.PI * 2;
        spike.position.set(Math.cos(phi) * 0.58, 0, Math.sin(phi) * 0.58);
        spike.rotation.z = -Math.PI / 2;
        spike.rotation.y = -phi;
        this.group.add(spike);
      }

      // Frost aura ring
      const ringGeo = new THREE.TorusGeometry(0.72, 0.035, 6, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      this.animatedMesh = ring;
      this.group.add(ring);
    } else if (this.bombType === 'sticky') {
      // Spiky magenta sticky bomb
      const bodyGeo = new THREE.IcosahedronGeometry(0.55, 1);
      const bodyMat = new THREE.MeshLambertMaterial({
        color: 0x86198f,
      });
      this.bombMesh = new THREE.Mesh(bodyGeo, bodyMat);
      this.bombMesh.castShadow = true;
      this.group.add(this.bombMesh);

      // Neon spikes
      const spikeGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        const phi = (i / 6) * Math.PI * 2;
        spike.position.set(Math.cos(phi) * 0.55, 0, Math.sin(phi) * 0.55);
        spike.rotation.z = -Math.PI / 2;
        spike.rotation.y = -phi;
        this.group.add(spike);
      }
    } else if (this.bombType === 'landmine') {
      // Landmine disc
      const mineGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.18, 16);
      const mineMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      this.bombMesh = new THREE.Mesh(mineGeo, mineMat);
      this.bombMesh.castShadow = true;
      this.group.add(this.bombMesh);

      // Center sensor trigger button
      const sensorGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 12);
      const sensorMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      this.ledMesh = new THREE.Mesh(sensorGeo, sensorMat);
      this.ledMesh.position.y = 0.05;
      this.group.add(this.ledMesh);
    } else {
      // Classic cartoon bomb
      const bodyGeo = new THREE.SphereGeometry(0.55, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.3,
        metalness: 0.2,
      });
      this.bombMesh = new THREE.Mesh(bodyGeo, bodyMat);
      this.bombMesh.castShadow = true;
      this.group.add(this.bombMesh);

      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.545, 0.035, 8, 32),
        new THREE.MeshStandardMaterial({ color: 0xd4a24c, metalness: 0.7, roughness: 0.3 })
      );
      band.rotation.x = Math.PI / 2;
      this.group.add(band);

      // Fuse cap
      const capGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.15, 8);
      const capMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.55;
      this.group.add(cap);

      // Fuse cord
      const fuseGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6);
      const fuseMat = new THREE.MeshBasicMaterial({ color: 0x78716c });
      const fuse = new THREE.Mesh(fuseGeo, fuseMat);
      fuse.position.set(0.08, 0.7, 0);
      fuse.rotation.z = -0.3;
      this.group.add(fuse);

      // Burning spark at fuse tip
      const sparkGeo = new THREE.SphereGeometry(0.09, 8, 8);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      this.fuseSpark = new THREE.Mesh(sparkGeo, sparkMat);
      this.fuseSpark.position.set(0.14, 0.82, 0);
      this.group.add(this.fuseSpark);

      // Warning blinking LED on front
      const ledGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      this.ledMesh = new THREE.Mesh(ledGeo, ledMat);
      this.ledMesh.position.set(0, 0.1, 0.52);
      this.group.add(this.ledMesh);
    }
  }

  update(bomb: BombState, dt: number) {
    this.group.position.set(bomb.x, bomb.y, bomb.z);

    // Fuse countdown effects: blink and wobble
    if (this.bombType === 'normal') {
      const fuseRatio = bomb.fuse / bomb.maxFuse;
      const blinkSpeed = 4 + (1 - fuseRatio) * 16;
      const isBlink = Math.sin(Date.now() * 0.005 * blinkSpeed) > 0;

      if (this.ledMesh) {
        (this.ledMesh.material as THREE.MeshBasicMaterial).color.setHex(
          isBlink ? 0xff0000 : 0x550000
        );
      }
      if (this.fuseSpark) {
        this.fuseSpark.scale.setScalar(0.8 + Math.random() * 0.5);
      }
      if (bomb.fuse < 1.0) {
        this.group.rotation.z = (Math.random() - 0.5) * 0.2;
        this.group.rotation.x = (Math.random() - 0.5) * 0.2;
      }
    } else if (this.bombType === 'landmine') {
      if (this.ledMesh && bomb.isArmed) {
        const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
        (this.ledMesh.material as THREE.MeshBasicMaterial).color.setRGB(1, pulse * 0.4, 0);
      }
    } else if (this.bombType === 'fire') {
      if (this.animatedMesh) {
        const pulse = 1 + Math.sin(Date.now() * 0.012) * 0.1;
        this.animatedMesh.scale.setScalar(pulse);
      }
    } else if (this.bombType === 'poison') {
      if (this.animatedMesh) {
        const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.08;
        this.animatedMesh.scale.setScalar(pulse);
      }
    } else if (this.bombType === 'paralysis') {
      if (this.animatedMesh) {
        this.animatedMesh.rotation.x += dt * 4;
        this.animatedMesh.rotation.y += dt * 5;
      }
    } else if (this.bombType === 'ice') {
      if (this.animatedMesh) {
        this.animatedMesh.rotation.z += dt * 3.5;
        this.animatedMesh.rotation.y += dt * 2.0;
      }
    }
  }

  destroy() { disposeObject(this.group); }
}

export class PowerUpModel {
  public group: THREE.Group;
  public id: string;
  public type: PowerUpType;
  public baseX: number = 0;
  public baseY: number = 0;
  public baseZ: number = 0;
  private hoverTime: number = 0;
  private animatedParts: THREE.Object3D[] = [];

  constructor(pu: PowerUpItem) {
    this.id = pu.id;
    this.type = pu.type;
    this.baseX = pu.x;
    this.baseY = pu.y;
    this.baseZ = pu.z;
    this.group = new THREE.Group();
    this.buildItem(pu);
    this.group.position.set(this.baseX, this.baseY, this.baseZ);
  }

  public updateData(pu: PowerUpItem) {
    this.baseX = pu.x;
    this.baseY = pu.y;
    this.baseZ = pu.z;
    if (this.type !== pu.type) {
      this.type = pu.type;
      this.clearMeshes();
      this.buildItem(pu);
    }
  }

  private clearMeshes() {
    while (this.group.children.length > 0) {
      const obj = this.group.children[0];
      this.group.remove(obj);
      obj.traverse((child) => {
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
      });
    }
    this.animatedParts = [];
  }

  private buildItem(pu: PowerUpItem) {
    if (pu.type === 'boxing_gloves') {
      // Pair of bright red boxing gloves floating
      const red = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
      const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

      for (const side of [-0.28, 0.28]) {
        const glove = new THREE.Group();
        glove.position.set(side, 0, 0);

        // Main glove fist
        const fist = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), red);
        fist.scale.set(1, 1.2, 1.3);
        glove.add(fist);

        // Thumb
        const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), red);
        thumb.position.set(side > 0 ? -0.22 : 0.22, -0.05, 0.15);
        glove.add(thumb);

        // Wrist cuff
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 12), white);
        cuff.position.set(0, -0.26, 0);
        glove.add(cuff);

        this.group.add(glove);
        this.animatedParts.push(glove);
      }

      // Golden power ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.65, 0.04, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
    } else if (pu.type === 'jump_boots') {
      // Golden boots with angelic wings
      const gold = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.2 });
      const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      for (const side of [-0.25, 0.25]) {
        const boot = new THREE.Group();
        boot.position.set(side, -0.1, 0);

        // Boot body
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.38, 0.45), gold);
        boot.add(b);

        // Toe
        const toe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), gold);
        toe.position.set(0, -0.1, 0.22);
        toe.scale.set(1, 0.7, 1.3);
        boot.add(toe);

        // Wing
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 4), wingMat);
        wing.position.set(side > 0 ? 0.2 : -0.2, 0.15, -0.1);
        wing.rotation.z = side > 0 ? -0.8 : 0.8;
        boot.add(wing);

        this.group.add(boot);
        this.animatedParts.push(boot);
      }

      // Sky blue aura ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.65, 0.04, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
    } else if (pu.type === 'senzu_bean') {
      // Dragon Ball Senzu Bean / Sacred healing jar
      const potMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
      const beanMat = new THREE.MeshStandardMaterial({ color: 0x86efac, emissive: 0x22c55e, roughness: 0.2 });

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.45, 14), potMat);
      this.group.add(pot);

      // Glowing mystical senzu bean inside
      const bean = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.18, 4, 12), beanMat);
      bean.position.y = 0.28;
      bean.rotation.z = 0.4;
      this.group.add(bean);
      this.animatedParts.push(bean);

      // Radiant energy ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.04, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x4ade80 })
      );
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
    } else if (pu.type.startsWith('bomb_')) {
      // Mini special bomb on hovering pedestal
      const bType = pu.type.replace('bomb_', '') as BombType;
      let col = 0xf97316; // fire
      if (bType === 'poison') col = 0x22c55e;
      if (bType === 'paralysis') col = 0x38bdf8;
      if (bType === 'sticky') col = 0xec4899;
      if (bType === 'ice') col = 0x0ea5e9;

      const miniBomb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 14, 12),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.4 })
      );
      miniBomb.position.y = 0.15;
      this.group.add(miniBomb);
      this.animatedParts.push(miniBomb);

      // Hovering gear/pedestal
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.36, 0.08, 6),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      ped.position.y = -0.22;
      this.group.add(ped);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.035, 8, 24),
        new THREE.MeshBasicMaterial({ color: col })
      );
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
    } else {
      // Default: Shield or Speed
      const color = pu.type === 'shield' ? 0x38bdf8 : 0xfacc15;
      const geo = pu.type === 'shield' ? new THREE.IcosahedronGeometry(0.4, 0) : new THREE.OctahedronGeometry(0.42, 0);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      this.group.add(mesh);
      this.animatedParts.push(mesh);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.04, 8, 20),
        new THREE.MeshBasicMaterial({ color })
      );
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
    }
  }

  update(dt: number) {
    this.hoverTime += dt;
    this.group.rotation.y += dt * 2.2;
    // Hover sinusoidally around precise baseY without cumulative drift
    this.group.position.set(
      this.baseX,
      this.baseY + Math.sin(this.hoverTime * 3.2) * 0.12,
      this.baseZ
    );

    for (const part of this.animatedParts) {
      part.rotation.y += dt * 1.5;
    }
  }

  destroy() {
    this.clearMeshes();
  }
}

export class CrateModel {
  public group: THREE.Group;
  public id: string;
  private woodMesh: THREE.Mesh;
  private bandMesh: THREE.Mesh;

  constructor(crate: CrateItem) {
    this.id = crate.id;
    this.group = new THREE.Group();

    // Wooden / metal reinforced explosive crate
    const geo = new RoundedBoxGeometry(1.3, 1.3, 1.3, 2, 0.065);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb87735, roughness: 0.83, metalness: 0.04 });
    this.woodMesh = new THREE.Mesh(geo, mat);
    this.woodMesh.castShadow = true;
    this.woodMesh.receiveShadow = true;
    this.group.add(this.woodMesh);

    // Cross-band warning strap
    const bandGeo = new THREE.BoxGeometry(1.32, 0.2, 1.32);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x334253, roughness: 0.45, metalness: 0.8 });
    this.bandMesh = new THREE.Mesh(bandGeo, bandMat);
    this.group.add(this.bandMesh);
    const braces = new THREE.MeshStandardMaterial({ color: 0x263748, roughness: 0.45, metalness: 0.7 });
    for (const side of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.32, 1.32), braces);
      band.position.x = side * 0.48;
      this.group.add(band);
      for (const y of [-0.45, 0.45]) {
        const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), braces);
        bolt.position.set(side * 0.48, y, 0.67); this.group.add(bolt);
      }
    }
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ color: 0xffbe5c, roughness: 0.6 }));
    label.position.set(0, 0.25, 0.661); label.rotation.z = Math.PI / 4; this.group.add(label);

    this.group.position.set(crate.x, crate.y + 0.65, crate.z);
  }

  public updateData(crate: CrateItem) {
    this.group.position.set(crate.x, crate.y + 0.65, crate.z);
  }

  destroy() { disposeObject(this.group); }
}
