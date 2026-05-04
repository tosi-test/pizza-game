import * as THREE from '/node_modules/three/build/three.module.js';

const canvas = document.querySelector('#game-canvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b9ff);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(0, 5, 13);
camera.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const ambientLight = new THREE.HemisphereLight(0xffffff, 0x52606d, 1.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
sunLight.position.set(8, 14, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
scene.add(sunLight);

const groundGeometry = new THREE.PlaneGeometry(80, 80);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4ca64c, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.name = 'Large movement-testing ground plane';
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const player = new THREE.Group();
player.name = 'Player placeholder';
player.position.set(0, 0, 8);

const playerBodyGeometry = new THREE.BoxGeometry(1, 1.6, 1);
const playerBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffc857 });
const playerBody = new THREE.Mesh(playerBodyGeometry, playerBodyMaterial);
playerBody.position.y = 0.8;
playerBody.castShadow = true;
player.add(playerBody);

const forwardMarkerGeometry = new THREE.ConeGeometry(0.28, 0.75, 4);
const forwardMarkerMaterial = new THREE.MeshStandardMaterial({ color: 0xd62828 });
const forwardMarker = new THREE.Mesh(forwardMarkerGeometry, forwardMarkerMaterial);
forwardMarker.name = 'Forward direction marker';
forwardMarker.position.set(0, 1.15, -0.85);
forwardMarker.rotation.x = -Math.PI / 2;
forwardMarker.castShadow = true;
player.add(forwardMarker);

scene.add(player);

const house = new THREE.Group();
house.name = 'House made from separate wall boxes with doorway opening';
house.position.set(0, 0, -12);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xba6b42, roughness: 0.85 });
const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x5c2f1d, roughness: 0.8 });
const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.75 });

function addBox(parent, name, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// House dimensions: 12 wide x 8 deep x 5 tall, centered around world z = -12.
// The front wall faces the player spawn and is split into three boxes to leave a doorway.
addBox(
  house,
  'front wall left of doorway',
  new THREE.Vector3(4.25, 5, 0.35),
  new THREE.Vector3(-3.875, 2.5, 4),
  wallMaterial,
);
addBox(
  house,
  'front wall right of doorway',
  new THREE.Vector3(4.25, 5, 0.35),
  new THREE.Vector3(3.875, 2.5, 4),
  wallMaterial,
);
addBox(
  house,
  'front wall lintel above doorway',
  new THREE.Vector3(3.5, 2, 0.35),
  new THREE.Vector3(0, 4, 4),
  wallMaterial,
);

addBox(house, 'back wall', new THREE.Vector3(12, 5, 0.35), new THREE.Vector3(0, 2.5, -4), wallMaterial);
addBox(house, 'left side wall', new THREE.Vector3(0.35, 5, 8), new THREE.Vector3(-6, 2.5, 0), wallMaterial);
addBox(house, 'right side wall', new THREE.Vector3(0.35, 5, 8), new THREE.Vector3(6, 2.5, 0), wallMaterial);
addBox(house, 'flat roof cap', new THREE.Vector3(12.8, 0.6, 8.8), new THREE.Vector3(0, 5.3, 0), roofMaterial);
addBox(house, 'doorway threshold marker', new THREE.Vector3(3.5, 0.08, 0.8), new THREE.Vector3(0, 0.04, 4.25), trimMaterial);

scene.add(house);

const keysPressed = new Set();
const movementSpeed = 5;
const turnSpeed = 2.8;
const clock = new THREE.Clock();

window.addEventListener('keydown', (event) => {
  keysPressed.add(event.code);
});

window.addEventListener('keyup', (event) => {
  keysPressed.delete(event.code);
});

function updatePlayer(deltaTime) {
  if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) {
    player.rotation.y += turnSpeed * deltaTime;
  }

  if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) {
    player.rotation.y -= turnSpeed * deltaTime;
  }

  const forwardInput =
    Number(keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) -
    Number(keysPressed.has('KeyS') || keysPressed.has('ArrowDown'));

  if (forwardInput !== 0) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    player.position.addScaledVector(forward, forwardInput * movementSpeed * deltaTime);
  }
}

function updateCamera() {
  const cameraOffset = new THREE.Vector3(0, 4.5, 8).applyQuaternion(player.quaternion);
  const targetPosition = player.position.clone().add(cameraOffset);
  camera.position.lerp(targetPosition, 0.16);
  camera.lookAt(player.position.x, player.position.y + 1.1, player.position.z);
}

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const pixelRatio = renderer.getPixelRatio();
  const renderWidth = Math.floor(width * pixelRatio);
  const renderHeight = Math.floor(height * pixelRatio);

  if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function render() {
  const deltaTime = Math.min(clock.getDelta(), 0.05);

  resizeRenderer();
  updatePlayer(deltaTime);
  updateCamera();
  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

render();
