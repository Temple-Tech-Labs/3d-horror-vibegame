import * as THREE from 'three';
import nipplejs from 'nipplejs';

// ─── Scene setup ────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b1a);

// ─── Lights ─────────────────────────────────────────────────────────────────

const hemi = new THREE.HemisphereLight(0x3d2a6e, 0x0a0918, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0x9988cc, 1.2);
sun.position.set(8, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
scene.add(sun);

// ─── Ground ─────────────────────────────────────────────────────────────────

const groundGeo = new THREE.PlaneGeometry(50, 50);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x1c1c24 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ─── Player (capsule) ────────────────────────────────────────────────────────

let playerMesh;
if (THREE.CapsuleGeometry) {
  const capsuleGeo = new THREE.CapsuleGeometry(0.35, 0.8, 6, 12);
  const capsuleMat = new THREE.MeshLambertMaterial({ color: 0x9b6dd6 });
  playerMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
} else {
  // Fallback: cylinder + two sphere caps
  const group = new THREE.Group();
  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 12);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x9b6dd6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  const topGeo = new THREE.SphereGeometry(0.35, 12, 8);
  const top = new THREE.Mesh(topGeo, bodyMat);
  top.position.y = 0.4;
  const botGeo = new THREE.SphereGeometry(0.35, 12, 8);
  const bot = new THREE.Mesh(botGeo, bodyMat);
  bot.position.y = -0.4;
  group.add(body, top, bot);
  playerMesh = group;
}
playerMesh.position.y = 0.75;
playerMesh.castShadow = true;
scene.add(playerMesh);

// ─── Decoration cubes ────────────────────────────────────────────────────────

const decorations = [
  { pos: [4, 0.5, -3],  color: 0x6b1414 },
  { pos: [-5, 0.5, 2],  color: 0x2a5c58 },
  { pos: [2, 0.5, 5],   color: 0xc46a1a },
];
decorations.forEach(({ pos, color }) => {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color });
  const cube = new THREE.Mesh(geo, mat);
  cube.position.set(...pos);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);
});

// ─── Camera ──────────────────────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
const CAM_OFFSET = new THREE.Vector3(0, 4, 6);

// ─── Input state ────────────────────────────────────────────────────────────

const keys = { forward: false, backward: false, left: false, right: false };
const joystick = { x: 0, y: 0 };

const isTouch = () => navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

// Keyboard (desktop)
if (!isTouch()) {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    keys.forward   = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  keys.backward  = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  keys.left      = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right     = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    keys.forward   = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  keys.backward  = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  keys.left      = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right     = false;
  });
}

// Virtual joystick (touch)
if (isTouch()) {
  const zone = document.createElement('div');
  zone.id = 'joystick-zone';
  Object.assign(zone.style, {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    width: '120px',
    height: '120px',
    zIndex: '20',
  });
  document.body.appendChild(zone);

  const manager = nipplejs.create({
    zone,
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'rgba(200, 180, 255, 0.55)',
    size: 100,
  });

  manager.on('move', (_evt, data) => {
    if (data.vector) {
      joystick.x = data.vector.x;
      joystick.y = data.vector.y;
    }
  });
  manager.on('end', () => {
    joystick.x = 0;
    joystick.y = 0;
  });
}

// ─── Movement helpers ────────────────────────────────────────────────────────

const SPEED = 5;
const moveDir = new THREE.Vector3();
const targetQuat = new THREE.Quaternion();

// ─── Clock ───────────────────────────────────────────────────────────────────

const clock = new THREE.Clock();

// ─── Resize ──────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Game loop ───────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  // Build movement vector from keyboard or joystick
  moveDir.set(0, 0, 0);

  if (isTouch()) {
    moveDir.x =  joystick.x;
    moveDir.z = -joystick.y; // nipplejs y-up = forward in world
  } else {
    if (keys.forward)  moveDir.z -= 1;
    if (keys.backward) moveDir.z += 1;
    if (keys.left)     moveDir.x -= 1;
    if (keys.right)    moveDir.x += 1;
  }

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    playerMesh.position.x += moveDir.x * SPEED * dt;
    playerMesh.position.z += moveDir.z * SPEED * dt;

    // Rotate player to face movement direction
    const angle = Math.atan2(moveDir.x, moveDir.z);
    targetQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    playerMesh.quaternion.slerp(targetQuat, 0.18);
  }

  // Third-person camera follow
  const camTarget = playerMesh.position.clone().add(CAM_OFFSET);
  camera.position.lerp(camTarget, 0.1);
  camera.lookAt(playerMesh.position);

  renderer.render(scene, camera);
}

animate();
