import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MapRenderer } from '../client/src/engine/MapRenderer.js';
import { MAPS } from '../server/src/Maps.js';
import type { MapType } from '../shared/types.js';

// Geometry verification does not need a GPU; the procedural texture only needs a canvas-shaped object.
Object.assign(globalThis, { document: { createElement: () => ({ width: 256, height: 256, getContext: () => ({ fillRect() {}, strokeRect() {}, beginPath() {}, arc() {}, fill() {} }) }) } });
function floor(renderer: MapRenderer, x: number, z: number) {
  renderer.group.updateMatrixWorld(true);
  const surfaces: THREE.Object3D[] = [];
  renderer.group.traverse(object => { if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) surfaces.push(object); });
  const hits = new THREE.Raycaster(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0)).intersectObjects(surfaces, false);
  return hits.find(hit => hit.point.y >= -0.1)?.point.y ?? null;
}
test('floating arena has an actual central opening and solid satellite platforms', () => {
  const renderer = new MapRenderer(); renderer.buildMap('floating_arena');
  assert.equal(floor(renderer, 0, 0), null);
  for (const [x, z] of [[8.2, 2.2], [18, 0], [-18, 0], [0, 18], [0, -18]]) assert.ok(Math.abs(floor(renderer, x, z)!) < 0.05);
  renderer.clear(); assert.equal(renderer.group.children.length, 0);
});
test('tournament pedestal and outer rim match gameplay heights', () => {
  const renderer = new MapRenderer(); renderer.buildMap('power_tournament');
  for (const [x, z] of [[1.2, 1.3], [8.5, 2.2], [31.3, 0.7]]) {
    assert.ok(Math.abs(floor(renderer, x, z)! - MAPS.power_tournament.getFloorHeight(x, z)!) < 0.05);
  }
  renderer.clear();
});
test('all four maps can be rebuilt and animated without retaining old scenes', () => {
  const renderer = new MapRenderer();
  for (const map of ['urban_rooftop', 'danger_island', 'power_tournament', 'floating_arena'] as MapType[]) {
    renderer.buildMap(map); const count = renderer.group.children.length;
    assert.ok(count > 10); renderer.update(1 / 60); renderer.buildMap(map);
    assert.equal(renderer.group.children.length, count);
  }
  renderer.clear();
});
