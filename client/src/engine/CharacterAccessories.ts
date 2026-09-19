import * as THREE from 'three';
import type { CharacterType } from '@shared/types';

export function buildCharacterAccessories(type: CharacterType) {
  const group = new THREE.Group();


    if (type === 'robot') {
      // Antenna + cyan LED screen
      const antBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.35),
        new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
      );
      antBase.position.set(0, 1.85, 0);

      const antTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
      );
      antTip.position.set(0, 2.05, 0);

      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.16, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
      );
      visor.position.set(0, 1.4, 0.4);

      group.add(antBase, antTip, visor);
    } else if (type === 'pirate') {
      // Pirate Tricorn Hat
      const hatGeo = new THREE.ConeGeometry(0.55, 0.35, 3);
      hatGeo.rotateY(Math.PI / 6);
      const hatMat = new THREE.MeshLambertMaterial({ color: 0x1e1e24 });
      const hat = new THREE.Mesh(hatGeo, hatMat);
      hat.position.set(0, 1.85, 0);

      // Gold earring
      const earringGeo = new THREE.TorusGeometry(0.07, 0.02, 8, 12);
      const goldMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const earring = new THREE.Mesh(earringGeo, goldMat);
      earring.position.set(0.44, 1.35, 0);
      earring.rotation.y = Math.PI / 2;

      // Eye patch
      const patch = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      patch.position.set(-0.16, 1.4, 0.38);

      group.add(hat, earring, patch);
    } else if (type === 'ninja') {
      // Ninja headband + mask
      const bandGeo = new THREE.TorusGeometry(0.43, 0.06, 8, 16);
      const redMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
      const band = new THREE.Mesh(bandGeo, redMat);
      band.position.set(0, 1.5, 0);
      band.rotation.x = Math.PI / 2;

      // Ribbon tails
      const tailGeo = new THREE.BoxGeometry(0.08, 0.45, 0.02);
      const tail = new THREE.Mesh(tailGeo, redMat);
      tail.position.set(0, 1.3, -0.45);
      tail.rotation.x = 0.2;

      group.add(band, tail);
    } else if (type === 'astronaut') {
      // Space bubble helmet
      const helmetGeo = new THREE.SphereGeometry(0.52, 16, 16);
      const helmetMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.8,
        opacity: 1,
        transparent: true,
        roughness: 0.1,
      });
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.set(0, 1.35, 0);

      // Backpack oxygen tanks
      const tankGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.55, 8);
      const tankMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
      const leftTank = new THREE.Mesh(tankGeo, tankMat);
      leftTank.position.set(-0.18, 0.8, -0.38);
      const rightTank = new THREE.Mesh(tankGeo, tankMat);
      rightTank.position.set(0.18, 0.8, -0.38);

      group.add(helmet, leftTank, rightTank);
    } else if (type === 'alien') {
      // Cute alien bouncy horns
      const hornGeo = new THREE.ConeGeometry(0.08, 0.35, 8);
      const hornMat = new THREE.MeshLambertMaterial({ color: 0xa855f7 });
      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftHorn.position.set(-0.25, 1.85, 0);
      leftHorn.rotation.z = 0.3;
      const rightHorn = new THREE.Mesh(hornGeo, hornMat);
      rightHorn.position.set(0.25, 1.85, 0);
      rightHorn.rotation.z = -0.3;

      group.add(leftHorn, rightHorn);
    } else {
      // Explorer Safari Hat
      const hatBrim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.05, 16),
        new THREE.MeshLambertMaterial({ color: 0xd4a373 })
      );
      hatBrim.position.set(0, 1.7, 0);

      const hatTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0xbc6c25 })
      );
      hatTop.position.set(0, 1.7, 0);

      group.add(hatBrim, hatTop);
    }


  const metal = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.3 });
  const cloth = new THREE.MeshStandardMaterial({ color: type === 'ninja' ? 0x172033 : type === 'pirate' ? 0x70233c : 0x926239, roughness: 0.85 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xf6c65b, roughness: 0.4, metalness: 0.4 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.castShadow = false; group.add(mesh); return mesh;
  };
  if (type === 'robot') {
    for (const side of [-1, 1]) {
      const ear = add(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 16), metal, side * 0.45, 1.43, 0);
      ear.rotation.z = Math.PI / 2;
      add(new THREE.BoxGeometry(0.18, 0.25, 0.15), metal, side * 0.37, 0.92, 0.21);
    }
    for (let i = -1; i <= 1; i++) add(new THREE.BoxGeometry(0.07, 0.15, 0.04), accent, i * 0.1, 0.9, 0.38);
  } else if (type === 'ninja') {
    const mask = add(new THREE.SphereGeometry(0.36, 20, 12), cloth, 0, 1.29, 0.15); mask.scale.set(1, 0.42, 1);
    const scarf = add(new THREE.TorusGeometry(0.26, 0.07, 8, 20), cloth, 0, 1.16, 0); scarf.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const ribbon = add(new THREE.BoxGeometry(0.13, 0.55, 0.045), accent, side * 0.16, 1.15, -0.47);
      ribbon.rotation.z = side * 0.35;
    }
  } else if (type === 'pirate') {
    for (const side of [-1, 1]) {
      const lapel = add(new THREE.BoxGeometry(0.16, 0.46, 0.08), cloth, side * 0.29, 0.84, 0.29);
      lapel.rotation.z = side * -0.25;
      for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.035, 8, 6), accent, side * 0.25, 0.65 + i * 0.13, 0.36);
    }
    add(new THREE.SphereGeometry(0.095, 12, 8), metal, 0, 1.86, 0.23);
  } else if (type === 'astronaut') {
    const collar = add(new THREE.TorusGeometry(0.33, 0.07, 8, 24), metal, 0, 1.12, 0); collar.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.35, 0.25, 0.08), metal, 0, 0.86, 0.36);
    for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: [0x38bdf8, 0xfb7185, 0xa3e635][i] }), (i - 1) * 0.1, 0.85, 0.42);
  } else if (type === 'alien') {
    const alien = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.55 });
    for (const side of [-1, 1]) {
      const ear = add(new THREE.ConeGeometry(0.16, 0.42, 12), alien, side * 0.49, 1.51, 0);
      ear.rotation.z = -side * 1.2;
    }
    for (let i = -1; i <= 1; i++) add(new THREE.SphereGeometry(0.035, 8, 6), accent, i * 0.1, 1.74, 0.29);
  } else {
    for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.22, 0.22, 0.12), cloth, side * 0.23, 0.77, 0.32);
    const scarf = add(new THREE.ConeGeometry(0.17, 0.3, 3), accent, 0, 1.02, 0.35); scarf.rotation.z = Math.PI;
  }
  return group;
}
