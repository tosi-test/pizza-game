import * as THREE from '/node_modules/three/build/three.module.js';

const eyeTargetPosition = new THREE.Vector3();
const lookDirection = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

export class CameraController {
  constructor(camera, target, {
    eyeHeight = 1.45,
    pitch = 0,
    minPitch = -1.25,
    maxPitch = 1.25,
    mouseSensitivity = 0.0025,
    invertY = true,
    followSmoothing = 20,
  } = {}) {
    this.camera = camera;
    this.target = target;
    this.eyeHeight = eyeHeight;
    this.pitch = pitch;
    this.minPitch = minPitch;
    this.maxPitch = maxPitch;
    this.yaw = target.rotation.y;
    this.mouseSensitivity = mouseSensitivity;
    this.invertY = invertY;
    this.followSmoothing = followSmoothing;
  }

  applyPointerDelta(pointerDelta) {
    this.yaw -= pointerDelta.x * this.mouseSensitivity;
    const pitchDirection = this.invertY ? 1 : -1;

    this.pitch = THREE.MathUtils.clamp(
      this.pitch + pointerDelta.y * this.mouseSensitivity * pitchDirection,
      this.minPitch,
      this.maxPitch,
    );
  }

  update(deltaTime) {
    eyeTargetPosition.copy(this.target.position);
    eyeTargetPosition.y += this.eyeHeight;

    const followAlpha = 1 - Math.exp(-this.followSmoothing * deltaTime);
    this.camera.position.lerp(eyeTargetPosition, followAlpha);

    lookDirection.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );

    lookTarget.copy(this.camera.position).add(lookDirection);
    this.camera.lookAt(lookTarget);
  }

  getYaw() {
    return this.yaw;
  }
}
