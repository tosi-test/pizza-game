import * as THREE from '/node_modules/three/build/three.module.js';

const playerPosition = new THREE.Vector3();
const objectPosition = new THREE.Vector3();

export class InteractController {
  constructor({ player, canvas, buildingController }) {
    this.player = player;
    this.canvas = canvas;
    this.buildingController = buildingController;
    this.activeTarget = null;
    this.isPanelOpen = false;

    this.promptElement = this.createPrompt();
    this.panelElement = this.createPanel();
    document.body.append(this.promptElement, this.panelElement);
  }

  update(inputController) {
    if (this.isPanelOpen) {
      inputController.consumeKeyDown('KeyE');
      if (inputController.consumeKeyDown('Escape')) {
        this.closePanel();
      }
      return;
    }

    if (this.buildingController.isBusy()) {
      this.setPromptVisible(false);
      return;
    }

    this.activeTarget = this.findNearestInteractable();
    this.setPromptVisible(Boolean(this.activeTarget));

    if (this.activeTarget && inputController.consumeKeyDown('KeyE')) {
      this.openPanel();
    }
  }

  createPrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'interaction-prompt';
    prompt.textContent = 'Press E to interact';
    prompt.hidden = true;
    return prompt;
  }

  createPanel() {
    const panel = document.createElement('form');
    panel.className = 'timer-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <label class="timer-panel__label" for="oven-time-input">Oven timer</label>
      <div class="timer-panel__row">
        <input id="oven-time-input" class="timer-panel__input" name="minutes" type="number" min="1" max="99" step="1" value="2" />
        <span class="timer-panel__unit">min</span>
      </div>
      <div class="timer-panel__actions">
        <button class="timer-panel__button" type="submit">Start</button>
        <button class="timer-panel__button timer-panel__button--secondary" type="button" data-cancel>Cancel</button>
      </div>
    `;

    panel.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(panel);
      const minutes = Number.parseInt(formData.get('minutes'), 10);
      if (Number.isFinite(minutes) && minutes > 0 && this.activeTarget) {
        this.buildingController.startOvenTimer(this.activeTarget, minutes);
      }
      this.closePanel();
    });

    panel.querySelector('[data-cancel]').addEventListener('click', () => this.closePanel());
    return panel;
  }

  findNearestInteractable() {
    const maxDistance = 2.4;
    let nearest = null;
    let nearestDistanceSq = maxDistance * maxDistance;

    playerPosition.copy(this.player.position);
    for (const entry of this.buildingController.getInteractableObjects()) {
      entry.mesh.getWorldPosition(objectPosition);
      objectPosition.y = playerPosition.y;
      const distanceSq = playerPosition.distanceToSquared(objectPosition);
      if (distanceSq <= nearestDistanceSq) {
        nearest = entry;
        nearestDistanceSq = distanceSq;
      }
    }

    return nearest;
  }

  openPanel() {
    this.isPanelOpen = true;
    this.setPromptVisible(false);
    this.panelElement.hidden = false;
    document.exitPointerLock();

    const input = this.panelElement.querySelector('input');
    input.focus();
    input.select();
  }

  closePanel() {
    this.isPanelOpen = false;
    this.panelElement.hidden = true;
    this.canvas.requestPointerLock();
  }

  setPromptVisible(isVisible) {
    this.promptElement.hidden = !isVisible;
  }

  isUsingPanel() {
    return this.isPanelOpen;
  }
}
