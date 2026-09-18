import { ATTACK_DURATION } from '@shared/gameplay';
import { buildCharacterAccessories } from './CharacterAccessories';
import * as THREE from 'three';
import { CharacterType, PlayerState } from '@shared/types';

// =======================================================
// SHARED HUMANOID GEOMETRY POOL (Instant GPU Loading)
// Defined anatomical physique: Neck, V-Taper, Deltoids,
// Biceps, Forearms, Hands, Quads, Knees, Calves, Sneakers
// =======================================================
const SHARED_GEOS = {
  // Head & Neck
  neck: new THREE.CylinderGeometry(0.12, 0.15, 0.22, 10),
  headCranium: new THREE.SphereGeometry(0.38, 16, 12),
  jaw: new THREE.ConeGeometry(0.24, 0.28, 5),
  ear: new THREE.SphereGeometry(0.09, 8, 6),
  eye: new THREE.SphereGeometry(0.095, 10, 8),
  pupil: new THREE.SphereGeometry(0.048, 8, 6),
  eyeSpark: new THREE.SphereGeometry(0.016, 6, 4),
  brow: new THREE.BoxGeometry(0.19, 0.04, 0.05),
  nose: new THREE.ConeGeometry(0.05, 0.11, 4),
  mouth: new THREE.TorusGeometry(0.095, 0.02, 6, 10, Math.PI),

  // V-Taper Torso & Core
  torsoUpper: new THREE.BoxGeometry(0.70, 0.42, 0.44),
  chestPec: new THREE.SphereGeometry(0.18, 10, 8),
  collarBone: new THREE.BoxGeometry(0.66, 0.05, 0.08),
  torsoWaist: new THREE.CylinderGeometry(0.24, 0.22, 0.30, 10),
  absContour: new THREE.BoxGeometry(0.28, 0.22, 0.04),
  torsoPelvis: new THREE.CylinderGeometry(0.24, 0.26, 0.20, 10),
  belt: new THREE.BoxGeometry(0.58, 0.11, 0.48),
  buckle: new THREE.BoxGeometry(0.15, 0.15, 0.06),

  // Articulated Arms & Hands
  deltoid: new THREE.SphereGeometry(0.17, 12, 10),
  bicep: new THREE.CapsuleGeometry(0.105, 0.22, 4, 10),
  elbow: new THREE.SphereGeometry(0.09, 8, 8),
  forearm: new THREE.CylinderGeometry(0.115, 0.095, 0.26, 10),
  wristBand: new THREE.CylinderGeometry(0.125, 0.125, 0.08, 10),
  handPalm: new THREE.BoxGeometry(0.16, 0.19, 0.10),
  knuckles: new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8),
  thumb: new THREE.CapsuleGeometry(0.05, 0.11, 4, 8),

  // Articulated Legs & Combat Sneakers
  thigh: new THREE.CapsuleGeometry(0.13, 0.28, 4, 10),
  kneePad: new THREE.SphereGeometry(0.11, 8, 8),
  calf: new THREE.CylinderGeometry(0.12, 0.098, 0.28, 10),
  ankleCollar: new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10),
  sneakerBase: new THREE.BoxGeometry(0.28, 0.11, 0.48),
  sneakerSole: new THREE.BoxGeometry(0.30, 0.06, 0.50),
  sneakerToe: new THREE.SphereGeometry(0.13, 10, 8),

  // Status & Power VFX
  star: new THREE.OctahedronGeometry(0.1),
  shield: new THREE.SphereGeometry(1.25, 14, 12),
  freezeCrystal: new THREE.OctahedronGeometry(1.35, 0),
  paralysisPrism: new THREE.IcosahedronGeometry(1.3, 0),
  flameCone: new THREE.ConeGeometry(0.18, 0.45, 4),
  bubbleSphere: new THREE.SphereGeometry(0.13, 8, 8),
  intentRing: new THREE.TorusGeometry(0.88, 0.035, 6, 24),
};

export class CharacterModel {
  public group: THREE.Group;
  public characterType: CharacterType;
  public baseColor: string;

  private visual = new THREE.Group();
  private headGroup = new THREE.Group();
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private accessoryGroup!: THREE.Group;

  private shieldMesh!: THREE.Mesh;
  private freezeMesh!: THREE.Mesh;
  private paralysisMesh!: THREE.Mesh;
  private dizzyStarsGroup!: THREE.Group;
  private nameplateMesh!: THREE.Sprite;
  private intentRing!: THREE.Mesh;
  private burnGroup!: THREE.Group;
  private poisonGroup!: THREE.Group;

  private initialized = false;
  private animationTime = 0;
  private walkCycle = 0;

  private suitMat!: THREE.MeshStandardMaterial;
  private skinMat!: THREE.MeshStandardMaterial;
  private darkMat = new THREE.MeshStandardMaterial({ color: 0x182335, roughness: 0.55 });
  private whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8efe0, roughness: 0.45 });
  private normalGlove = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
  private powerGlove = new THREE.MeshStandardMaterial({ color: 0xff2e4d, emissive: 0x7f0919, roughness: 0.3 });
  private goldenBoot = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x854d0e, roughness: 0.25 });

  constructor(characterType: CharacterType, color: string, name: string) {
    this.characterType = characterType;
    this.baseColor = color;
    this.group = new THREE.Group();

    this.initMaterials();
    this.buildHumanoidAnatomy();
    this.buildStatusOverlays();
    this.buildNameplate(name);

    this.group.add(this.visual);
  }

  private initMaterials() {
    this.suitMat = new THREE.MeshStandardMaterial({
      color: this.baseColor,
      roughness: this.characterType === 'robot' ? 0.3 : 0.45,
      metalness: this.characterType === 'robot' ? 0.65 : 0.08,
    });

    const skinCol =
      this.characterType === 'alien' ? 0xa3e635 : this.characterType === 'robot' ? 0xcbd5e1 : 0xffc89c;
    this.skinMat = new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.65 });
  }

  private buildHumanoidAnatomy() {
    const mesh = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x = 0,
      y = 0,
      z = 0,
      parent: THREE.Object3D = this.visual
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    // 1. Torso: Athletic V-Taper (Wide shoulders, muscular chest, tapered waist)
    // Upper Chest (V-Taper)
    const upperChest = mesh(SHARED_GEOS.torsoUpper, this.suitMat, 0, 0.98, 0);
    mesh(SHARED_GEOS.collarBone, this.darkMat, 0, 1.15, 0.16);

    // Defined Pectoral Contours
    for (const side of [-1, 1]) {
      const pec = mesh(SHARED_GEOS.chestPec, this.suitMat, side * 0.16, 0.98, 0.20);
      pec.scale.set(1.0, 0.85, 0.5);
    }

    // Tapered Waist / Athletic Midriff
    mesh(SHARED_GEOS.torsoWaist, this.suitMat, 0, 0.74, 0);
    const abs = mesh(SHARED_GEOS.absContour, this.darkMat, 0, 0.74, 0.18);
    abs.scale.set(1, 1, 0.5);

    // Pelvis & Utility Belt
    mesh(SHARED_GEOS.torsoPelvis, this.suitMat, 0, 0.56, 0);
    mesh(SHARED_GEOS.belt, this.darkMat, 0, 0.54, 0);
    mesh(SHARED_GEOS.buckle, this.normalGlove, 0, 0.54, 0.25);

    // 2. Head & Neck: Natural Anatomical Connection & Sculpted Jaw
    mesh(SHARED_GEOS.neck, this.skinMat, 0, 1.22, 0);

    this.headGroup.position.set(0, 1.42, 0);
    this.visual.add(this.headGroup);

    // Sculpted Cranium & Contoured Jawline
    const cranium = mesh(SHARED_GEOS.headCranium, this.skinMat, 0, 0.08, 0, this.headGroup);
    cranium.scale.set(
      this.characterType === 'alien' ? 1.15 : 1.0,
      this.characterType === 'robot' ? 0.95 : 1.04,
      0.98
    );

    const jaw = mesh(SHARED_GEOS.jaw, this.skinMat, 0, -0.06, 0.06, this.headGroup);
    jaw.rotation.x = Math.PI;
    jaw.scale.set(0.95, 0.7, 0.85);

    // Ears, Eyes, Brow, Nose, Smile
    for (const side of [-1, 1]) {
      mesh(SHARED_GEOS.ear, this.skinMat, side * 0.38, 0.08, -0.02, this.headGroup);
      const eye = mesh(SHARED_GEOS.eye, this.whiteMat, side * 0.14, 0.09, 0.32, this.headGroup);
      eye.scale.set(1, 1.1, 0.45);
      mesh(SHARED_GEOS.pupil, this.darkMat, side * 0.14, 0.09, 0.365, this.headGroup);
      mesh(SHARED_GEOS.eyeSpark, this.whiteMat, side * 0.14 - 0.012, 0.11, 0.39, this.headGroup);
      const brow = mesh(SHARED_GEOS.brow, this.darkMat, side * 0.14, 0.22, 0.31, this.headGroup);
      brow.rotation.z = side * 0.12;
    }

    const nose = mesh(SHARED_GEOS.nose, this.skinMat, 0, 0.02, 0.38, this.headGroup);
    nose.rotation.x = -Math.PI / 2;
    const mouth = mesh(SHARED_GEOS.mouth, this.darkMat, 0, -0.10, 0.34, this.headGroup);
    mouth.rotation.z = Math.PI;

    // 3. Articulated Humanoid Arms: Deltoids, Biceps, Forearms & Fists
    const buildArm = (side: number) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.46, 1.05, 0);
      this.visual.add(armGroup);

      // Deltoid Shoulder Cap
      mesh(SHARED_GEOS.deltoid, this.suitMat, 0, 0, 0, armGroup);

      // Bicep / Upper Arm
      mesh(SHARED_GEOS.bicep, this.suitMat, 0, -0.18, 0, armGroup);

      // Elbow Joint
      mesh(SHARED_GEOS.elbow, this.darkMat, 0, -0.32, -0.02, armGroup);

      // Tapered Forearm
      mesh(SHARED_GEOS.forearm, this.suitMat, 0, -0.46, 0.01, armGroup);

      // Wrist Cuff Guard
      mesh(SHARED_GEOS.wristBand, this.whiteMat, 0, -0.60, 0.02, armGroup);

      // Humanoid Combat Fist with Knuckles & Opposing Thumb
      const fist = new THREE.Group();
      fist.position.set(0, -0.72, 0.04);
      fist.name = side === 1 ? 'rightGlove' : 'leftGlove';

      mesh(SHARED_GEOS.handPalm, this.normalGlove, 0, 0, 0, fist);
      const knuckleBar = mesh(SHARED_GEOS.knuckles, this.normalGlove, 0, -0.08, 0.04, fist);
      knuckleBar.rotation.z = Math.PI / 2;
      const thumb = mesh(SHARED_GEOS.thumb, this.normalGlove, -side * 0.12, 0.02, 0.07, fist);
      thumb.rotation.z = side * 0.45;

      armGroup.add(fist);
      return armGroup;
    };

    this.leftArm = buildArm(-1);
    this.rightArm = buildArm(1);

    // 4. Articulated Humanoid Legs: Thighs, Knees, Calves & Combat Sneakers
    const buildLeg = (side: number) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.20, 0.48, 0);
      this.visual.add(legGroup);

      // Muscular Thigh (Quads)
      mesh(SHARED_GEOS.thigh, this.darkMat, 0, -0.15, 0.01, legGroup);

      // Articulated Knee Cap
      mesh(SHARED_GEOS.kneePad, this.suitMat, 0, -0.32, 0.08, legGroup);

      // Muscular Calf
      mesh(SHARED_GEOS.calf, this.darkMat, 0, -0.48, 0, legGroup);

      // Sneaker Ankle Collar
      mesh(SHARED_GEOS.ankleCollar, this.whiteMat, 0, -0.62, 0.02, legGroup);

      // Athletic Combat Sneaker with Thick Sole & Curved Toe
      const boot = new THREE.Group();
      boot.position.set(0, -0.70, 0.08);
      boot.name = 'bootMesh';

      mesh(SHARED_GEOS.sneakerBase, this.suitMat, 0, 0, 0, boot);
      mesh(SHARED_GEOS.sneakerSole, this.darkMat, 0, -0.06, 0.01, boot);
      const toe = mesh(SHARED_GEOS.sneakerToe, this.whiteMat, 0, -0.01, 0.22, boot);
      toe.scale.set(1, 0.65, 1.2);

      legGroup.add(boot);
      return legGroup;
    };

    this.leftLeg = buildLeg(-1);
    this.rightLeg = buildLeg(1);

    // 5. Character Identity Accessories
    this.accessoryGroup = buildCharacterAccessories(this.characterType);
    this.visual.add(this.accessoryGroup);
  }

  private buildStatusOverlays() {
    // 1. Ice Freeze Crystal Block (Translucent, refractive frosty encasing)
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.2,
      clearcoat: 1,
      depthWrite: false,
    });
    this.freezeMesh = new THREE.Mesh(SHARED_GEOS.freezeCrystal, iceMat);
    this.freezeMesh.scale.set(0.9, 1.15, 0.9);
    this.freezeMesh.position.y = 1.0;
    this.freezeMesh.visible = false;
    this.group.add(this.freezeMesh);

    // 2. Paralysis Ice Prism
    const paraMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.42,
      roughness: 0.15,
      metalness: 0.2,
      clearcoat: 1,
      depthWrite: false,
    });
    this.paralysisMesh = new THREE.Mesh(SHARED_GEOS.paralysisPrism, paraMat);
    this.paralysisMesh.scale.set(0.8, 1.05, 0.8);
    this.paralysisMesh.position.y = 1.0;
    this.paralysisMesh.visible = false;
    this.group.add(this.paralysisMesh);

    // 3. Burn Flame Spikes
    this.burnGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const flame = new THREE.Mesh(
        SHARED_GEOS.flameCone,
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xef4444 : 0xf97316 })
      );
      const angle = (i / 5) * Math.PI * 2;
      flame.position.set(Math.cos(angle) * 0.48, 0.7 + (i % 3) * 0.25, Math.sin(angle) * 0.48);
      this.burnGroup.add(flame);
    }
    this.burnGroup.visible = false;
    this.group.add(this.burnGroup);

    // 4. Poison Bubbles
    this.poisonGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const bubble = new THREE.Mesh(
        SHARED_GEOS.bubbleSphere,
        new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.8 })
      );
      const angle = (i / 4) * Math.PI * 2;
      bubble.position.set(Math.cos(angle) * 0.45, 1.8 + i * 0.15, Math.sin(angle) * 0.45);
      this.poisonGroup.add(bubble);
    }
    this.poisonGroup.visible = false;
    this.group.add(this.poisonGroup);

    // 5. Dizzy Stars
    this.dizzyStarsGroup = new THREE.Group();
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const star = new THREE.Mesh(SHARED_GEOS.star, starMat);
      star.position.set(Math.cos(angle) * 0.5, 2.1, Math.sin(angle) * 0.5);
      this.dizzyStarsGroup.add(star);
    }
    this.dizzyStarsGroup.visible = false;
    this.group.add(this.dizzyStarsGroup);

    // 6. Shield
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      roughness: 0.2,
      metalness: 0.25,
      clearcoat: 1,
      depthWrite: false,
    });
    this.shieldMesh = new THREE.Mesh(SHARED_GEOS.shield, shieldMat);
    this.shieldMesh.position.y = 0.95;
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    // 7. Intent Ring
    this.intentRing = new THREE.Mesh(
      SHARED_GEOS.intentRing,
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
    );
    this.intentRing.rotation.x = Math.PI / 2;
    this.intentRing.position.y = 0.05;
    this.group.add(this.intentRing);
  }

  private buildNameplate(name: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.roundRect ? ctx.roundRect(10, 10, 236, 44, 12) : ctx.fillRect(10, 10, 236, 44);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 128, 32);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    this.nameplateMesh = new THREE.Sprite(mat);
    this.nameplateMesh.scale.set(2.4, 0.6, 1);
    this.nameplateMesh.position.set(0, 2.45, 0);
    this.group.add(this.nameplateMesh);
  }

  update(player: PlayerState, dt: number, isLocal = false) {
    this.group.visible = player.isAlive;
    if (!player.isAlive) {
      this.initialized = false;
      return;
    }

    // 1. Position and Rotation Interpolation
    const target = new THREE.Vector3(player.x, player.y, player.z);
    if (!this.initialized || this.group.position.distanceToSquared(target) > 100) {
      this.group.position.copy(target);
      this.initialized = true;
    } else {
      const posLerp = isLocal ? 60 : 24;
      this.group.position.lerp(target, 1 - Math.exp(-posLerp * dt));
    }

    const angle = Math.atan2(
      Math.sin(player.rotY - this.group.rotation.y),
      Math.cos(player.rotY - this.group.rotation.y)
    );
    const rotLerp = isLocal ? 55 : 22;
    this.group.rotation.y += angle * (1 - Math.exp(-rotLerp * dt));

    this.animationTime += dt;
    const speed = Math.hypot(player.vx, player.vz);

    // 2. Reset base limb pivots
    this.leftArm.position.set(-0.46, 1.05, 0);
    this.rightArm.position.set(0.46, 1.05, 0);
    this.leftLeg.position.set(-0.20, 0.48, 0);
    this.rightLeg.position.set(0.20, 0.48, 0);
    this.visual.scale.set(1, 1, 1);

    // 3. Locomotion & Leaning
    if (player.isGrounded) {
      if (speed > 0.25) {
        // Active Running Locomotion
        this.walkCycle += dt * Math.min(24, 6 + speed * 2.5);
        const stride = Math.min(0.85, 0.2 + speed * 0.055);
        const armSwing = Math.min(1.1, 0.35 + speed * 0.07);

        // Forward tilt & banking into turn
        const forwardLean = Math.min(0.36, speed * 0.022);
        const bankLean = Math.min(0.22, Math.max(-0.22, angle * 0.4));
        this.visual.rotation.set(forwardLean, 0, -bankLean);

        // Athletic stride bobbing
        this.visual.position.y = Math.abs(Math.sin(this.walkCycle * 2)) * 0.075;

        // Legs stepping cycle
        this.leftLeg.rotation.set(Math.sin(this.walkCycle) * stride, 0, 0);
        this.rightLeg.rotation.set(-Math.sin(this.walkCycle) * stride, 0, 0);

        // Arms counter-swinging with fists pumped
        this.leftArm.rotation.set(-0.5 - Math.sin(this.walkCycle) * armSwing, 0, -0.15);
        this.rightArm.rotation.set(-0.5 + Math.sin(this.walkCycle) * armSwing, 0, 0.15);
      } else {
        // Idle Breathing Stance (characters feel alive)
        const breathe = Math.sin(this.animationTime * 3.2);
        this.visual.rotation.set(0, 0, 0);
        this.visual.position.y = breathe * 0.018;
        this.visual.scale.set(1 + breathe * 0.02, 1 + breathe * 0.025, 1 + breathe * 0.02);

        this.leftLeg.rotation.set(0, 0, -0.05);
        this.rightLeg.rotation.set(0, 0, 0.05);
        this.leftArm.rotation.set(-0.2 - breathe * 0.05, 0, -0.16);
        this.rightArm.rotation.set(-0.2 - breathe * 0.05, 0, 0.16);
      }
    } else {
      // In-Air / Jump Tuck & Fall Extension
      if (player.vy > 1.0) {
        // Jump Ascent / Tuck
        this.visual.rotation.set(-0.15, 0, 0);
        this.visual.position.y = 0.06;
        this.leftLeg.rotation.set(-0.85, 0, -0.1);
        this.rightLeg.rotation.set(-0.65, 0, 0.1);
        this.leftArm.rotation.set(-0.9, 0, -0.85);
        this.rightArm.rotation.set(-0.9, 0, 0.85);
      } else {
        // Fall Descent / Impact Prep
        this.visual.rotation.set(0.12, 0, 0);
        this.visual.position.y = 0;
        this.leftLeg.rotation.set(0.4, 0, 0);
        this.rightLeg.rotation.set(0.25, 0, 0);
        this.leftArm.rotation.set(-0.4, 0, -0.9);
        this.rightArm.rotation.set(-0.4, 0, 0.9);
      }
    }

    // 4. Combat Attacks (Impactful, Expressive & Readable)
    if (player.isPunching && player.punchCooldown > 0) {
      const kind = player.attackKind ?? 'jab';
      const duration = player.attackDuration ?? ATTACK_DURATION[kind];
      const phase = 1 - Math.min(1, player.punchCooldown / duration);
      const strike = Math.sin(Math.min(1, phase * 1.8) * Math.PI);

      if (kind === 'kick') {
        // Full martial arts roundhouse / front kick
        this.rightLeg.rotation.set(-strike * 2.2, 0, 0);
        this.rightLeg.position.set(0.20, 0.48, strike * 0.48);
        this.visual.rotation.set(-strike * 0.35, 0, strike * 0.2);
        this.leftArm.rotation.set(-1.1, 0, -0.9);
        this.rightArm.rotation.set(0.5, 0, 0.7);
      } else if (kind === 'uppercut') {
        // Explosive vertical lift punch
        this.rightArm.position.set(0.36, 1.05 + strike * 0.65, strike * 0.25);
        this.rightArm.rotation.set(-2.85, 0, 0.2);
        this.leftArm.rotation.set(-0.9, 0, -0.5);
        this.visual.position.y += strike * 0.35;
        this.visual.rotation.set(-strike * 0.35, 0, 0);
      } else if (kind === 'hook') {
        // Wide curving sweep with full torso rotation
        this.leftArm.position.set(-0.46, 1.05, strike * 0.35);
        this.leftArm.rotation.set(-1.25, -strike * 1.6, -0.3);
        this.rightArm.rotation.set(-1.3, -0.2, 0.3);
        this.visual.rotation.set(0, -strike * 0.75, 0);
      } else if (kind === 'dash') {
        // Ninja forward dash pose
        this.visual.rotation.set(0.58, 0, 0);
        this.leftArm.rotation.set(1.25, 0, -0.3);
        this.rightArm.rotation.set(1.25, 0, 0.3);
        this.leftLeg.rotation.set(-0.7, 0, 0);
        this.rightLeg.rotation.set(0.7, 0, 0);
      } else {
        // Jab: sharp, fast straight punch
        this.rightArm.position.set(0.46, 1.05, strike * 0.75);
        this.rightArm.rotation.set(-1.55, 0, 0);
        this.leftArm.rotation.set(-1.25, 0.35, 0.4); // boxing guard
        this.visual.rotation.set(strike * 0.16, strike * 0.45, 0);
      }
    } else if (player.botIntent === 'winding_up') {
      this.rightArm.rotation.set(-2.1, 0.4, 0.35);
      this.leftArm.rotation.set(-1.1, -0.2, -0.3);
      this.visual.rotation.y = -0.3;
      this.visual.scale.set(0.96, 0.92, 0.96);
    } else if (player.isCarried) {
      // Carried victim struggling
      this.visual.rotation.set(0, 0, Math.PI / 2);
      this.visual.position.y = 0.5;
      this.leftLeg.rotation.x = Math.sin(this.animationTime * 18) * 0.85;
      this.rightLeg.rotation.x = -this.leftLeg.rotation.x;
      this.leftArm.rotation.set(-1.3, 0, -1.3);
      this.rightArm.rotation.set(1.3, 0, 1.3);
    } else if (player.carriedPlayerId) {
      // Carrier holding opponent overhead
      this.leftArm.rotation.set(-2.9, 0, -0.3);
      this.rightArm.rotation.set(-2.9, 0, 0.3);
      this.visual.rotation.set(-0.15, 0, 0);
    } else if (player.heldBombId) {
      // Holding bomb ready to throw
      this.leftArm.rotation.set(-1.65, -0.4, 0);
      this.rightArm.rotation.set(-1.65, 0.4, 0);
    } else if (player.isStunned) {
      this.visual.rotation.set(-0.35, 0, Math.sin(this.animationTime * 18) * 0.32);
      this.leftArm.rotation.z = -1.15;
      this.rightArm.rotation.z = 1.15;
      this.leftLeg.rotation.x = 0.55;
    }

    // 5. Badges & Power-ups Visuals
    const isGloves = player.powerUp === 'boxing_gloves' || player.powerUp === 'strength';
    for (const arm of [this.leftArm, this.rightArm]) {
      const glove = arm.getObjectByName(arm === this.leftArm ? 'leftGlove' : 'rightGlove') as THREE.Group;
      if (glove) {
        glove.scale.setScalar(player.powerUp === 'boxing_gloves' ? 1.75 : isGloves ? 1.4 : 1.0);
        glove.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = isGloves ? this.powerGlove : this.normalGlove;
          }
        });
      }
    }

    const isBoots = player.powerUp === 'jump_boots';
    for (const leg of [this.leftLeg, this.rightLeg]) {
      const boot = leg.getObjectByName('bootMesh') as THREE.Group;
      if (boot) {
        boot.scale.set(isBoots ? 1.35 : 1.0, isBoots ? 1.15 : 1.0, isBoots ? 1.6 : 1.0);
        boot.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry === SHARED_GEOS.sneakerBase) {
            (child as THREE.Mesh).material = isBoots ? this.goldenBoot : this.suitMat;
          }
        });
      }
    }

    // Status overlays
    this.shieldMesh.visible = player.powerUp === 'shield' || (player.spawnGrace ?? 0) > 0;
    this.shieldMesh.rotation.y += dt * 1.5;

    this.intentRing.visible = player.botIntent === 'winding_up';
    this.intentRing.scale.setScalar(1 + Math.sin(this.animationTime * 12) * 0.08);

    this.dizzyStarsGroup.visible = player.isStunned || player.isCarried;
    this.dizzyStarsGroup.rotation.y += dt * 5;

    // ICE FREEZE STATUS: Translucent crystalline frost block encasing
    this.freezeMesh.visible = player.statusEffect?.type === 'freeze';
    if (this.freezeMesh.visible) {
      this.freezeMesh.rotation.y += dt * 1.2;
    }

    this.paralysisMesh.visible = player.statusEffect?.type === 'paralysis';
    if (this.paralysisMesh.visible) {
      this.paralysisMesh.rotation.y += dt * 2.0;
    }

    this.burnGroup.visible = player.statusEffect?.type === 'burn';
    if (this.burnGroup.visible) {
      this.burnGroup.rotation.y += dt * 4.0;
    }

    this.poisonGroup.visible = player.statusEffect?.type === 'poison';
    if (this.poisonGroup.visible) {
      this.poisonGroup.rotation.y += dt * 3.0;
      for (let i = 0; i < this.poisonGroup.children.length; i++) {
        this.poisonGroup.children[i].position.y = 1.6 + Math.sin(Date.now() * 0.006 + i) * 0.2;
      }
    }
  }

  destroy() {
    this.nameplateMesh.material.map?.dispose();
    this.suitMat.dispose();
    this.skinMat.dispose();
    this.darkMat.dispose();
    this.whiteMat.dispose();
    this.normalGlove.dispose();
    this.powerGlove.dispose();
    this.goldenBoot.dispose();
  }
}
