import * as THREE from '/node_modules/three/build/three.module.js';

const BUILD_OPTIONS = [
  {
    id: 'oven',
    name: 'Oven',
    size: new THREE.Vector3(1.5, 1, 1.5),
    color: 0x6f8f57,
    interactType: 'oven',
  },
  {
    id: 'long-box',
    name: 'Long Box',
    size: new THREE.Vector3(3.5, 1, 1),
    color: 0x4f7cac,
  },
];

const validColor = new THREE.Color(0x2fd66b);
const invalidColor = new THREE.Color(0xef4444);
const lookDirection = new THREE.Vector3();
const groundPoint = new THREE.Vector3();
const offsetFromPlayer = new THREE.Vector3();
const candidateBox = new THREE.Box3();
const playerBox = new THREE.Box3();
const timerTextBySecond = new WeakMap();

export class BuildingController {
  constructor({ scene, camera, player, canvas, colliders }) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.canvas = canvas;
    this.colliders = colliders;
    this.selectedOption = null;
    this.ghost = null;
    this.mode = 'idle';
    this.destroyableObjects = [];
    this.highlightedDestroyable = null;
    this.isMenuOpen = false;
    this.canPlace = false;

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.placedMaterial = new THREE.MeshStandardMaterial({ color: 0x8b6f4e, roughness: 0.8 });
    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: validColor,
      opacity: 0.45,
      transparent: true,
      depthWrite: false,
    });

    this.menuElement = this.createMenu();
    document.body.appendChild(this.menuElement);
  }

  update(inputController) {
    this.updateTimers();

    if (inputController.consumeKeyDown('KeyB')) {
      this.advanceBuildMode();
    }

    if (inputController.consumeKeyDown('Escape')) {
      this.closeMenu();
      this.clearGhost();
      this.setDestroyMode(false);
    }

    if (this.mode === 'destroy') {
      this.updateDestroyTarget();
      if (inputController.consumePrimaryClick() > 0 && this.highlightedDestroyable) {
        this.destroyObject(this.highlightedDestroyable);
      }
    } else if (this.ghost) {
      this.updateGhostPlacement();
      if (inputController.consumePrimaryClick() > 0 && this.canPlace) {
        this.placeSelectedObject();
      }
    } else {
      inputController.consumePrimaryClick();
    }
  }

  createMenu() {
    const menu = document.createElement('div');
    menu.className = 'build-menu';
    menu.hidden = true;

    const title = document.createElement('div');
    title.className = 'build-menu__title';
    title.textContent = 'Build';
    menu.appendChild(title);

    const optionList = document.createElement('div');
    optionList.className = 'build-menu__options';

    for (const option of BUILD_OPTIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'build-menu__option';
      button.dataset.buildOption = option.id;

      const preview = document.createElement('span');
      preview.className = 'build-menu__preview';
      const previewBox = document.createElement('span');
      previewBox.className = 'build-menu__preview-box';
      previewBox.style.setProperty('--preview-width', `${Math.max(42, option.size.x * 28)}px`);
      previewBox.style.setProperty('--preview-depth', `${Math.max(20, option.size.z * 24)}px`);
      previewBox.style.setProperty('--preview-height', `${Math.max(18, option.size.y * 20)}px`);
      previewBox.style.setProperty('--preview-color', `#${option.color.toString(16).padStart(6, '0')}`);
      previewBox.append(
        this.createPreviewFace('top'),
        this.createPreviewFace('front'),
        this.createPreviewFace('side'),
      );
      preview.appendChild(previewBox);

      const label = document.createElement('span');
      label.className = 'build-menu__label';
      label.textContent = option.name;

      button.append(preview, label);
      button.addEventListener('click', () => {
        this.selectOption(option.id);
        this.closeMenu();
        this.canvas.requestPointerLock();
      });
      optionList.appendChild(button);
    }

    menu.appendChild(optionList);
    return menu;
  }

  createPreviewFace(faceName) {
    const face = document.createElement('span');
    face.className = `build-menu__preview-face build-menu__preview-face--${faceName}`;
    return face;
  }

  advanceBuildMode() {
    if (this.isMenuOpen) {
      this.closeMenu();
      this.setDestroyMode(true);
      return;
    }

    if (this.ghost) {
      this.clearGhost();
      this.setDestroyMode(true);
      return;
    }

    if (this.mode === 'destroy') {
      this.setDestroyMode(false);
      this.openMenu();
      return;
    }

    this.openMenu();
  }

  openMenu() {
    this.setDestroyMode(false);
    this.isMenuOpen = true;
    this.mode = 'menu';
    this.menuElement.hidden = false;
    document.exitPointerLock();
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.menuElement.hidden = true;
    if (this.mode === 'menu') {
      this.mode = 'idle';
    }
  }

  selectOption(optionId) {
    this.selectedOption = BUILD_OPTIONS.find((option) => option.id === optionId);
    this.createGhost();
  }

  createGhost() {
    this.clearGhost();

    if (!this.selectedOption) {
      return;
    }

    this.setDestroyMode(false);
    this.mode = 'place';

    const geometry = new THREE.BoxGeometry(
      this.selectedOption.size.x,
      this.selectedOption.size.y,
      this.selectedOption.size.z,
    );
    this.ghost = new THREE.Mesh(geometry, this.ghostMaterial.clone());
    this.ghost.name = `${this.selectedOption.name} placement ghost`;
    this.ghost.renderOrder = 10;
    this.scene.add(this.ghost);
  }

  clearGhost() {
    if (!this.ghost) {
      return;
    }

    this.scene.remove(this.ghost);
    this.ghost.geometry.dispose();
    this.ghost.material.dispose();
    this.ghost = null;
    this.canPlace = false;
    if (this.mode === 'place') {
      this.mode = 'idle';
    }
  }

  updateGhostPlacement() {
    this.camera.getWorldDirection(lookDirection);
    this.raycaster.set(this.camera.position, lookDirection);

    const hitsGround = this.raycaster.ray.intersectPlane(this.groundPlane, groundPoint);
    if (!hitsGround) {
      groundPoint.copy(this.camera.position).addScaledVector(lookDirection, 4);
      groundPoint.y = 0;
    }

    const maxBuildDistance = 7;
    offsetFromPlayer.copy(groundPoint).sub(this.player.position);
    offsetFromPlayer.y = 0;
    if (offsetFromPlayer.length() > maxBuildDistance) {
      offsetFromPlayer.setLength(maxBuildDistance);
      groundPoint.copy(this.player.position).add(offsetFromPlayer);
    }

    this.ghost.position.set(
      groundPoint.x,
      this.selectedOption.size.y / 2,
      groundPoint.z,
    );
    this.ghost.rotation.y = this.player.rotation.y;

    candidateBox.setFromObject(this.ghost);
    this.canPlace = !this.intersectsExistingCollider(candidateBox) && !this.intersectsPlayer(candidateBox);
    this.ghost.material.color.copy(this.canPlace ? validColor : invalidColor);
  }

  intersectsExistingCollider(box) {
    const collisionBox = box.clone().expandByScalar(-0.02);
    return this.colliders.some((collider) => collider.intersectsBox(collisionBox));
  }

  intersectsPlayer(box) {
    playerBox.setFromCenterAndSize(
      new THREE.Vector3(this.player.position.x, 0.85, this.player.position.z),
      new THREE.Vector3(0.9, 1.7, 0.9),
    );
    return box.intersectsBox(playerBox);
  }

  placeSelectedObject() {
    const material = this.placedMaterial.clone();
    material.color.setHex(this.selectedOption.color);

    const mesh = new THREE.Mesh(this.ghost.geometry.clone(), material);
    mesh.name = this.selectedOption.name;
    mesh.position.copy(this.ghost.position);
    mesh.rotation.copy(this.ghost.rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    mesh.updateWorldMatrix(true, false);
    const collider = new THREE.Box3().setFromObject(mesh);
    this.colliders.push(collider);
    const entry = {
      mesh,
      collider,
      optionId: this.selectedOption.id,
      interactType: this.selectedOption.interactType || null,
      baseColor: material.color.clone(),
      baseEmissive: material.emissive.clone(),
      baseEmissiveIntensity: material.emissiveIntensity,
      timerEndTime: null,
      timerDisplay: null,
    };

    if (entry.interactType === 'oven') {
      this.attachOvenTimerDisplay(entry, this.selectedOption.size);
    }

    this.destroyableObjects.push(entry);
    this.updateGhostPlacement();
  }

  attachOvenTimerDisplay(entry, size) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
    });

    const display = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 0.72, size.y * 0.34), material);
    display.name = 'Oven timer display';
    display.position.set(0, size.y * 0.15, size.z / 2 + 0.012);
    display.renderOrder = 4;
    entry.mesh.add(display);

    entry.timerDisplay = {
      canvas,
      context: canvas.getContext('2d'),
      texture,
      mesh: display,
    };
    this.drawOvenTimer(entry, '0:00');
  }

  startOvenTimer(entry, minutes) {
    entry.timerEndTime = performance.now() + minutes * 60 * 1000;
    timerTextBySecond.delete(entry);
    this.updateOvenTimer(entry);
  }

  updateTimers() {
    for (const entry of this.destroyableObjects) {
      if (entry.interactType === 'oven') {
        this.updateOvenTimer(entry);
      }
    }
  }

  updateOvenTimer(entry) {
    if (!entry.timerDisplay) {
      return;
    }

    const remainingSeconds = entry.timerEndTime
      ? Math.max(0, Math.ceil((entry.timerEndTime - performance.now()) / 1000))
      : 0;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const text = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (timerTextBySecond.get(entry) !== text) {
      timerTextBySecond.set(entry, text);
      this.drawOvenTimer(entry, text);
    }

    if (remainingSeconds === 0) {
      entry.timerEndTime = null;
    }
  }

  drawOvenTimer(entry, text) {
    const { canvas, context, texture } = entry.timerDisplay;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#111827';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#e5e7eb';
    context.lineWidth = 8;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    context.fillStyle = '#f9fafb';
    context.font = '700 58px Arial, Helvetica, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
    texture.needsUpdate = true;
  }

  setDestroyMode(isEnabled) {
    if (isEnabled) {
      this.clearGhost();
      this.closeMenu();
      this.mode = 'destroy';
      this.canvas.requestPointerLock();
      return;
    }

    if (this.mode === 'destroy') {
      this.clearDestroyHighlight();
      this.mode = 'idle';
    }
  }

  updateDestroyTarget() {
    this.camera.getWorldDirection(lookDirection);
    this.raycaster.set(this.camera.position, lookDirection);
    this.raycaster.far = 5.5;

    const meshes = this.destroyableObjects.map((entry) => entry.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    const nextTarget = hits.length > 0
      ? this.destroyableObjects.find((entry) => entry.mesh === hits[0].object)
      : null;

    this.setDestroyHighlight(nextTarget || null);
  }

  setDestroyHighlight(entry) {
    if (this.highlightedDestroyable === entry) {
      return;
    }

    this.clearDestroyHighlight();
    this.highlightedDestroyable = entry;

    if (!entry) {
      return;
    }

    entry.mesh.material.color.copy(invalidColor);
    entry.mesh.material.emissive.copy(invalidColor);
    entry.mesh.material.emissiveIntensity = 0.35;
  }

  clearDestroyHighlight() {
    if (!this.highlightedDestroyable) {
      return;
    }

    const { mesh, baseColor, baseEmissive, baseEmissiveIntensity } = this.highlightedDestroyable;
    mesh.material.color.copy(baseColor);
    mesh.material.emissive.copy(baseEmissive);
    mesh.material.emissiveIntensity = baseEmissiveIntensity;
    this.highlightedDestroyable = null;
  }

  destroyObject(entry) {
    this.clearDestroyHighlight();

    const colliderIndex = this.colliders.indexOf(entry.collider);
    if (colliderIndex !== -1) {
      this.colliders.splice(colliderIndex, 1);
    }

    const destroyableIndex = this.destroyableObjects.indexOf(entry);
    if (destroyableIndex !== -1) {
      this.destroyableObjects.splice(destroyableIndex, 1);
    }

    this.scene.remove(entry.mesh);
    if (entry.timerDisplay) {
      entry.timerDisplay.texture.dispose();
      entry.timerDisplay.mesh.geometry.dispose();
      entry.timerDisplay.mesh.material.dispose();
    }
    entry.mesh.geometry.dispose();
    entry.mesh.material.dispose();
  }

  isUsingMenu() {
    return this.isMenuOpen;
  }

  isBusy() {
    return this.isMenuOpen || this.ghost || this.mode === 'destroy';
  }

  getInteractableObjects() {
    return this.destroyableObjects.filter((entry) => entry.interactType);
  }
}
