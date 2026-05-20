import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Timer } from 'three';
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
  { pos: [4, 0.5, -3],  color: 0x6b1414, emissive: 0x3a0a0a },
  { pos: [-5, 0.5, 2],  color: 0x2a5c58, emissive: 0x0a3a3a },
  { pos: [2, 0.5, 5],   color: 0xc46a1a, emissive: 0x3a2a0a },
];
decorations.forEach(({ pos, color, emissive }) => {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: 0.4,
    roughness: 0.8, metalness: 0.05,
  });
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

// Camera at head height — child of playerObj (mobile keeps this; desktop detaches below)
camera.position.set(0, 1.6, 0);
playerObj.add(camera);

// ─── Lia's avocado hands ─────────────────────────────────────────────────────

const handMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d, roughness: 0.85, metalness: 0.0 });

function makeHand() {
  const geo = new THREE.SphereGeometry(0.1, 10, 8);
  const mesh = new THREE.Mesh(geo, handMat);
  mesh.scale.set(1.5, 1.2, 1.8);
  return mesh;
}

const leftHand  = makeHand();
leftHand.position.set(-0.35, -0.4, -0.6);
camera.add(leftHand);

const rightHand = makeHand();
rightHand.position.set(0.35, -0.4, -0.6);
camera.add(rightHand);

// ─── Shared movement state (single source of truth) ──────────────────────────
//
// moveState.forward : -1 (back) … 0 … +1 (forward) — set by WASD or joystick
// moveState.right   : -1 (left) … 0 … +1 (right)   — set by WASD or joystick
//
const moveState = { forward: 0, right: 0 };

// Internal key booleans — lets us handle W+S held simultaneously correctly
const keys = { forward: false, backward: false, left: false, right: false, sprint: false };

function syncMoveStateFromKeys() {
  moveState.forward = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);
  moveState.right   = (keys.right   ? 1 : 0) - (keys.left     ? 1 : 0);
}

let mobileSprint = false;
let gameStarted  = false;

const WALK_SPEED  = 4;
const SPRINT_MULT = 1.6;

// ─── PointerLockControls (desktop only) ──────────────────────────────────────

let controls = null;
const lockOverlay = document.getElementById('lock-overlay');

if (!isTouchDevice) {
  // PLC takes ownership of the camera — detach from playerObj
  playerObj.remove(camera);
  scene.add(camera);
  camera.position.set(0, 1.6, 0);

  controls = new PointerLockControls(camera, renderer.domElement);

  controls.addEventListener('lock',   () => { lockOverlay.classList.add('hidden'); });
  controls.addEventListener('unlock', () => { if (gameStarted) lockOverlay.classList.remove('hidden'); });

  renderer.domElement.style.pointerEvents = 'auto';
  lockOverlay.addEventListener('click',            () => { if (gameStarted) controls.lock(); });
  renderer.domElement.addEventListener('click',    () => { if (gameStarted) controls.lock(); });

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':
        console.log('Move:', e.code); keys.forward  = true; break;
      case 'KeyS': case 'ArrowDown':
        console.log('Move:', e.code); keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft':
        console.log('Move:', e.code); keys.left     = true; break;
      case 'KeyD': case 'ArrowRight':
        console.log('Move:', e.code); keys.right    = true; break;
      case 'ShiftLeft': case 'ShiftRight': keys.sprint = true; break;
      case 'KeyF': console.log('Lantern toggle'); break;
      case 'KeyE': console.log('Interact');       break;
    }
    syncMoveStateFromKeys();
  });
  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    keys.forward  = false; break;
      case 'KeyS': case 'ArrowDown':  keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  keys.left     = false; break;
      case 'KeyD': case 'ArrowRight': keys.right    = false; break;
      case 'ShiftLeft': case 'ShiftRight': keys.sprint = false; break;
    }
    syncMoveStateFromKeys();
  });

  document.getElementById('hud-controls').style.display = '';
}

// ─── Mobile touch zones + joystick + buttons ─────────────────────────────────

let lookPointerId = null;
let lookLastX     = 0;
let lookLastY     = 0;
const LOOK_SENSITIVITY = 0.003;
const mobileYaw   = { value: 0 };
const mobilePitch = { value: 0 };

if (isTouchDevice) {
  document.getElementById('hud-controls').style.display  = 'none';
  document.getElementById('mobile-buttons').style.display = 'flex';

  // ── Full-half-screen zone divs ──────────────────────────────────────────────
  //
  // joystick-zone covers the LEFT half and is the nipplejs target.
  // look-zone    covers the RIGHT half and owns look-swipe pointer events.
  // Both sit at z-index 5, below the action buttons (z-index 20 in CSS).
  //
  const joystickZone = document.createElement('div');
  joystickZone.id = 'joystick-zone';
  Object.assign(joystickZone.style, {
    position: 'fixed', left: '0', top: '0', bottom: '0',
    width: '50vw', zIndex: '5', touchAction: 'none',
  });
  document.body.appendChild(joystickZone);

  const lookZone = document.createElement('div');
  lookZone.id = 'look-zone';
  Object.assign(lookZone.style, {
    position: 'fixed', right: '0', top: '0', bottom: '0',
    width: '50vw', zIndex: '5', touchAction: 'none',
  });
  document.body.appendChild(lookZone);

  // ── Look swipe (right zone) ───────────────────────────────────────────────
  lookZone.addEventListener('pointerdown', (e) => {
    if (lookPointerId === null) {
      lookPointerId = e.pointerId;
      lookLastX = e.clientX;
      lookLastY = e.clientY;
    }
  });
  lookZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookPointerId) return;
    const dx = e.clientX - lookLastX;
    const dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    mobileYaw.value   -= dx * LOOK_SENSITIVITY;
    mobilePitch.value -= dy * LOOK_SENSITIVITY;
    mobilePitch.value  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, mobilePitch.value));
  });
  lookZone.addEventListener('pointerup',     (e) => { if (e.pointerId === lookPointerId) lookPointerId = null; });
  lookZone.addEventListener('pointercancel', (e) => { if (e.pointerId === lookPointerId) lookPointerId = null; });

  // ── nipplejs virtual joystick (left zone, static, anchored bottom-left) ───
  const manager = nipplejs.create({
    zone:     joystickZone,
    mode:     'static',
    position: { left: '25%', bottom: '25%' },
    color:    'rgba(200, 180, 255, 0.45)',
    size:     120,
  });

  manager.on('move', (_e, data) => {
    if (!data || !data.vector) return;
    // data.vector.x: -1 (left) … +1 (right)
    // data.vector.y: -1 (down) … +1 (up/forward)
    moveState.right   = data.vector.x;
    moveState.forward = data.vector.y;
    console.log('joystick move:', data.vector); // TEMPORARY DEBUG — remove in Prompt #2.3
  });
  manager.on('end', () => {
    moveState.right   = 0;
    moveState.forward = 0;
    console.log('joystick end'); // TEMPORARY DEBUG — remove in Prompt #2.3
  });

  // ── Mobile action buttons ─────────────────────────────────────────────────
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
    setTimeout(() => { controls.lock(); }, 300);
  }
}

window.addEventListener('keydown',          () => { if (!gameStarted) dismissScroll(); });
scrollOverlay.addEventListener('pointerdown', () => { dismissScroll(); });

// ─── Timer ───────────────────────────────────────────────────────────────────

const timer = new Timer();

// ─── Resize ──────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Reusable vectors (avoid per-frame allocation) ───────────────────────────

const _fwd   = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up    = new THREE.Vector3(0, 1, 0);

// ─── Game loop ────────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const dt = timer.getDelta();
  const t  = timer.getElapsed();

  // ── Hands idle bob ──
  const bob = Math.sin(t * Math.PI * 2) * 0.02;
  leftHand.position.y  = -0.4 + bob;
  rightHand.position.y = -0.4 + bob;

  if (!gameStarted) { renderer.render(scene, camera); return; }

  // ── Movement ─────────────────────────────────────────────────────────────

  if (isTouchDevice) {
    // Apply camera orientation from accumulated yaw/pitch
    camera.quaternion.setFromEuler(
      new THREE.Euler(mobilePitch.value, mobileYaw.value, 0, 'YXZ')
    );

    if (Math.abs(moveState.forward) > 0.01 || Math.abs(moveState.right) > 0.01) {
      const speed = mobileSprint ? WALK_SPEED * SPRINT_MULT : WALK_SPEED;

      // Forward direction = rotate -Z by mobileYaw around Y
      _fwd.set(Math.sin(mobileYaw.value), 0, Math.cos(mobileYaw.value)).negate();
      _right.crossVectors(_fwd, _up).normalize();

      playerObj.position.addScaledVector(_fwd,   moveState.forward * speed * dt);
      playerObj.position.addScaledVector(_right, moveState.right   * speed * dt);
      // Camera is a child of playerObj — it moves automatically, no manual sync needed.
    }

  } else if (controls) {
    // Desktop: PointerLockControls built-ins handle direction from camera orientation.
    const speed = keys.sprint ? WALK_SPEED * SPRINT_MULT : WALK_SPEED;
    const dist  = speed * dt;

    if (moveState.forward !== 0) controls.moveForward(moveState.forward * dist);
    if (moveState.right   !== 0) controls.moveRight(  moveState.right   * dist);

    // Pin y — moveForward drifts when looking up/down.
    camera.position.y = 1.6;
    playerObj.position.set(camera.position.x, 0, camera.position.z);
  }

  renderer.render(scene, camera);
}

animate();
