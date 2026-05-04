import * as THREE from '/node_modules/three/build/three.module.js';

const forwardDirection = new THREE.Vector3();
const rightDirection = new THREE.Vector3();
const movementDirection = new THREE.Vector3();

export class PlayerController {
  constructor(player, { movementSpeed = 5, rotationSmoothing = 18 } = {}) {
    this.player = player;
    this.movementSpeed = movementSpeed;
    this.rotationSmoothing = rotationSmoothing;
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
      this.player.position.addScaledVector(movementDirection, this.movementSpeed * deltaTime);
    }

    this.alignToYaw(cameraYaw, deltaTime);
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
