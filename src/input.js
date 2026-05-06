const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
const ACTION_KEYS = new Set(['KeyB', 'KeyE', 'Escape']);

export class InputController {
  constructor(targetElement) {
    this.targetElement = targetElement;
    this.keysPressed = new Set();
    this.keysDownThisFrame = new Set();
    this.pointerDelta = { x: 0, y: 0 };
    this.primaryClicks = 0;
    this.isPointerLocked = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.handleCanvasClick = this.handleCanvasClick.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.targetElement.addEventListener('click', this.handleCanvasClick);
  }

  handleKeyDown(event) {
    if (MOVEMENT_KEYS.has(event.code) || ACTION_KEYS.has(event.code)) {
      event.preventDefault();
    }

    if (!this.keysPressed.has(event.code)) {
      this.keysDownThisFrame.add(event.code);
    }
    this.keysPressed.add(event.code);
  }

  handleKeyUp(event) {
    if (MOVEMENT_KEYS.has(event.code) || ACTION_KEYS.has(event.code)) {
      event.preventDefault();
    }

    this.keysPressed.delete(event.code);
  }

  handleMouseMove(event) {
    if (!this.isPointerLocked) {
      return;
    }

    this.pointerDelta.x += event.movementX;
    this.pointerDelta.y += event.movementY;
  }

  handlePointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.targetElement;
  }

  handleCanvasClick() {
    if (!this.isPointerLocked) {
      this.targetElement.requestPointerLock();
      return;
    }

    this.primaryClicks += 1;
  }

  getMovementVector() {
    const strafe = Number(this.keysPressed.has('KeyD')) - Number(this.keysPressed.has('KeyA'));
    const forward = Number(this.keysPressed.has('KeyW')) - Number(this.keysPressed.has('KeyS'));

    return { strafe, forward };
  }

  consumePointerDelta() {
    const delta = { ...this.pointerDelta };
    this.pointerDelta.x = 0;
    this.pointerDelta.y = 0;
    return delta;
  }

  consumeKeyDown(code) {
    const wasPressed = this.keysDownThisFrame.has(code);
    this.keysDownThisFrame.delete(code);
    return wasPressed;
  }

  consumePrimaryClick() {
    const clicks = this.primaryClicks;
    this.primaryClicks = 0;
    return clicks;
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.targetElement.removeEventListener('click', this.handleCanvasClick);
  }
}
