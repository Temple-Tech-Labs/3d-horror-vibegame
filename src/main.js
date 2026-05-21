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
scene.background = new THREE.Color(0x1a0d2e);
scene.fog = new THREE.FogExp2(0x1a0d2e, 0.05);

// ─── Lighting ────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x1a0d2e, 0.08));
scene.add(new THREE.HemisphereLight(0x2a1a3a, 0x1a0d0a, 0.1));

// Lobby warm point light
const lobbyLight = new THREE.PointLight(0xff8847, 0.5, 8);
lobbyLight.position.set(0, 3, 0);
scene.add(lobbyLight);

// Living room fireplace ember
const fireplaceLight = new THREE.PointLight(0xff8847, 0.3, 3);
fireplaceLight.position.set(0, 0.5, -14.5);
scene.add(fireplaceLight);

// Kitchen moonlight through west window
const moonLight = new THREE.SpotLight(0x5a6a8a, 1.5);
moonLight.angle = 0.4;
moonLight.penumbra = 0.3;
moonLight.position.set(-20, 3, -2);
moonLight.target.position.set(-11, 0, -2);
scene.add(moonLight);
scene.add(moonLight.target);

// ─── Floor ───────────────────────────────────────────────────────────────────
const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.9, metalness: 0 })
);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// Floorboard seams
const seamMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9, metalness: 0 });
for (let i = 0; i < 9; i++) {
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(3 + Math.random() * 6, 0.02, 0.06 + Math.random() * 0.04),
    seamMat
  );
  seam.position.set((Math.random() - 0.5) * 26, 0.01, (Math.random() - 0.5) * 24);
  seam.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
  scene.add(seam);
}

// ─── Ceiling ─────────────────────────────────────────────────────────────────
const ceilMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x1a0d2e, roughness: 0.95, metalness: 0 })
);
ceilMesh.rotation.x = Math.PI / 2;
ceilMesh.position.y = 4;
scene.add(ceilMesh);

// ─── Wall helpers ─────────────────────────────────────────────────────────────
//
// Room layout (centered at origin, walls at y=0..4):
//   Lobby:       x[-5, 5],   z[-5, 5]    — spawn (0,1.6,0) facing -Z (north)
//   Kitchen:     x[-15,-5],  z[-5, 5]    — west of lobby
//   Living Room: x[-5, 5],   z[-15,-5]   — north of lobby
//
const wallColliders = [];

function jitterColor(hex) {
  const c = new THREE.Color(hex);
  c.r = Math.max(0, Math.min(1, c.r + (Math.random() - 0.5) * 0.1));
  return c;
}

function makeWall(x, y, z, w, h, d, collide = true) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: jitterColor(0x5a3e2a), roughness: 0.85, metalness: 0 })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collide) {
    wallColliders.push(new THREE.Box3(
      new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
      new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
    ));
  }
  return mesh;
}

function addWainscot(x, y, z, w, d) {
  scene.add(Object.assign(
    new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.06, d),
      new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.85, metalness: 0 })
    ),
    { position: new THREE.Vector3(x, y, z) }
  ));
}

// ─── OUTER WALLS ─────────────────────────────────────────────────────────────
// North (back of Living Room): x[-5,5], z=-15
makeWall(0, 2, -15, 10, 4, 0.3);
// East (right of Lobby + LR): x=5, z[-15,5]
makeWall(5, 2, -5, 0.3, 4, 20);
// West (back of Kitchen + north area): x=-15, z[-15,5]
makeWall(-15, 2, -5, 0.3, 4, 20);
// South kitchen (seals SW area): x[-15,-5], z=5
makeWall(-10, 2, 5, 10, 4, 0.3);
// South lobby — left of front door gap (x[-5,-1])
makeWall(-3, 2, 5, 4, 4, 0.3);
// South lobby — right of front door gap (x[1,5])
makeWall(3, 2, 5, 4, 4, 0.3);
// South lobby lintel above door (y[3,4])
makeWall(0, 3.5, 5, 2, 1, 0.3);

// ─── INTERIOR WALLS ──────────────────────────────────────────────────────────
// Kitchen north wall (seals NW corner): x[-15,-5], z=-5
makeWall(-10, 2, -5, 10, 4, 0.3);
// Living Room west wall (seals NW corner): x=-5, z[-15,-5]
makeWall(-5, 2, -10, 0.3, 4, 10);

// Lobby/Kitchen divider — north of doorway (z[-5,-1]) at x=-5
makeWall(-5, 2, -3, 0.3, 4, 4);
// Lobby/Kitchen divider — south of doorway (z[1,5]) at x=-5
makeWall(-5, 2, 3, 0.3, 4, 4);
// Lobby/Kitchen lintel (y[3,4], doorway at z[-1,1])
makeWall(-5, 3.5, 0, 0.3, 1, 2);

// Lobby/Living Room divider — west of doorway (x[-5,-1]) at z=-5
makeWall(-3, 2, -5, 4, 4, 0.3);
// Lobby/Living Room divider — east of doorway (x[1,5]) at z=-5
makeWall(3, 2, -5, 4, 4, 0.3);
// Lobby/Living Room lintel (y[3,4], doorway at x[-1,1])
makeWall(0, 3.5, -5, 2, 1, 0.3);

// ─── WAINSCOTING (y=2.5 interior-face strips) ────────────────────────────────
// addWainscot uses Object.assign to set position — need to do it properly:
function placeWainscot(x, y, z, w, d) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.06, d),
    new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.85, metalness: 0 })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

placeWainscot(0,      2.5,  4.82,  10,   0.08); // south lobby interior face
placeWainscot(4.82,   2.5, -5,     0.08, 20);   // east wall interior face
placeWainscot(-14.82, 2.5, -5,     0.08, 20);   // west kitchen interior face
placeWainscot(0,      2.5, -14.82, 10,   0.08); // north LR interior face
placeWainscot(-4.82,  2.5,  0,     0.08, 10);   // lobby/kitchen divider lobby side
placeWainscot(0,      2.5, -4.82,  10,   0.08); // lobby/LR divider lobby side

// ─── LOBBY PROPS ─────────────────────────────────────────────────────────────

// Coat rack near front door (right side)
const coatRack = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 2, 8),
  new THREE.MeshStandardMaterial({ color: 0x3a2817, roughness: 0.85, metalness: 0 })
);
coatRack.position.set(3.5, 1, 4.5);
scene.add(coatRack);

// Welcome mat at front door
const welcomeMat = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 0.05, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x3d5c3a, roughness: 0.9, metalness: 0 })
);
welcomeMat.position.set(0, 0.025, 4.7);
scene.add(welcomeMat);

// Front doorknob — red emissive (locked indicator)
const doorknob = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 8, 8),
  new THREE.MeshStandardMaterial({
    color: 0xcc0033, emissive: 0xcc0033, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.2
  })
);
doorknob.position.set(0.9, 1.5, 4.95);
scene.add(doorknob);

// Framed family portrait on east wall
const portrait = new THREE.Mesh(
  new THREE.BoxGeometry(0.05, 0.8, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x6b5d44, roughness: 0.7, metalness: 0 })
);
portrait.position.set(4.95, 2.0, 0);
scene.add(portrait);

// Chandelier — suspension rod + 4 bulb spheres
const chandMat = new THREE.MeshStandardMaterial({ color: 0x3a2817, roughness: 0.8, metalness: 0.1 });
const chandRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), chandMat);
chandRod.position.set(0, 3.75, 0);
scene.add(chandRod);

const chandBulbMat = new THREE.MeshStandardMaterial({
  color: 0x3a2a0a, emissive: 0x3a2a0a, emissiveIntensity: 0.6, roughness: 0.6, metalness: 0.1
});
[[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].forEach(([bx, bz]) => {
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), chandBulbMat);
  bulb.position.set(bx, 3.5, bz);
  scene.add(bulb);
});

// ─── KITCHEN PROPS ────────────────────────────────────────────────────────────

const counterMat = new THREE.MeshStandardMaterial({ color: 0x7a5840, roughness: 0.8, metalness: 0 });

// L-shaped counter: along west wall
const counterW = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 8), counterMat);
counterW.position.set(-14.7, 0.75, 0);
scene.add(counterW);

// L-shaped counter: along south wall of kitchen
const counterS = new THREE.Mesh(new THREE.BoxGeometry(9, 1.5, 0.6), counterMat);
counterS.position.set(-10, 0.75, 4.7);
scene.add(counterS);

// Old oven against west wall
const ovenMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 1.2, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.7, metalness: 0.3 })
);
ovenMesh.position.set(-14, 0.6, 3);
scene.add(ovenMesh);

// Oven burners (2 flat cylinders on top)
const burnerMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.4 });
[-0.2, 0.2].forEach(zo => {
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 8), burnerMat);
  burner.position.set(-14, 1.22, 3 + zo);
  scene.add(burner);
});

// 3 upper cabinets on west wall at y≈2.8
const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x6a4830, roughness: 0.8, metalness: 0 });
[-3, -1.5, 0].forEach(zo => {
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.8), cabinetMat);
  cab.position.set(-14.75, 2.8, zo);
  scene.add(cab);
});

// Window on west wall (dusty glass plane)
const winMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1.5, 1.5),
  new THREE.MeshStandardMaterial({
    color: 0x3a4a5a, roughness: 0.3, metalness: 0,
    transparent: true, opacity: 0.6
  })
);
winMesh.rotation.y = Math.PI / 2;
winMesh.position.set(-14.85, 2, -2);
scene.add(winMesh);

// Dusty jar on south counter
const jarMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.1, 0.28, 8),
  new THREE.MeshStandardMaterial({
    color: 0x8a9a7a, roughness: 0.4, metalness: 0, transparent: true, opacity: 0.7
  })
);
jarMesh.position.set(-12, 1.64, 4.7);
scene.add(jarMesh);

// Tiny glowing pepper inside jar (habanero residue hint)
const pepperMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 6, 6),
  new THREE.MeshStandardMaterial({
    color: 0x3d5c3a, emissive: 0x3d5c3a, emissiveIntensity: 0.8, roughness: 0.5, metalness: 0
  })
);
pepperMesh.position.set(-12, 1.67, 4.7);
scene.add(pepperMesh);

// ─── LIVING ROOM PROPS ────────────────────────────────────────────────────────

const couchMat = new THREE.MeshStandardMaterial({ color: 0x5a3a3a, roughness: 0.85, metalness: 0 });

// Couch base
const couchBase = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.8), couchMat);
couchBase.position.set(0, 0.25, -7.5);
scene.add(couchBase);

// Couch backrest
const couchBack = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.2), couchMat);
couchBack.position.set(0, 0.8, -7.9);
scene.add(couchBack);

// Coffee table
const coffeeTable = new THREE.Mesh(
  new THREE.BoxGeometry(1, 0.4, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.85, metalness: 0 })
);
coffeeTable.position.set(0, 0.2, -6.8);
scene.add(coffeeTable);

// Fireplace: dark box recess against north wall
const fireboxMesh = new THREE.Mesh(
  new THREE.BoxGeometry(2, 1.5, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1, metalness: 0 })
);
fireboxMesh.position.set(0, 0.75, -14.85);
scene.add(fireboxMesh);

// Patriarch portrait above fireplace
const patriarchMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 1.0, 0.05),
  new THREE.MeshStandardMaterial({ color: 0x5a4a2a, roughness: 0.7, metalness: 0 })
);
patriarchMesh.position.set(0, 3.0, -14.87);
scene.add(patriarchMesh);

// Stairs up on east wall: 5 steps (5 wide in X, 0.8 deep in Z, 0.8 tall each)
// x[0,5] against east wall x=5, stepping north from z=-7
const stepMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.85, metalness: 0 });
for (let i = 0; i < 5; i++) {
  const step = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.8), stepMat);
  step.position.set(2.5, 0.4 + i * 0.8, -7 - i * 0.8);
  scene.add(step);
}

// Banister cap at top of stairs — red emissive (blocked indicator)
const banisterCap = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 0.2),
  new THREE.MeshStandardMaterial({
    color: 0xcc0033, emissive: 0xcc0033, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0
  })
);
banisterCap.position.set(0.2, 4.1, -10.6);
scene.add(banisterCap);

// ─── STAIRS DOWN (Lobby floor, near south wall) ───────────────────────────────

// Dark pit marker at floor level (2×2)
const pitMarker = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1, metalness: 0 })
);
pitMarker.rotation.x = -Math.PI / 2;
pitMarker.position.set(0, 0.02, 3);
scene.add(pitMarker);

// 4 banister poles around the pit
const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a2817, roughness: 0.85, metalness: 0 });
[[-0.9, 2.1], [0.9, 2.1], [-0.9, 3.9], [0.9, 3.9]].forEach(([px, pz]) => {
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), poleMat);
  pole.position.set(px, 0.5, pz);
  scene.add(pole);
});

// Deep darkness plane below the hole
const deepDark = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, metalness: 0 })
);
deepDark.rotation.x = -Math.PI / 2;
deepDark.position.set(0, -3, 3);
scene.add(deepDark);

// Red emissive corner on railing (blocked indicator)
const redRailing = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.12, 0.12),
  new THREE.MeshStandardMaterial({
    color: 0xcc0033, emissive: 0xcc0033, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0
  })
);
redRailing.position.set(0.9, 1.02, 2.1);
scene.add(redRailing);

// ─── BLOCKED COLLIDERS ────────────────────────────────────────────────────────
// Front door gap (x[-1,1] at z=5)
wallColliders.push(new THREE.Box3(
  new THREE.Vector3(-1, 0, 4.85),
  new THREE.Vector3(1, 4, 5.15)
));
// Stairs down pit (prevents walking into hole)
wallColliders.push(new THREE.Box3(
  new THREE.Vector3(-1, -0.5, 2),
  new THREE.Vector3(1, 2, 4)
));
// Stairs up (blocks climbing east staircase in LR)
wallColliders.push(new THREE.Box3(
  new THREE.Vector3(0, 0, -11),
  new THREE.Vector3(5, 4, -6)
));

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
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), handMat);
  mesh.scale.set(1.5, 1.2, 1.8);
  return mesh;
}

const leftHand  = makeHand();
leftHand.position.set(-0.35, -0.4, -0.6);
camera.add(leftHand);

const rightHand = makeHand();
rightHand.position.set(0.35, -0.4, -0.6);
camera.add(rightHand);

// ─── Shared movement state ────────────────────────────────────────────────────
const moveState = { forward: 0, right: 0 };
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
  lockOverlay.addEventListener('click',         () => { if (gameStarted) controls.lock(); });
  renderer.domElement.addEventListener('click', () => { if (gameStarted) controls.lock(); });

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    keys.forward  = true;  break;
      case 'KeyS': case 'ArrowDown':  keys.backward = true;  break;
      case 'KeyA': case 'ArrowLeft':  keys.left     = true;  break;
      case 'KeyD': case 'ArrowRight': keys.right    = true;  break;
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
    mobilePitch.value  -= dy * LOOK_SENSITIVITY;
    mobilePitch.value  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, mobilePitch.value));
  });
  lookZone.addEventListener('pointerup',     (e) => { if (e.pointerId === lookPointerId) lookPointerId = null; });
  lookZone.addEventListener('pointercancel', (e) => { if (e.pointerId === lookPointerId) lookPointerId = null; });

  const manager = nipplejs.create({
    zone:     joystickZone,
    mode:     'static',
    position: { left: '25%', bottom: '25%' },
    color:    'rgba(200, 180, 255, 0.45)',
    size:     120,
  });

  manager.on('move', (_e, data) => {
    if (!data || !data.vector) return;
    moveState.right   = data.vector.x;
    moveState.forward = data.vector.y;
  });
  manager.on('end', () => {
    moveState.right   = 0;
    moveState.forward = 0;
  });

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

window.addEventListener('keydown',           () => { if (!gameStarted) dismissScroll(); });
scrollOverlay.addEventListener('pointerdown', () => { dismissScroll(); });

// ─── Timer ───────────────────────────────────────────────────────────────────
const timer = new Timer();

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── HUD room element ─────────────────────────────────────────────────────────
const hudRoom = document.getElementById('hud-room');

function getCurrentRoom(x, z) {
  if (x >= -15 && x <= -5 && z >= -5 && z <= 5)   return 'Kitchen';
  if (x >= -5  && x <= 5  && z >= -15 && z <= -5) return 'Living Room';
  return 'Lobby';
}

// ─── Reusable vectors ─────────────────────────────────────────────────────────
const _fwd        = new THREE.Vector3();
const _right      = new THREE.Vector3();
const _up         = new THREE.Vector3(0, 1, 0);
const _testSphere = new THREE.Sphere(new THREE.Vector3(), 0.3);

// ─── Game loop ────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const dt = timer.getDelta();
  const t  = timer.getElapsed();

  // Hands idle bob
  const bob = Math.sin(t * Math.PI * 2) * 0.02;
  leftHand.position.y  = -0.4 + bob;
  rightHand.position.y = -0.4 + bob;

  if (!gameStarted) { renderer.render(scene, camera); return; }

  // ── Movement + collision ─────────────────────────────────────────────────

  if (isTouchDevice) {
    camera.quaternion.setFromEuler(new THREE.Euler(mobilePitch.value, mobileYaw.value, 0, 'YXZ'));

    if (Math.abs(moveState.forward) > 0.01 || Math.abs(moveState.right) > 0.01) {
      const speed = mobileSprint ? WALK_SPEED * SPRINT_MULT : WALK_SPEED;

      _fwd.set(Math.sin(mobileYaw.value), 0, Math.cos(mobileYaw.value)).negate();
      _right.crossVectors(_fwd, _up).normalize();

      const dx = (_fwd.x * moveState.forward + _right.x * moveState.right) * speed * dt;
      const dz = (_fwd.z * moveState.forward + _right.z * moveState.right) * speed * dt;
      const cx = playerObj.position.x, cz = playerObj.position.z;

      _testSphere.center.set(cx + dx, 1.6, cz);
      const canX = !wallColliders.some(b => b.intersectsSphere(_testSphere));
      _testSphere.center.set(cx, 1.6, cz + dz);
      const canZ = !wallColliders.some(b => b.intersectsSphere(_testSphere));

      playerObj.position.x += canX ? dx : 0;
      playerObj.position.z += canZ ? dz : 0;
    }

    hudRoom.textContent = 'Room: ' + getCurrentRoom(playerObj.position.x, playerObj.position.z);

  } else if (controls) {
    const speed = keys.sprint ? WALK_SPEED * SPRINT_MULT : WALK_SPEED;
    const dist  = speed * dt;

    camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    if (_fwd.lengthSq() > 0.0001) _fwd.normalize();
    _right.crossVectors(_fwd, _up).normalize();

    const dx = (_fwd.x * moveState.forward + _right.x * moveState.right) * dist;
    const dz = (_fwd.z * moveState.forward + _right.z * moveState.right) * dist;
    const cx = camera.position.x, cz = camera.position.z;

    _testSphere.center.set(cx + dx, 1.6, cz);
    const canX = !wallColliders.some(b => b.intersectsSphere(_testSphere));
    _testSphere.center.set(cx, 1.6, cz + dz);
    const canZ = !wallColliders.some(b => b.intersectsSphere(_testSphere));

    camera.position.x += canX ? dx : 0;
    camera.position.z += canZ ? dz : 0;
    camera.position.y = 1.6;
    playerObj.position.set(camera.position.x, 0, camera.position.z);

    hudRoom.textContent = 'Room: ' + getCurrentRoom(camera.position.x, camera.position.z);
  }

  renderer.render(scene, camera);
}

animate();
