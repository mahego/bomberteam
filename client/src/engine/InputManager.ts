import { normalizeMovement } from '@shared/gameplay';
import type { GameInput } from '@shared/types';
export interface InputState extends GameInput { kick: boolean; }

export class InputManager {
  private keys: Record<string, boolean> = {};
  public mousePos = { x: 0, y: 0 };
  public lookAngle = 0;
  public aimWithMouse = false;
  private seq = 0;
  private pressedKeys = new Set<string>();
  private onBlurBound = () => { this.reset(); this.onAction?.(); };
  private onVisibilityChangeBound = () => {
    if (document.hidden) this.reset();
  };

  // Touch controls overrides
  public touchMove = { x: 0, z: 0 };
  public touchJump = false;
  public touchPunch = false;
  public touchKick = false;
  public touchThrow = false;
  public touchDrop = false;
  public touchGrab = false;
  public touchSprint = false;

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;

  constructor() {
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onContextMenuBound = (e) => e.preventDefault(); // Prevent right-click context menu

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('contextmenu', this.onContextMenuBound);
    window.addEventListener('blur', this.onBlurBound);
    document.addEventListener('visibilitychange', this.onVisibilityChangeBound);
  }

  public onAction?: () => void;

  private onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!e.repeat && !this.keys[e.code]) this.pressedKeys.add(e.code);
    this.keys[e.code] = true;
    this.keys[e.key.toLowerCase()] = true;
    if (!e.repeat && ['KeyJ', 'KeyR', 'KeyE', 'KeyQ', 'KeyF', 'Space'].includes(e.code)) {
      this.onAction?.();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
    this.keys[e.key.toLowerCase()] = false;
  }

  private onMouseDown(e: MouseEvent) {
    if (e.target instanceof Element && e.target.closest('button, input, textarea, select, a, [role="button"]')) return;
    if (e.button === 0) {
      // Left click = Punch
      this.touchPunch = true;
      this.onAction?.();
    } else if (e.button === 2) {
      // Right click = Throw Bomb
      this.touchThrow = true;
      this.onAction?.();
    }
  }

  updateLookAngle(playerScreenPos: { x: number; y: number }, mouseClientPos: { x: number; y: number }) {
    const dx = mouseClientPos.x - playerScreenPos.x;
    const dy = mouseClientPos.y - playerScreenPos.y;
    // In top-down isometric view, screen X is world X, screen Y is world Z
    this.lookAngle = Math.atan2(dx, dy);
  }

  getCurrentInput(): InputState {
    this.seq++;

    let moveX = 0;
    let moveZ = 0;

    // Keyboard inputs
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    const touch = normalizeMovement(this.touchMove.x, this.touchMove.z);
    const usingTouch = touch.x !== 0 || touch.z !== 0;
    if (usingTouch) { moveX = touch.x; moveZ = touch.z; }
    else {
      const keyboard = normalizeMovement(moveX, moveZ);
      moveX = keyboard.x; moveZ = keyboard.z;
    }
    if ((usingTouch || !this.aimWithMouse) && Math.hypot(moveX, moveZ) > 0) {
      this.lookAngle = Math.atan2(moveX, moveZ);
    }

    const jump = !!(this.pressedKeys.has('Space') || this.touchJump);
    const punch = !!(this.touchPunch || this.pressedKeys.has('KeyJ'));
    const kick = !!(this.touchKick || this.pressedKeys.has('KeyR'));
    const throwBomb = !!(this.touchThrow || this.pressedKeys.has('KeyE'));
    const dropBomb = !!(this.touchDrop || this.pressedKeys.has('KeyQ'));
    const grab = !!(this.pressedKeys.has('KeyF') || this.touchGrab);
    const sprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchSprint);

    // Reset single-frame triggers
    this.touchJump = false;
    this.touchPunch = false;
    this.touchKick = false;
    this.touchThrow = false;
    this.touchDrop = false;
    this.touchGrab = false;
    this.pressedKeys.clear();

    return {
      moveX,
      moveZ,
      jump,
      punch,
      kick,
      throwBomb,
      dropBomb,
      grab,
      sprint,
      lookAngle: this.lookAngle,
      seq: this.seq,
    };
  }

  triggerAction(action: 'punch' | 'kick' | 'throw' | 'drop' | 'grab' | 'jump') {
    const fields = { punch: 'touchPunch', kick: 'touchKick', throw: 'touchThrow', drop: 'touchDrop', grab: 'touchGrab', jump: 'touchJump' } as const;
    this[fields[action]] = true;
    this.onAction?.();
  }

  reset() {
    this.keys = {};
    this.touchKick = false;
    this.pressedKeys.clear();
    this.touchMove = { x: 0, z: 0 };
    this.touchJump = this.touchPunch = this.touchThrow = false;
    this.touchDrop = this.touchGrab = this.touchSprint = false;
  }

  destroy() {
    this.reset();
    window.removeEventListener('blur', this.onBlurBound);
    document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('contextmenu', this.onContextMenuBound);
  }
}
