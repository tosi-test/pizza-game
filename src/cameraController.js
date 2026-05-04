import * as THREE from '/node_modules/three/build/three.module.js';

const targetPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const orbitOffset = new THREE.Vector3();

export class CameraController {
  constructor(camera, target, {
    distance = 9,
    height = 3.4,
    lookHeight = 1.25,
    pitch = -0.28,
    minPitch = -0.85,
    maxPitch = 0.35,
    mouseSensitivity = 0.0025,
    followSmoothing = 12,
    floorY = 0,
    floorClearance = 0.35,
  } = {}) {
    this.camera = camera;
    this.target = target;
    this.distance = distance;
    this.height = height;
    this.lookHeight = lookHeight;
    this.pitch = pitch;
    this.minPitch = minPitch;
    this.maxPitch = maxPitch;
    this.yaw = target.rotation.y;
    this.mouseSensitivity = mouseSensitivity;
    this.followSmoothing = followSmoothing;
    this.floorY = floorY;
    this.floorClearance = floorClearance;
  }

  applyPointerDelta(pointerDelta) {
    this.yaw -= pointerDelta.x * this.mouseSensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - pointerDelta.y * this.mouseSensitivity,
      this.minPitch,
      this.maxPitch,
    );
  }

  update(deltaTime) {
    orbitOffset.set(
      Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance,
      this.height + Math.sin(this.pitch) * this.distance,
      Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance,
    );

    targetPosition.copy(this.target.position).add(orbitOffset);
    targetPosition.y = Math.max(targetPosition.y, this.floorY + this.floorClearance);

    const followAlpha = 1 - Math.exp(-this.followSmoothing * deltaTime);
    this.camera.position.lerp(targetPosition, followAlpha);
    this.camera.position.y = Math.max(this.camera.position.y, this.floorY + this.floorClearance);

    lookTarget.copy(this.target.position);
    lookTarget.y += this.lookHeight;
    this.camera.lookAt(lookTarget);
  }

  getYaw() {
    return this.yaw;
  }
}
