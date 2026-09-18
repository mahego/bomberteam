import * as THREE from 'three';

const textureCache = new Map<string, { map: THREE.CanvasTexture; bump: THREE.CanvasTexture }>();

function getOrCreatePanelTextures(type: 'metal' | 'stone' | 'concrete') {
  const cached = textureCache.get(type);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = type === 'metal' ? '#9da8b7' : '#959da4';
  ctx.fillRect(0, 0, 256, 256);

  let seed = 12345;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '0,0,0'},${type === 'metal' ? 0.04 : 0.08})`;
    ctx.fillRect(random() * 256, random() * 256, type === 'metal' ? 10 : 3, 1);
  }

  ctx.strokeStyle = '#53606e';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 254, 254);
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(5, 5, 246, 246);

  if (type === 'metal') {
    for (const x of [12, 244]) {
      for (const y of [12, 244]) {
        ctx.fillStyle = '#485363';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;

  const bump = texture.clone();
  bump.colorSpace = THREE.NoColorSpace;
  bump.needsUpdate = true;

  const result = { map: texture, bump };
  textureCache.set(type, result);
  return result;
}

/** Small repeating maps made locally with singleton caching; 0 repeated canvas redraws. */
export function panelMaterial(color: number, type: 'metal' | 'stone' | 'concrete' = 'metal') {
  const { map, bump } = getOrCreatePanelTextures(type);
  return new THREE.MeshStandardMaterial({
    color,
    map,
    bumpMap: bump,
    bumpScale: 0.035,
    roughness: type === 'metal' ? 0.52 : 0.86,
    metalness: type === 'metal' ? 0.55 : 0.05,
  });
}
export function emissiveMaterial(color: number, strength = 2.5) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), toneMapped: false });
}
export function disposeObject(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m);
  });
  for (const m of materials) {
    for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
    m.dispose();
  }
  textures.forEach(texture => texture.dispose()); geometries.forEach(geometry => geometry.dispose());
}
