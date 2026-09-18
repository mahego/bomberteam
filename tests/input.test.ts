import test from 'node:test';
import assert from 'node:assert/strict';
import { InputManager } from '../client/src/engine/InputManager.js';

Object.assign(globalThis, { window: new EventTarget(), document: new EventTarget(), Element: class {} });
function key(type: string, code: string, repeat = false) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { code, key: code, repeat });
  window.dispatchEvent(event);
}
test('keyboard and touch each dispatch one action, including jump', () => {
  const input = new InputManager();
  const frames: ReturnType<InputManager['getCurrentInput']>[] = [];
  input.onAction = () => frames.push(input.getCurrentInput());
  key('keydown', 'Space'); key('keydown', 'Space', true);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].jump, true);
  assert.equal(input.getCurrentInput().jump, false);
  key('keyup', 'Space'); key('keydown', 'Space');
  assert.equal(frames.length, 2);
  input.triggerAction('kick');
  assert.equal(frames.length, 3);
  assert.equal(frames[2].kick, true);
  assert.equal(input.getCurrentInput().kick, false);
  input.destroy();
});
test('analog deadzone, keyboard facing, diagonal normalization and focus reset', () => {
  const input = new InputManager();
  input.touchMove = { x: 0.08, z: 0 };
  assert.equal(input.getCurrentInput().moveX, 0);
  input.touchMove = { x: 0.5, z: 0 };
  const half = input.getCurrentInput();
  assert.ok(half.moveX > 0 && half.moveX < 0.5);
  assert.equal(half.lookAngle, Math.PI / 2);
  input.touchMove = { x: 0, z: 0 };
  key('keydown', 'KeyW'); key('keydown', 'KeyD');
  const diagonal = input.getCurrentInput();
  assert.ok(Math.abs(Math.hypot(diagonal.moveX, diagonal.moveZ) - 1) < 1e-10);
  assert.equal(diagonal.lookAngle, Math.PI * 0.75);
  window.dispatchEvent(new Event('blur'));
  const reset = input.getCurrentInput();
  assert.equal(reset.moveX, 0); assert.equal(reset.moveZ, 0);
  input.destroy();
});
