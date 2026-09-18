import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { MapType } from '@shared/types';

export class RenderPipeline {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private output = new OutputPass();
  private key = new THREE.DirectionalLight(0xffe5c4, 2.8);
  private rim = new THREE.DirectionalLight(0x78aaff, 2.0);
  private sky = new THREE.HemisphereLight(0xbdd8ff, 0x1e293b, 1.35);
  private flash = new THREE.PointLight(0xffb04e, 0, 14, 2);
  private theme: MapType | null = null;
  public cinematic = window.innerWidth > 900;

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, camera: THREE.Camera) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.cinematic ? 1.5 : 1.25));

    // Fast ambient gradient environment (0 PMREM compilation lag)
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 64;
    envCanvas.height = 32;
    const envCtx = envCanvas.getContext('2d');
    if (envCtx) {
      const grad = envCtx.createLinearGradient(0, 0, 0, 32);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      envCtx.fillStyle = grad;
      envCtx.fillRect(0, 0, 64, 32);
      const envTex = new THREE.CanvasTexture(envCanvas);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = envTex;
    }

    // Key shadow light with 1024x1024 map and tight bounds for high performance
    this.key.position.set(-18, 28, 16);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = this.key.shadow.camera.bottom = -30;
    this.key.shadow.camera.right = this.key.shadow.camera.top = 30;
    this.key.shadow.camera.near = 4;
    this.key.shadow.camera.far = 75;
    this.key.shadow.bias = -0.0003;
    this.key.shadow.normalBias = 0.04;

    this.rim.position.set(15, 18, -22);
    scene.add(this.key, this.rim, this.sky, this.flash);

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.5, 1.1);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    this.setTheme('floating_arena');
  }

  setTheme(map: MapType) {
    if (this.theme === map) return;
    this.theme = map;
    const colors =
      map === 'danger_island'
        ? [0x251720, 0xffb36d, 0xa05fff]
        : map === 'urban_rooftop'
        ? [0x192f43, 0xffd0a0, 0x52b9ce]
        : map === 'power_tournament'
        ? [0x110f2c, 0xe9d4ff, 0x806dff]
        : [0x101f36, 0xffe2c0, 0x6eacff];
    this.scene.background = new THREE.Color(colors[0]);
    this.scene.fog = new THREE.FogExp2(colors[0], 0.0065);
    this.key.color.setHex(colors[1]);
    this.rim.color.setHex(colors[2]);
  }

  resize(width: number, height: number) {
    this.composer.setSize(width, height);
  }

  setQuality(cinematic: boolean) {
    this.cinematic = cinematic;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cinematic ? 1.5 : 1.25));
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    const size = this.renderer.getSize(new THREE.Vector2());
    this.resize(size.x, size.y);
  }

  impact(x: number, y: number, z: number, color = 0xffaf45) {
    this.flash.position.set(x, y + 2, z);
    this.flash.color.setHex(color);
    this.flash.intensity = 80;
  }

  render(dt: number, scene: THREE.Scene, camera: THREE.Camera) {
    this.flash.intensity *= Math.exp(-dt * 12);
    if (this.cinematic) this.composer.render(dt);
    else this.renderer.render(scene, camera);
  }

  destroy() {
    this.bloom.dispose();
    this.output.dispose();
    this.composer.dispose();
    if (this.scene.environment) {
      this.scene.environment.dispose();
      this.scene.environment = null;
    }
    this.key.shadow.map?.dispose();
    this.scene.remove(this.key, this.rim, this.sky, this.flash);
  }
}
