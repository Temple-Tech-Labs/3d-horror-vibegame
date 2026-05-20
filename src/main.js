import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import nipplejs from 'nipplejs';

// ─── Device detection ────────────────────────────────────────────────────────

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ─── Renderer ────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ─── Scene ───────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b1a);
scene.fog = new THREE.FogExp2(0x0d0b1a, 0.035);

// ─── Lights ──────────────────────────────────────────────────────────────────

const ambient = new THREE.AmbientLight(0x3d2a6e, 0.09);
scene.add(ambient);

const fillLight = new THREE.PointLight(0x7744aa, 1.2, 30);
fillLight.position.set(0, 4, 0);
scene.add(fillLight);

// ─── Ground ──────────────────────────────────────────────────────────────────

const groundGeo = new THREE.PlaneGeometry(50, 50);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1c1c24, roughness: 0.9, metalness: 0.0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ─── Decoration cubes (test bed) ─────────────────────────────────────────────

const decorations = [
  { pos: [4, 0.5, -3],  color: 0x6b1414 },
  { pos: [-5, 0.5, 2],  color: 0x2a5c58 },
  { pos: [2, 0.5, 5],   color: 0xc46a1a },
];
decorations.forEach(({ pos, color }) => {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 });
  const cube = new THREE.Mesh(geo, mat);
  cube.position.set(...pos);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);
});

// ─── Camera & player object ───────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);

const playerObj = new THREE.Object3D();
playerObj.position.set(0, 0, 0);
scene.add(playerObj);

// Camera at head height
camera.position.set(0, 1.6, 0);
playerObj.add(camera);

// ─── Lia's avocado hands ─────────────────────────────────────────────────────

const handMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d, roughness: 0.85, metalness: 0.0 });

function makeHand() {
  const geo = new THREE.SphereGeometry(0.1, 10, 8);
  const mesh = new THREE.Mesh(geo, handMat);
  mesh.scale.set(1.5, 1.2, 1.8); // flatten to hand-pod shape
  return mesh;
}

const leftHand = makeHand();
leftHand.position.set(-0.35, -0.4, -0.6);
camera.add(leftHand);

const rightHand = makeHand();
rightHand.position.set(0.35, -0.4, -0.6);
camera.add(rightHand);

// ─── Input state ─────────────────────────────────────────────────────────────

const keys = { forward: false, backward: false, left: false, right: false, sprint: false };
const joystick = { x: 0, y: 0 };
let mobileSprint = false;
let gameStarted = false;

const WALK_SPEED = 4;
const SPRINT_MULT = 1.6;

// ─── PointerLockControls (desktop only) ──────────────────────────────────────

let controls = null;
const lockOverlay = document.getElementById('lock-overlay');

if (!isTouchDevice) {
  controls = new PointerLockControls(camera, renderer.domElement);
  // PointerLockControls moves the camera; we need to keep playerObj in sync.
  // We detach camera from playerObj and let PLC own it, then sync playerObj position.
  playerObj.remove(camera);
  scene.add(camera);
  camera.position.set(0, 1.6, 0);

  controls.addEventListener('lock', () => { lockOverlay.classList.add('hidden'); });
  controls.addEventListener('unlock', () => {
    if (gameStarted) lockOverlay.classList.remove('hidden');
  });

  renderer.domElement.style.pointerEvents = 'auto';

  lockOverlay.addEventListener('click', () => { if (gameStarted) controls.lock(); });
  renderer.domElement.addEventListener('click', () => { if (gameStarted) controls.lock(); });

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    keys.forward  = true;  break;
      case 'KeyS': case 'ArrowDown':  keys.backward = true;  break;
      case 'KeyA': case 'ArrowLeft':  keys.left     = true;  break;
      case 'KeyD': case 'ArrowRight': keys.right    = true;  break;
      case 'ShiftLeft': case 'ShiftRight': keys.sprint = true; break;
      case 'KeyF': console.log('Lantern toggle'); break;
      case 'KeyE': console.log('Interact'); break;
    }
  });
  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    keys.forward  = false; break;
      case 'KeyS': case 'ArrowDown':  keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  keys.left     = false; break;
      case 'KeyD': case 'ArrowRight': keys.right    = false; break;
      case 'ShiftLeft': case 'ShiftRight': keys.sprint = false; break;
    }
  });

  // Hide mobile controls hint on desktop
  document.getElementById('hud-controls').style.display = '';
}

// ─── Mobile touch look (right half) ─────────────────────────────────────────

let lookPointerId = null;
let lookLastX = 0;
let lookLastY = 0;
const LOOK_SENSITIVITY = 0.003;
// Euler for manual yaw/pitch on mobile
const mobileYaw = { value: 0 };
const mobilePitch = { value: 0 };

if (isTouchDevice) {
  document.getElementById('hud-controls').style.display = 'none';
  document.getElementById('mobile-buttons').style.display = 'flex';

  renderer.domElement.style.pointerEvents = 'auto';

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.clientX >= window.innerWidth / 2 && lookPointerId === null) {
      lookPointerId = e.pointerId;
      lookLastX = e.clientX;
      lookLastY = e.clientY;
    }
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerId === lookPointerId) {
      const dx = e.clientX - lookLastX;
      const dy = e.clientY - lookLastY;
      lookLastX = e.clientX;
      lookLastY = e.clientY;
      mobileYaw.value   -= dx * LOOK_SENSITIVITY;
      mobilePitch.value -= dy * LOOK_SENSITIVITY;
      mobilePitch.value  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, mobilePitch.value));
    }
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (e.pointerId === lookPointerId) lookPointerId = null;
  });
  renderer.domElement.addEventListener('pointercancel', (e) => {
    if (e.pointerId === lookPointerId) lookPointerId = null;
  });

  // Nipplejs joystick — left half
  const zone = document.createElement('div');
  zone.id = 'joystick-zone';
  Object.assign(zone.style, {
    position: 'fixed', bottom: '24px', left: '24px',
    width: '130px', height: '130px', zIndex: '20',
  });
  document.body.appendChild(zone);

  const manager = nipplejs.create({
    zone, mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'rgba(200, 180, 255, 0.45)',
    size: 110,
  });
  manager.on('move', (_e, data) => {
    if (data.vector) { joystick.x = data.vector.x; joystick.y = data.vector.y; }
  });
  manager.on('end', () => { joystick.x = 0; joystick.y = 0; });

  // Mobile action buttons
  const btnLantern  = document.getElementById('btn-lantern');
  const btnInteract = document.getElementById('btn-interact');
  const btnSprint   = document.getElementById('btn-sprint');

  btnLantern.addEventListener('pointerdown',  (e) => { e.stopPropagation(); console.log('Lantern toggle'); btnLantern.classList.add('active'); });
  btnLantern.addEventListener('pointerup',    (e) => { e.stopPropagation(); btnLantern.classList.remove('active'); });
  btnInteract.addEventListener('pointerdown', (e) => { e.stopPropagation(); console.log('Interact'); btnInteract.classList.add('active'); });
  btnInteract.addEventListener('pointerup',   (e) => { e.stopPropagation(); btnInteract.classList.remove('active'); });
  btnSprint.addEventListener('pointerdown',   (e) => { e.stopPropagation(); mobileSprint = true;  btnSprint.classList.add('active'); });
  btnSprint.addEventListener('pointerup',     (e) => { e.stopPropagation(); mobileSprint = false; btnSprint.classList.remove('active'); });
  btnSprint.addEventListener('pointercancel', (e) => { e.stopPropagation(); mobileSprint = false; btnSprint.classList.remove('active'); });
}

// ─── Opening scroll overlay ───────────────────────────────────────────────────

const scrollOverlay = document.getElementById('scroll-overlay');

function dismissScroll() {
  if (gameStarted) return;
  gameStarted = true;
  scrollOverlay.classList.add('fade-out');
  setTimeout(() => { scrollOverlay.classList.add('hidden'); }, 520);

  if (!isTouchDevice) {
    lockOverlay.classList.remove('hidden');
    // Small delay so the overlay fade finishes before asking for pointer lock
    setTimeout(() => { controls.lock(); }, 300);
  }
}

window.addEventListener('keydown', (e) => { if (!gameStarted) dismissScroll(); }, { once: false });
scrollOverlay.addEventListener('pointerdown', () => { dismissScroll(); });

// ─── Clock ───────────────────────────────────────────────────────────────────

const clock = new THREE.Clock();

// ─── Resize ──────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Movement helpers ─────────────────────────────────────────────────────────

const moveDir = new THREE.Vector3();
const forward = new THREE.Vector3();
const right   = new THREE.Vector3();
const up      = new THREE.Vector3(0, 1, 0);

// ─── Game loop ────────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t  = clock.elapsedTime;

  // ── Hands idle bob ──
  const bob = Math.sin(t * Math.PI * 2) * 0.02;
  leftHand.position.y  = -0.4 + bob;
  rightHand.position.y = -0.4 + bob;

  if (!gameStarted) { renderer.render(scene, camera); return; }

  // ── Mobile camera orientation ──
  if (isTouchDevice) {
    camera.quaternion.setFromEuler(
      new THREE.Euler(mobilePitch.value, mobileYaw.value, 0, 'YXZ')
    );
  }

  // ── Compute movement ──
  const speed = (isTouchDevice ? mobileSprint : keys.sprint) ? WALK_SPEED * SPRINT_MULT : WALK_SPEED;
  moveDir.set(0, 0, 0);

  if (isTouchDevice) {
    moveDir.x =  joystick.x;
    moveDir.z = -joystick.y;
  } else {
    if (keys.forward)  moveDir.z -= 1;
    if (keys.backward) moveDir.z += 1;
    if (keys.left)     moveDir.x -= 1;
    if (keys.right)    moveDir.x += 1;
  }

  if (moveDir.lengthSq() > 0.001) {
    moveDir.normalize();

    if (isTouchDevice) {
      // Build forward/right from mobile yaw
      forward.set(Math.sin(mobileYaw.value), 0, Math.cos(mobileYaw.value)).negate();
      right.crossVectors(forward, up).normalize();
      const worldMove = forward.clone().multiplyScalar(-moveDir.z)
        .add(right.clone().multiplyScalar(moveDir.x));
      playerObj.position.addScaledVector(worldMove, speed * dt);
      // Sync camera to player position + head height
      camera.position.set(
        playerObj.position.x,
        playerObj.position.y + 1.6,
        playerObj.position.z
      );
    } else if (controls && controls.isLocked) {
      // PointerLockControls moves camera; derive world move from camera direction
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, up).normalize();
      const worldMove = forward.clone().multiplyScalar(-moveDir.z)
        .add(right.clone().multiplyScalar(moveDir.x));
      camera.position.addScaledVector(worldMove, speed * dt);
      // Keep player grounded
      camera.position.y = 1.6;
      // Sync playerObj for future use
      playerObj.position.set(camera.position.x, 0, camera.position.z);
    }
  }

  renderer.render(scene, camera);
}

animate();
