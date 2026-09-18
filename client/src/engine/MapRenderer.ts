import * as THREE from 'three';
import type { MapType } from '@shared/types';
import { panelMaterial, emissiveMaterial, disposeObject } from './rendering/SurfaceMaterials';

export class MapRenderer {
  public group = new THREE.Group();
  private currentMapType: MapType | null = null;
  private animated: { object: THREE.Object3D; speed: number }[] = [];
  private time = 0;

  buildMap(type: MapType) {
    if (type === this.currentMapType) return;
    this.clear(); this.currentMapType = type;
    if (type === 'floating_arena') this.floating();
    else if (type === 'urban_rooftop') this.rooftop();
    else if (type === 'danger_island') this.volcano();
    else this.tournament();
    this.backdrop(type);
  }
  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = true; this.group.add(mesh); return mesh;
  }
  private ring(radius: number, width: number, y: number, color: number, x = 0, z = 0) {
    const mesh = this.mesh(new THREE.TorusGeometry(radius, width, 8, 96), emissiveMaterial(color), x, y, z);
    mesh.rotation.x = Math.PI / 2; mesh.castShadow = false; return mesh;
  }
  private disc(inner: number, outer: number, y: number, material: THREE.Material, x = 0, z = 0) {
    const mesh = this.mesh(new THREE.RingGeometry(inner, outer, 96), material, x, y, z);
    mesh.rotation.x = -Math.PI / 2; mesh.castShadow = false; return mesh;
  }
  private panels(inner: number, outer: number, count: number, y: number, color: number) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.6 });
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2;
      const seam = this.mesh(new THREE.BoxGeometry(0.045, 0.015, outer - inner), material, Math.sin(a) * (inner + outer) / 2, y, Math.cos(a) * (inner + outer) / 2);
      seam.rotation.y = a; seam.castShadow = false;
    }
  }
  private floating() {
    const top = panelMaterial(0x718899);
    const wall = new THREE.MeshStandardMaterial({ color: 0x263a50, roughness: 0.48, metalness: 0.65, side: THREE.DoubleSide });
    // A real hole through the platform, with its own inner wall.
    this.disc(3.2, 16, 0, top);
    this.mesh(new THREE.CylinderGeometry(16, 14.8, 2.5, 96, 1, true), wall, 0, -1.25);
    this.mesh(new THREE.CylinderGeometry(3.2, 3.2, 2.5, 64, 1, true), wall, 0, -1.25);
    this.disc(14.8, 15.8, 0.014, new THREE.MeshStandardMaterial({ color: 0x263447, metalness: 0.6, roughness: 0.5 }));
    this.panels(3.5, 14.8, 16, 0.025, 0x364e62);
    this.ring(15.92, 0.075, 0.05, 0x68baff);
    this.ring(3.24, 0.075, 0.05, 0xffb150);
    this.ring(15.3, 0.045, -1.65, 0x7a6aff);
    this.ring(3.22, 0.045, -1.4, 0xff7645);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const rib = this.mesh(new THREE.BoxGeometry(0.55, 1.9, 0.7), wall, Math.sin(a) * 15.1, -1.1, Math.cos(a) * 15.1); rib.rotation.y = a;
      const marker = this.mesh(new THREE.BoxGeometry(0.7, 0.025, 0.23), emissiveMaterial(0x94cfff, 1.6), Math.sin(a) * 14.2, 0.03, Math.cos(a) * 14.2); marker.rotation.y = a;
    }
    for (const [x, z] of [[18, 0], [-18, 0], [0, 18], [0, -18]]) {
      this.mesh(new THREE.CylinderGeometry(3.8, 3.2, 1.8, 48), wall, x, -0.91, z);
      this.disc(0, 3.8, 0, top, x, z);
      this.ring(3.7, 0.075, 0.05, 0x7ed9e8, x, z);
      this.ring(2.2, 0.025, 0.025, 0x7ed9e8, x, z);
    }
  }
  private rooftop() {
    const concrete = panelMaterial(0x83909c, 'concrete');
    const dark = new THREE.MeshStandardMaterial({ color: 0x293442, roughness: 0.65, metalness: 0.35 });
    this.mesh(new THREE.BoxGeometry(34, 3, 34), concrete, 0, -1.5);
    this.mesh(new THREE.BoxGeometry(8, 1.2, 8), dark, 0, 0.6);
    const paint = new THREE.MeshStandardMaterial({ color: 0xffd487, roughness: 0.8 });
    for (const side of [-1, 1]) {
      this.mesh(new THREE.BoxGeometry(0.65, 0.018, 3.4), paint, side * 1.2, 1.22);
      for (let i = -15; i <= 15; i += 2) {
        this.mesh(new THREE.BoxGeometry(0.7, 0.025, 0.45), paint, i, 0.025, side * 16.6);
        this.mesh(new THREE.BoxGeometry(0.45, 0.025, 0.7), paint, side * 16.6, 0.025, i);
      }
    }
    this.mesh(new THREE.BoxGeometry(2.8, 0.018, 0.6), paint, 0, 1.22);
    this.ring(3.45, 0.028, 1.23, 0x6effc1);
    for (let i = -12; i <= 12; i += 4) {
      this.mesh(new THREE.BoxGeometry(34, 0.009, 0.025), dark, 0, 0.009, i);
      this.mesh(new THREE.BoxGeometry(0.025, 0.009, 34), dark, i, 0.009, 0);
    }
    // Buildings are outside the playable roof and below its surface.
    for (let i = 0; i < 32; i++) {
      const a = i * 2.39996; const radius = 28 + i % 4 * 8; const height = 8 + i % 7 * 3;
      const x = Math.sin(a) * radius, z = Math.cos(a) * radius;
      this.mesh(new THREE.BoxGeometry(4 + i % 3, height, 5), dark, x, -height / 2 - 7, z);
      for (let row = 0; row < 3; row++) this.mesh(new THREE.BoxGeometry(3.5, 0.12, 0.025), emissiveMaterial(i % 2 ? 0x7bdbea : 0xffd397, 1.5), x, -9 - row * 2, z + 2.52);
    }
  }
  private volcano() {
    const stone = panelMaterial(0x62516a, 'stone');
    this.mesh(new THREE.CylinderGeometry(18, 16, 3, 96), stone, 0, -1.52);
    this.disc(0, 13, 0, stone);
    const lava = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 } }, vertexShader: `varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`, fragmentShader: `varying vec3 p; uniform float time; void main(){float n=sin(p.x*2.+sin(p.y*1.4+time*.7))*sin(p.y*2.5+cos(p.x+time*.4)); float crack=pow(1.-abs(n),7.); vec3 color=mix(vec3(.22,.025,.008),vec3(3.,.65,.035),crack);gl_FragColor=vec4(color,1.);}` });
    const surface = this.disc(13, 24, 0.015, lava); surface.name = 'lava';
    this.ring(13, 0.06, 0.04, 0xffa74d);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      const rock = this.mesh(new THREE.DodecahedronGeometry(1.3 + i % 3 * 0.3), stone, Math.sin(a) * 20.4, -0.8, Math.cos(a) * 20.4);
      rock.rotation.set(i, i * 0.5, i * 0.3);
    }
  }
  private tournament() {
    const stone = panelMaterial(0x6b638e, 'stone');
    const metal = new THREE.MeshStandardMaterial({ color: 0x292940, metalness: 0.7, roughness: 0.42, side: THREE.DoubleSide });
    this.mesh(new THREE.CylinderGeometry(30, 26, 3.5, 96), stone, 0, -1.75);
    // Raised rim is an annulus, not a solid disc hiding the entire stage.
    this.disc(30, 33, 0.3, metal);
    this.mesh(new THREE.CylinderGeometry(33, 32.6, 0.8, 96, 1, true), metal, 0, -0.1);
    this.mesh(new THREE.CylinderGeometry(30, 30, 0.3, 96, 1, true), metal, 0, 0.15);
    this.panels(4.2, 29.7, 24, 0.025, 0x3b3d5b);
    for (const r of [10, 20, 29.8]) this.ring(r, 0.045, 0.035, r === 10 ? 0xffcf8c : 0xa28aff);
    this.ring(32.8, 0.07, 0.34, 0x9c8bff);
    // Match the server's 2.4m pedestal exactly.
    this.mesh(new THREE.CylinderGeometry(4, 4, 2.4, 64), metal, 0, 1.2);
    this.disc(0, 4, 2.4, stone);
    this.ring(3.95, 0.06, 2.43, 0x88dfff);
    const beacon = this.mesh(new THREE.OctahedronGeometry(0.75), emissiveMaterial(0x90d8ff), 0, 5.2);
    this.animated.push({ object: beacon, speed: 0.6 });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const rock = this.mesh(new THREE.DodecahedronGeometry(2 + i % 3), stone, Math.sin(a) * 43, -3 - i % 4, Math.cos(a) * 43);
      this.animated.push({ object: rock, speed: 0.03 });
    }
  }
  private backdrop(type: MapType) {
    if (type === 'urban_rooftop') return;
    const positions: number[] = [];
    for (let i = 0; i < 240; i++) {
      const a = i * 2.39996, r = 50 + i % 29;
      positions.push(Math.sin(a) * r, -5 - (i * 7 % 24), Math.cos(a) * r);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.group.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: type === 'danger_island' ? 0xffb061 : 0xb9d5ff, size: 0.15, transparent: true, opacity: 0.65, depthWrite: false })));
    if (type !== 'danger_island') {
      const halo = this.ring(type === 'power_tournament' ? 48 : 32, 0.035, -6, 0x497799);
      halo.rotation.z = 0.1;
    }
  }
  update(dt: number) {
    this.time += dt;
    for (const item of this.animated) item.object.rotation.y += item.speed * dt;
    const lava = this.group.getObjectByName('lava') as THREE.Mesh | undefined;
    if (lava) (lava.material as THREE.ShaderMaterial).uniforms.time.value = this.time;
  }
  clear() { disposeObject(this.group); this.group.clear(); this.animated = []; this.currentMapType = null; }
}
