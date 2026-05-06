import * as THREE from '/node_modules/three/build/three.module.js';

const forwardDirection = new THREE.Vector3();
const rightDirection = new THREE.Vector3();
const movementDirection = new THREE.Vector3();
const candidatePosition = new THREE.Vector3();
const colliderMin = new THREE.Vector3();
const colliderMax = new THREE.Vector3();

export class PlayerController {
  constructor(player, { movementSpeed = 5, rotationSmoothing = 18, colliders = [], playerRadius = 0.45, playerHeight = 1.7 } = {}) {
    this.player = player;
    this.movementSpeed = movementSpeed;
    this.rotationSmoothing = rotationSmoothing;
    this.colliders = colliders;
    this.playerRadius = playerRadius;
    this.playerHeight = playerHeight;
  }

  update(deltaTime, movementInput, cameraYaw) {
    forwardDirection.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    rightDirection.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

    movementDirection
      .set(0, 0, 0)
      .addScaledVector(forwardDirection, movementInput.forward)
      .addScaledVector(rightDirection, movementInput.strafe);

    if (movementDirection.lengthSq() > 0) {
      movementDirection.normalize();
      const moveDistance = this.movementSpeed * deltaTime;

      candidatePosition.copy(this.player.position);
      candidatePosition.x += movementDirection.x * moveDistance;
      if (!this.collidesAt(candidatePosition)) {
        this.player.position.x = candidatePosition.x;
      }

      candidatePosition.copy(this.player.position);
      candidatePosition.z += movementDirection.z * moveDistance;
      if (!this.collidesAt(candidatePosition)) {
        this.player.position.z = candidatePosition.z;
      }
    }

    this.alignToYaw(cameraYaw, deltaTime);
  }

  collidesAt(position) {
    for (const collider of this.colliders) {
      colliderMin.copy(collider.min);
      colliderMax.copy(collider.max);
      colliderMin.x -= this.playerRadius;
      colliderMin.z -= this.playerRadius;
      colliderMax.x += this.playerRadius;
      colliderMax.z += this.playerRadius;

      const insideX = position.x >= colliderMin.x && position.x <= colliderMax.x;
      const insideZ = position.z >= colliderMin.z && position.z <= colliderMax.z;
      const playerBottom = this.player.position.y;
      const playerTop = playerBottom + this.playerHeight;
      const overlapsY = playerTop >= collider.min.y && playerBottom <= collider.max.y;

      if (insideX && insideZ && overlapsY) {
        return true;
      }
    }

    return false;
  }

  alignToYaw(cameraYaw, deltaTime) {
    const targetYaw = cameraYaw;
    const yawDifference = Math.atan2(
      Math.sin(targetYaw - this.player.rotation.y),
      Math.cos(targetYaw - this.player.rotation.y),
    );
    const rotationAlpha = 1 - Math.exp(-this.rotationSmoothing * deltaTime);

    this.player.rotation.y += yawDifference * rotationAlpha;
  }
}
