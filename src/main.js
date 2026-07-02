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
scene.fog = new THREE.FogExp2(0x1a0d2e, 0.025);

// ─── Lighting ────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x1a0d2e, 0.25));
scene.add(new THREE.HemisphereLight(0x2a1a3a, 0x1a0d0a, 0.28));

// Lobby warm point light
const lobbyLight = new THREE.PointLight(0xff8847, 1.0, 12);
lobbyLight.position.set(0, 3, 0);
scene.add(lobbyLight);

// Living room fireplace ember
const fireplaceLight = new THREE.PointLight(0xff8847, 0.8, 6);
fireplaceLight.position.set(0, 0.5, -14.5);
scene.add(fireplaceLight);

// Kitchen moonlight through west window
const moonLight = new THREE.SpotLight(0x7a8aaa, 4.5);
moonLight.angle = 0.55;
moonLight.penumbra = 0.45;
moonLight.distance = 30;
moonLight.decay = 1;
moonLight.castShadow = false;
moonLight.position.set(-20, 4, -2);
moonLight.target.position.set(-7, 0, -2);
scene.add(moonLight);
scene.add(moonLight.target);

// Kitchen residual oil-lamp glow (primary fill — moonlight is dramatic accent)
const kitchenFillLight = new THREE.PointLight(0xff8847, 1.2, 8);
kitchenFillLight.position.set(-7, 3, -2);
scene.add(kitchenFillLight);

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

// ─── Ground Floor Ceiling / 1st Floor Floor ──────────────────────────────────
const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1a0d2e, roughness: 0.95, metalness: 0 });
const floor1Mat = new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.9, metalness: 0 });

function makeFloorCeilPair(w, d, cx, cz) {
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, 3.98, cz);
  scene.add(ceil);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floor1Mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 4, cz);
  floor.receiveShadow = true;
  scene.add(floor);
}

// Left side: x[-15, 0], z[-15, 5] => w=15, d=20, cx=-7.5, cz=-5
makeFloorCeilPair(15, 20, -7.5, -5);
// Front right: x[0, 5], z[-6, 5] => w=5, d=11, cx=2.5, cz=-0.5
makeFloorCeilPair(5, 11, 2.5, -0.5);
// Back right: x[0, 5], z[-15, -11] => w=5, d=4, cx=2.5, cz=-13
makeFloorCeilPair(5, 4, 2.5, -13);
// This leaves a hole at x[0,5], z[-11,-6] for the stairs.

// ─── BASEMENT FLOOR / GROUND FLOOR CEILING (Y=0) ──────────────────────────────
const basementFloorMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9, metalness: 0 });
const basementCeilMat = new THREE.MeshStandardMaterial({ color: 0x1a0d2e, roughness: 0.95, metalness: 0 });

function makeBasementFloorCeilPair(w, d, cx, cz) {
  // Basement floor at y = -4
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), basementFloorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, -4, cz);
  floor.receiveShadow = true;
  scene.add(floor);

  // Basement ceiling / Ground floor floor at y = 0
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), basementCeilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, 0, cz);
  scene.add(ceil);
}

// Left side (Kitchen area): x[-15, 0], z[-15, 5] => w=15, d=20, cx=-7.5, cz=-5
makeBasementFloorCeilPair(15, 20, -7.5, -5);
// Front right (Lobby area): x[0, 5], z[-6, 5] => w=5, d=11, cx=2.5, cz=-0.5
makeBasementFloorCeilPair(5, 11, 2.5, -0.5);
// Back right (Living Room area): x[0, 5], z[-15, -11] => w=5, d=4, cx=2.5, cz=-13
makeBasementFloorCeilPair(5, 4, 2.5, -13);
// Stairs hole at x[0,5], z[-11,-6] left open

// Basement floorboard seams
const basementSeamMat = new THREE.MeshStandardMaterial({ color: 0x1a0a0a, roughness: 0.9, metalness: 0 });
for (let i = 0; i < 12; i++) {
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(3 + Math.random() * 6, 0.02, 0.06 + Math.random() * 0.04),
    basementSeamMat
  );
  seam.position.set((Math.random() - 0.5) * 26, -3.99, (Math.random() - 0.5) * 24);
  seam.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
  scene.add(seam);
}

// ─── BASEMENT OUTER WALLS (Y=-2) ────────────────────────────────────────────────
// North: x[-15,5], z=-15
makeWall(0, -2, -15, 20, 4, 0.3);
// East: x=5, z[-15,5]
makeWall(5, -2, -5, 0.3, 4, 20);
// West: x=-15, z[-15,5]
makeWall(-15, -2, -5, 0.3, 4, 20);
// South: x[-15,5], z=5
makeWall(-5, -2, 5, 20, 4, 0.3);

// ─── BASEMENT INTERIOR WALLS (Y=-2) ─────────────────────────────────────────────
// Furnace Room (NW): x[-15,-5], z[-15,-5]
makeWall(-10, -2, -5, 10, 4, 0.3);       // South wall of furnace room
makeWall(-10, -2, -15, 10, 4, 0.3);      // North wall (outer)
makeWall(-5, -2, -10, 0.3, 4, 10);       // East wall (shared with workshop)
makeWall(-15, -2, -10, 0.3, 4, 10);      // West wall (outer)

// Workshop (NE): x[-5,5], z[-15,-5]
makeWall(-5, -2, -5, 0.3, 4, 10);        // West wall (shared with furnace)
makeWall(0, -2, -15, 10, 4, 0.3);        // North wall (outer)
makeWall(5, -2, -10, 0.3, 4, 10);        // East wall (outer)
makeWall(0, -2, -5, 10, 4, 0.3);         // South wall (shared with Scoville Lab)

// Scoville Lab (SE, hidden): x[-5,5], z[-5,5] - SECRET ROOM
// Only accessible through a hidden passage or later unlock
makeWall(0, -2, 5, 10, 4, 0.3);          // South wall (outer)
makeWall(5, -2, 0, 0.3, 4, 10);          // East wall (outer)
makeWall(-5, -2, 0, 0.3, 4, 10);         // West wall (shared with storage)

// Storage/Lab Antechamber (SW): x[-15,-5], z[-5,5]
makeWall(-10, -2, 5, 10, 4, 0.3);        // South wall (outer)
makeWall(-15, -2, 0, 0.3, 4, 10);        // West wall (outer)
makeWall(-5, -2, 0, 0.3, 4, 10);         // East wall (shared with Scoville Lab)

// Doorways (lintels)
makeWall(-10, -0.5, -5, 0.3, 1, 2);      // Furnace <-> Workshop doorway
makeWall(-10, -0.5, 0, 0.3, 1, 2);       // Storage <-> Scoville doorway (hidden)
makeWall(0, -0.5, -5, 2, 1, 0.3);        // Workshop <-> Scoville doorway

// ─── BASEMENT WAINSCOTING (y=-1.5) ──────────────────────────────────────────────
function placeBasementWainscot(x, y, z, w, d) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.06, d),
    new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.85, metalness: 0 })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

placeBasementWainscot(0, -1.5, -14.82, 20, 0.08);  // North wall interior
placeBasementWainscot(4.82, -1.5, -5, 0.08, 20);   // East wall interior
placeBasementWainscot(-14.82, -1.5, -5, 0.08, 20); // West wall interior
placeBasementWainscot(-5, -1.5, 4.82, 10, 0.08);   // South furnace/storage interior
placeBasementWainscot(0, -1.5, -4.82, 10, 0.08);   // Workshop/Scoville divider
placeBasementWainscot(-4.82, -1.5, 0, 0.08, 10);   // Storage/Scoville divider

// ─── Wall helpers ─────────────────────────────────────────────────────────────
//
// Room layout (centered at origin, walls at y=0..4):
//   Lobby:       x[-5, 5],   z[-5, 5]    — spawn (0,1.6,0) facing -Z (north)
//   Kitchen:     x[-15,-5],  z[-5, 5]    — west of lobby
//   Living Room: x[-5, 5],   z[-15,-5]   — north of lobby
//
const wallColliders = [];
const wallMeshes = []; // raycast targets for Penny's line-of-sight check

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
  wallMeshes.push(mesh);
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

// ─── 1ST FLOOR CEILING (Y=8) ──────────────────────────────────────────────────
const ceilMesh2 = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x1a0d2e, roughness: 0.95, metalness: 0 })
);
ceilMesh2.rotation.x = Math.PI / 2;
ceilMesh2.position.y = 8;
scene.add(ceilMesh2);

// ─── 1ST FLOOR OUTER WALLS (Y=6) ──────────────────────────────────────────────
// North: x[-5,5], z=-15 (Library north)
makeWall(0, 6, -15, 10, 4, 0.3);
// North sealed NW corner: x[-15,-5], z=-15
makeWall(-10, 6, -15, 10, 4, 0.3);
// East: x=5, z[-15,5]
makeWall(5, 6, -5, 0.3, 4, 20);
// West: x=-15, z[-15,5]
makeWall(-15, 6, -5, 0.3, 4, 20);
// South: x[-15,5], z=5
makeWall(-5, 6, 5, 20, 4, 0.3);

// ─── 1ST FLOOR INTERIOR WALLS (Y=6) ───────────────────────────────────────────
// Hallway / Playroom divider (x=-5, z[-5,5])
makeWall(-5, 6, -3.5, 0.3, 4, 3);
makeWall(-5, 6,  3.5, 0.3, 4, 3);
makeWall(-5, 7.5,  0, 0.3, 1, 4);

// Hallway / Dorm 2 divider (x=-5, z[-15,-5])
makeWall(-5, 6, -13, 0.3, 4, 4);
makeWall(-5, 6, -6.5, 0.3, 4, 3);
makeWall(-5, 7.5, -9.5, 0.3, 1, 3);

// Hallway / Library divider (z=-11, x[-5,5])
makeWall(2.5, 6, -11, 5, 4, 0.3);
makeWall(-4.5, 6, -11, 1, 4, 0.3);
makeWall(-2, 7.5, -11, 4, 1, 0.3);

// Dorms / Playroom divider (z=-5, x[-15,-5])
makeWall(-10, 6, -5, 10, 4, 0.3);

// Dorm 1 / Dorm 2 divider (x=-10, z[-15,-5])
makeWall(-10, 6, -13.5, 0.3, 4, 3);
makeWall(-10, 6, -6.5,  0.3, 4, 3);
makeWall(-10, 7.5, -10, 0.3, 1, 4);

// ─── 2ND FLOOR CEILING (Y=12) & FLOOR (Y=8) ──────────────────────────────────
const ceilMat3 = new THREE.MeshStandardMaterial({ color: 0x1a0d2e, roughness: 0.95, metalness: 0 });
const floor2Mat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.9, metalness: 0 });

function makeFloorCeilPair2(w, d, cx, cz) {
  // 2nd floor floor at y=8
  const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floor2Mat);
  floor2.rotation.x = -Math.PI / 2;
  floor2.position.set(cx, 8, cz);
  floor2.receiveShadow = true;
  scene.add(floor2);

  // 2nd floor ceiling at y=12
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat3);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, 11.98, cz);
  scene.add(ceil);
}

// Piecemeal 2nd floor with stair hole at x[0,5], z[-11,-6]
makeFloorCeilPair2(15, 20, -7.5, -5);   // Left side
makeFloorCeilPair2(5, 11, 2.5, -0.5);   // Front right
makeFloorCeilPair2(5, 4, 2.5, -13);     // Back right
// Hole at x[0,5], z[-11,-6] for stairs

// ─── 2ND FLOOR OUTER WALLS (Y=10) ──────────────────────────────────────────────
// North: x[-15,5], z=-15
makeWall(0, 10, -15, 20, 4, 0.3);
// East: x=5, z[-15,5]
makeWall(5, 10, -5, 0.3, 4, 20);
// West: x=-15, z[-15,5]
makeWall(-15, 10, -5, 0.3, 4, 20);
// South: x[-15,5], z=5
makeWall(-5, 10, 5, 20, 4, 0.3);

// ─── 2ND FLOOR INTERIOR WALLS (Y=10) ───────────────────────────────────────────
// Adult Dorm 1 (NW): x[-15,-5], z[-15,-9]
makeWall(-10, 10, -9, 10, 4, 0.3);   // South wall of Dorm 1
// Adult Dorm 2 (NW): x[-15,-5], z[-9,-3]
makeWall(-10, 10, -3, 10, 4, 0.3);   // South wall of Dorm 2
// Music Room (W): x[-15,-5], z[-3,5]
makeWall(-10, 10, 5, 10, 4, 0.3);    // South wall (outer, shared)
// West side vertical dividers between dorms & music room
makeWall(-5, 10, -12, 0.3, 4, 6);    // East wall of Dorm 1 section
makeWall(-5, 10, -6, 0.3, 4, 6);     // East wall of Dorm 2 section
makeWall(-5, 10, 1, 0.3, 4, 8);      // East wall of Music Room

// Observatory (NE): x[-5,5], z[-15,-6]
makeWall(0, 10, -15, 10, 4, 0.3);    // North wall (outer)
// Observatory west wall (shared with dorms) already covered by -5 divider walls

// Observatory / Terrace divider (z=-6)
makeWall(0, 10, -6, 10, 4, 0.3);     // Separates Observatory (N) from Terrace (S)

// Terrace (SE): x[-5,5], z[-6,5]
// South wall is outer, east is outer, west is hallway to stairs

// Hallway from stairs: x[0,5], z[-11,-6] — keep open for stair landing

// ─── 2ND FLOOR STAIRS (continuing from 1st floor) ──────────────────────────────
// 1st floor stairs end at step 4: z=-10.2, y=3.6
// Bridge step to reach stair hole (z=-11)
const stepMat2 = new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.85, metalness: 0 });
const bridgeStep = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.8), stepMat2);
bridgeStep.position.set(2.5, 4.4, -11);
scene.add(bridgeStep);
// 5 steps continuing north from z=-11.8 to z=-14.2
for (let i = 0; i < 5; i++) {
  const step = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.8), stepMat2);
  step.position.set(2.5, 5.2 + i * 0.8, -11.8 - i * 0.8);
  scene.add(step);
}

// ─── 2ND FLOOR LIGHTING (cooler-bluer moonlight per Locked Standard) ────────────
// Observatory - cool moonlight, strong
const observatoryLight = new THREE.SpotLight(0x7a8aaa, 5.0);
observatoryLight.angle = 0.55;
observatoryLight.penumbra = 0.45;
observatoryLight.distance = 30;
observatoryLight.decay = 1;
observatoryLight.castShadow = false;
observatoryLight.position.set(0, 12, -10);
observatoryLight.target.position.set(0, 8, -10);
scene.add(observatoryLight);
scene.add(observatoryLight.target);

// Observatory moon pool decal
const moonPoolMesh2 = new THREE.Mesh(
  new THREE.BoxGeometry(2.5, 0.02, 3),
  new THREE.MeshStandardMaterial({
    color: 0x5a6a8a, emissive: 0x5a6a8a, emissiveIntensity: 0.5,
    roughness: 0.4, metalness: 0
  })
);
moonPoolMesh2.position.set(0, 8.011, -10);
scene.add(moonPoolMesh2);

// Adult Dorm 1 - dim warm ember
const dorm1Light = new THREE.PointLight(0x5a3a2a, 0.6, 8);
dorm1Light.position.set(-10, 10, -12);
scene.add(dorm1Light);

// Adult Dorm 2 - dim cool moonlight
const dorm2Light = new THREE.PointLight(0x7a8aaa, 0.5, 8);
dorm2Light.position.set(-10, 10, -6);
scene.add(dorm2Light);

// Music Room - warm string-light glow
const musicLight = new THREE.PointLight(0xff8847, 0.7, 10);
musicLight.position.set(-10, 10, 1);
scene.add(musicLight);

// Terrace - moonlight seep
const terraceLight = new THREE.PointLight(0x5a6a8a, 0.4, 8);
terraceLight.position.set(0, 10, 0);
scene.add(terraceLight);

// ─── 1ST FLOOR LIGHTING ───────────────────────────────────────────────────────
// Playroom light
const playroomLight = new THREE.PointLight(0xff8847, 0.8, 10);
playroomLight.position.set(-10, 7, 0);
scene.add(playroomLight);

// Dorms moonlight
const dormMoon = new THREE.PointLight(0x7a8aaa, 1.2, 12);
dormMoon.position.set(-10, 7, -10);
scene.add(dormMoon);

// Library light
const libraryLight = new THREE.PointLight(0xff8847, 0.8, 8);
libraryLight.position.set(0, 7, -13);
scene.add(libraryLight);

// ─── BASEMENT LIGHTING (cooler ambient per Locked Standard) ─────────────────────
// Furnace room - warm orange glow from furnace
const furnaceLight = new THREE.PointLight(0xff6600, 1.2, 10);
furnaceLight.position.set(-10, -3, -10);
scene.add(furnaceLight);

// Workshop - sickly green glow (experimental residue)
const workshopLight = new THREE.PointLight(0x7fc972, 0.6, 8);
workshopLight.position.set(0, -3, -10);
scene.add(workshopLight);

// Scoville Lab - hidden, very dim purple glow
const scovilleLight = new THREE.PointLight(0x3a1a4a, 0.4, 6);
scovilleLight.position.set(0, -3, 0);
scene.add(scovilleLight);

// Storage/Antechamber - dim cool moonlight seep
const storageLight = new THREE.PointLight(0x4a5a7a, 0.5, 8);
storageLight.position.set(-10, -3, 0);
scene.add(storageLight);

// ─── 1ST FLOOR PROPS ────────────────────────────────────────────────────────────
// Basement key in Library (on a bookshelf) - glows to attract attention
const keyMat = new THREE.MeshStandardMaterial({
  color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.8,
  roughness: 0.3, metalness: 0.8
});
let basementKey = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 0.1, 0.15),
  keyMat
);
basementKey.position.set(0, 5.1, -13.5); // Library at y=4 floor + 1.1
basementKey.userData = { isKey: true, collected: false };
scene.add(basementKey);

// Key glow pulse
basementKey.userData.glow = new THREE.PointLight(0xffcc00, 0.3, 2);
basementKey.add(basementKey.userData.glow);

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
// Offset 0.05 units toward kitchen interior to clear wall face at x=-14.85 and prevent Z-fighting
const winMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1.5, 1.5),
  new THREE.MeshStandardMaterial({
    color: 0x3a4a5a, roughness: 0.3, metalness: 0,
    transparent: true, opacity: 0.6,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
  })
);
winMesh.rotation.y = Math.PI / 2;
winMesh.position.set(-14.80, 2, -2);
winMesh.castShadow = false;
winMesh.receiveShadow = false;
scene.add(winMesh);

// Moonlight pool decal — visible bluish rectangle on kitchen floor below the spotlight
const moonPoolMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.02, 2.2),
  new THREE.MeshStandardMaterial({
    color: 0x5a6a8a, emissive: 0x5a6a8a, emissiveIntensity: 0.5,
    roughness: 0.4, metalness: 0
  })
);
moonPoolMesh.position.set(-7, 0.011, -2);
moonPoolMesh.rotation.y = Math.PI / 12; // ~15 degrees — angled moonlight rectangle
scene.add(moonPoolMesh);

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

// Banister cap removed (stairs are now open to 1st floor)

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
rightHand.position.set(0.28, -0.42, -0.55);
camera.add(rightHand);

// ─── Flashlight model (camera child) ─────────────────────────────────────────
const flashlightGroup = new THREE.Group();
flashlightGroup.position.set(0.30, -0.35, -0.45);
flashlightGroup.rotation.x = Math.PI / 36;

const flashBodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.4 });
const flashBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8), flashBodyMat);
flashBody.rotation.x = Math.PI / 2;
flashlightGroup.add(flashBody);

const flashBezel = new THREE.Mesh(
  new THREE.CylinderGeometry(0.07, 0.04, 0.06, 8),
  new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.5 })
);
flashBezel.rotation.x = Math.PI / 2;
flashBezel.position.z = -0.17;
flashlightGroup.add(flashBezel);

const ringMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.3 });
[-0.04, 0.04].forEach(zo => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 12), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = zo;
  flashlightGroup.add(ring);
});

const lensMat = new THREE.MeshStandardMaterial({
  color: 0xfff4d6, emissive: 0xfff4d6, emissiveIntensity: 0.0,
  roughness: 0.1, metalness: 0
});
const lensMesh = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), lensMat);
lensMesh.position.z = -0.20;
flashlightGroup.add(lensMesh);
camera.add(flashlightGroup);

const flashSpot = new THREE.SpotLight(0xfff4d6, 0);
flashSpot.angle = 0.5;
flashSpot.penumbra = 0.4;
flashSpot.distance = 15;
flashSpot.decay = 1;
flashSpot.castShadow = false;
flashSpot.position.set(0.30, -0.35, -0.45);
camera.add(flashSpot);

const flashTarget = new THREE.Object3D();
flashTarget.position.set(0.30, -0.35, -10);
camera.add(flashTarget);
flashSpot.target = flashTarget;

// ─── Shared movement state ────────────────────────────────────────────────────
const moveState = { forward: 0, right: 0 };
const keys = { forward: false, backward: false, left: false, right: false, sprint: false };

function syncMoveStateFromKeys() {
  moveState.forward = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);
  moveState.right   = (keys.right   ? 1 : 0) - (keys.left     ? 1 : 0);
}

let mobileSprint   = false;
let gameStarted    = false;
let isPaused       = false;
let flashlightOn   = false;
let candleCount    = 0;
let movementLocked = false;

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

  controls.addEventListener('lock',   () => { lockOverlay.classList.add('hidden'); isPaused = false; });
  controls.addEventListener('unlock', () => { if (gameStarted && !limboCleared) { lockOverlay.classList.remove('hidden'); isPaused = true; } });

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
      case 'KeyF': toggleFlashlight(); break;
      case 'KeyE': tryInteract();     break;
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

  btnLantern.addEventListener('pointerdown',  (e) => { e.stopPropagation(); toggleFlashlight(); btnLantern.classList.add('active'); });
  btnLantern.addEventListener('pointerup',    (e) => { e.stopPropagation(); btnLantern.classList.remove('active'); });
  btnInteract.addEventListener('pointerdown', (e) => { e.stopPropagation(); tryInteract(); btnInteract.classList.add('active'); });
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

// ─── Magic-Methane-Candles ────────────────────────────────────────────────────
function makeCandle(wx, wy, wz) {
  const group = new THREE.Group();
  group.position.set(wx, wy, wz);

  group.userData.waxMat = new THREE.MeshStandardMaterial({
    color: 0xf0e8c0, emissive: 0xf0e8c0, emissiveIntensity: 0.0,
    roughness: 0.9, metalness: 0
  });
  const waxMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), group.userData.waxMat);
  group.add(waxMesh);

  const wickMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.04, 4),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1, metalness: 0 })
  );
  wickMesh.position.y = 0.11;
  group.add(wickMesh);

  group.userData.flameMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 6, 6),
    new THREE.MeshStandardMaterial({
      color: 0xff8847, emissive: 0xff8847, emissiveIntensity: 1.5,
      roughness: 0.4, metalness: 0
    })
  );
  group.userData.flameMesh.scale.set(0.8, 1.4, 0.8);
  group.userData.flameMesh.position.y = 0.15;
  group.userData.flameMesh.visible = false;
  group.add(group.userData.flameMesh);

  group.userData.lit = false;
  scene.add(group);
  return group;
}

const candles = [
  // Verified: candle base Y (1.59 - 0.09 = 1.50) matches counterS top Y (0.75 + 0.75 = 1.50)
  makeCandle(-11.7, 1.59, 4.7),  // kitchen south counter, 0.3 units from pepper jar
  // Verified: candle base Y (1.59 - 0.09 = 1.50) matches fireboxMesh top Y (0.75 + 0.75 = 1.50)
  makeCandle(0.5,   1.59, -14.7), // LR fireplace mantle (top of firebox, near front edge)
  
  // 1st Floor Candles
  // Library candle (on the floor)
  makeCandle(0, 4.09, -13),
  // Playroom candle (on the floor)
  makeCandle(-10, 4.09, 0),
  
  // Basement Candles (y = -4 floor, so base at -3.91)
  // Furnace room candle (on a crate near furnace)
  makeCandle(-10, -3.91, -10),
  // Scoville Lab candle (on a workbench)
  makeCandle(0, -3.91, 0),
  
  // 2nd Floor Candles (y = 8 floor, so base at 8.09)
  // Observatory candle (on a pedestal)
  makeCandle(0, 8.09, -12),
  // Music Room candle (on a piano/shelf)
  makeCandle(-10, 8.09, 0),
];

const TOTAL_CANDLES = candles.length;

// ─── ENEMIES & LOGIC ─────────────────────────────────────────────────────────

let timeSinceStoppedMoving = 0;
let deathCount = 0;
let limboCleared = false;
let lastPennySeesLia = false; // cached for debug overlay

class Enemy {
  constructor(name, group, waypoints, isSkeleton = false, patrolSpeed = 1.2) {
    this.name = name;
    this.group = group;
    this.waypoints = waypoints;
    this.waypointIndex = 0;
    
    this.state = 'PATROL'; // 'PATROL' | 'SUSPICIOUS' | 'CHASE' | 'STUNNED' | 'RAGE'
    this.stateTimer = 0;
    this.chaseTimer = 0;
    this.lastSeenPosition = new THREE.Vector3();
    
    this.patrolSpeed = patrolSpeed;
    this.chaseSpeedInitial = 2.5;
    this.chaseSpeedMax = 4.0;
    this.rageSpeed = 5.0;
    this.currentChaseSpeed = this.chaseSpeedInitial;
    
    this.isSkeleton = isSkeleton;
    this.fartTimer = 0;
    this.particles = [];
    
    // Add to scene
    this.group.position.copy(this.waypoints[0]);
    scene.add(this.group);
  }

  transitionTo(newState) {
    this.state = newState;
    this.stateTimer = 0;
    this.chaseTimer = 0;
    this.currentChaseSpeed = this.chaseSpeedInitial;

    const leftEye = this.group.userData.leftEye;
    const rightEye = this.group.userData.rightEye;
    const fartCloud = this.group.userData.fartCloud;

    if (newState === 'CHASE') {
      leftEye.material.color.setHex(0xcc0033); leftEye.material.emissive.setHex(0xcc0033); leftEye.material.emissiveIntensity = 1.5;
      rightEye.material.color.setHex(0xcc0033); rightEye.material.emissive.setHex(0xcc0033); rightEye.material.emissiveIntensity = 1.5;
      if (fartCloud) fartCloud.scale.set(1, 0.85, 1);
    } else if (newState === 'SUSPICIOUS') {
      leftEye.material.color.setHex(0xffcc00); leftEye.material.emissive.setHex(0xffcc00); leftEye.material.emissiveIntensity = 1.5;
      rightEye.material.color.setHex(0xffcc00); rightEye.material.emissive.setHex(0xffcc00); rightEye.material.emissiveIntensity = 1.5;
      if (fartCloud) fartCloud.scale.set(1, 0.85, 1);
    } else if (newState === 'STUNNED') {
      leftEye.material.color.setHex(0x9b30ff); leftEye.material.emissive.setHex(0x9b30ff); leftEye.material.emissiveIntensity = 2.0;
      rightEye.material.color.setHex(0x9b30ff); rightEye.material.emissive.setHex(0x9b30ff); rightEye.material.emissiveIntensity = 2.0;
      if (fartCloud) fartCloud.scale.set(0.5, 0.5 * 0.85, 0.5);
    } else if (newState === 'RAGE') {
      leftEye.material.color.setHex(0xff0000); leftEye.material.emissive.setHex(0xff0000); leftEye.material.emissiveIntensity = 2.5;
      rightEye.material.color.setHex(0xff0000); rightEye.material.emissive.setHex(0xff0000); rightEye.material.emissiveIntensity = 2.5;
      if (fartCloud) fartCloud.scale.set(1.5, 1.5 * 0.85, 1.5);
    } else {
      leftEye.material.color.setHex(0x0a0a0a); leftEye.material.emissive.setHex(0x000000); leftEye.material.emissiveIntensity = 0;
      rightEye.material.color.setHex(0x0a0a0a); rightEye.material.emissive.setHex(0x000000); rightEye.material.emissiveIntensity = 0;
      if (fartCloud) { fartCloud.material.opacity = 0.15; fartCloud.scale.set(1, 0.85, 1); }
    }
  }

  checkSeesLia() {
    const liaPos = isTouchDevice ? playerObj.position : camera.position;
    const isMoving = (Math.abs(moveState.forward) > 0.01 || Math.abs(moveState.right) > 0.01);
    const liaStill = !isMoving && timeSinceStoppedMoving > 1.0;

    let detectRange, detectCone;
    if (flashlightOn && isMoving)        { detectRange = 8; detectCone = Math.PI / 2; }
    else if (flashlightOn && !isMoving)  { detectRange = 6; detectCone = Math.PI * 0.42; }
    else if (!flashlightOn && isMoving)  { detectRange = 5; detectCone = Math.PI * 0.25; }
    else                                 { detectRange = 3; detectCone = Math.PI * 0.14; }

    _pennyToLia.set(liaPos.x - this.group.position.x, liaPos.y - 1.6 - this.group.position.y, liaPos.z - this.group.position.z);
    const dist = _pennyToLia.length();
    if (dist > detectRange) return false;
    if (dist < 0.0001) return true;

    _pennyForward.set(0, 0, 1).applyEuler(new THREE.Euler(0, this.group.rotation.y, 0));
    _pennyToLia.divideScalar(dist);
    const dot = _pennyForward.dot(_pennyToLia);
    if (dot < Math.cos(detectCone / 2)) return false;

    this.group.userData.leftEye.getWorldPosition(_pennyEyePos);
    _liaWorldPos.set(liaPos.x, 1.5, liaPos.z);
    _pennyLosDir.subVectors(_liaWorldPos, _pennyEyePos);
    const losDist = _pennyLosDir.length();
    if (losDist < 0.0001) return true;
    _pennyLosDir.divideScalar(losDist);
    const losRay = new THREE.Raycaster(_pennyEyePos, _pennyLosDir, 0, losDist);
    const hits = losRay.intersectObjects(wallMeshes, false);
    if (hits.length > 0) return false;

    return true;
  }

  checkFlashlightStun() {
    if (!flashlightOn) return false;
    const liaPos = isTouchDevice ? playerObj.position : camera.position;
    camera.getWorldDirection(_fwd);
    _pennyToLia.set(this.group.position.x - liaPos.x, this.group.position.y - liaPos.y + 1.0, this.group.position.z - liaPos.z);
    const dist = _pennyToLia.length();
    if (dist > 10) return false; // Flashlight range

    _pennyToLia.normalize();
    if (_fwd.dot(_pennyToLia) < Math.cos(0.5)) return false; // Flashlight cone is 0.5 rad

    // Raycast to check walls
    this.group.userData.leftEye.getWorldPosition(_pennyEyePos);
    _liaWorldPos.set(liaPos.x, 1.5, liaPos.z);
    _pennyLosDir.subVectors(_pennyEyePos, _liaWorldPos);
    const losDist = _pennyLosDir.length();
    _pennyLosDir.divideScalar(losDist);
    const losRay = new THREE.Raycaster(_liaWorldPos, _pennyLosDir, 0, losDist);
    if (losRay.intersectObjects(wallMeshes, false).length > 0) return false;

    return true;
  }

  update(delta, elapsedTime) {
    this.stateTimer += delta;

    // Visual animations
    if (this.group.userData.body) {
      this.group.userData.body.position.y = 0.6 + Math.sin(elapsedTime * 1.5 + this.group.position.x) * 0.05;
    }
    if (this.group.userData.bow) {
      this.group.userData.bow.rotation.z = Math.sin(elapsedTime * 2 + this.group.position.z) * 0.08;
    }
    if (this.group.userData.propeller) {
      this.group.userData.propeller.rotation.y += delta * 10;
    }
    
    // Fart Particles for Skeleton
    if (this.isSkeleton) {
      this.fartTimer += delta;
      let fartFreq = 2.0;
      if (this.state === 'RAGE') fartFreq = 0.5;
      else if (this.state === 'CHASE' || this.state === 'SUSPICIOUS') fartFreq = 1.0;
      
      if (this.fartTimer >= fartFreq) {
        this.fartTimer = 0;
        const p = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 8),
          new THREE.MeshStandardMaterial({
            color: 0x9bb540, transparent: true, opacity: 0.6, depthWrite: false
          })
        );
        // Skeleton behind
        const behind = new THREE.Vector3(0, 0.5, -0.3).applyEuler(this.group.rotation);
        p.position.copy(this.group.position).add(behind);
        p.userData = { life: 0, maxLife: 2.0 + Math.random() };
        scene.add(p);
        this.particles.push(p);
      }
    }
    
    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life += delta;
      if (p.userData.life >= p.userData.maxLife) {
        scene.remove(p);
        this.particles.splice(i, 1);
      } else {
        p.position.y += delta * 0.5;
        p.scale.setScalar(1 + p.userData.life);
        p.material.opacity = 0.6 * (1 - p.userData.life / p.userData.maxLife);
      }
    }

    // Flashlight Check
    if (this.state !== 'STUNNED' && this.state !== 'RAGE' && this.checkFlashlightStun()) {
      this.transitionTo('STUNNED');
    }

    // AI Logic
    if (this.state === 'STUNNED') {
      if (this.stateTimer >= 3.0) {
        this.transitionTo('RAGE');
      }
    }
    else if (this.state === 'RAGE') {
      const liaPos = isTouchDevice ? playerObj.position : camera.position;
      this.lastSeenPosition.set(liaPos.x, liaPos.y - 1.6, liaPos.z);
      
      _pennyToTarget.set(this.lastSeenPosition.x - this.group.position.x, this.lastSeenPosition.y - this.group.position.y, this.lastSeenPosition.z - this.group.position.z);
      const dist = _pennyToTarget.length();
      if (dist > 0.2) {
        _pennyToTarget.divideScalar(dist);
        this.group.position.addScaledVector(_pennyToTarget, this.rageSpeed * delta);
        this.group.rotation.y = Math.atan2(_pennyToTarget.x, _pennyToTarget.z);
      }

      if (Math.hypot(liaPos.x - this.group.position.x, liaPos.z - this.group.position.z) < 0.7) {
        triggerCaught();
        return;
      }

      if (this.stateTimer >= 5.0) {
        this.transitionTo('PATROL');
      }
    }
    else if (this.state === 'PATROL') {
      const target = this.waypoints[this.waypointIndex];
      _pennyToTarget.set(target.x - this.group.position.x, target.y - this.group.position.y, target.z - this.group.position.z);
      const dist = _pennyToTarget.length();
      if (dist < 0.3) {
        this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      } else {
        _pennyToTarget.divideScalar(dist);
        this.group.position.addScaledVector(_pennyToTarget, this.patrolSpeed * delta);
        this.group.rotation.y = Math.atan2(_pennyToTarget.x, _pennyToTarget.z);
      }

      if (this.checkSeesLia()) {
        const liaPos = isTouchDevice ? playerObj.position : camera.position;
        this.lastSeenPosition.set(liaPos.x, liaPos.y - 1.6, liaPos.z);
        this.transitionTo('SUSPICIOUS');
      }
    }
    else if (this.state === 'SUSPICIOUS') {
      const liaPos = isTouchDevice ? playerObj.position : camera.position;
      _pennyToLia.set(liaPos.x - this.group.position.x, liaPos.y - 1.6 - this.group.position.y, liaPos.z - this.group.position.z);
      if (_pennyToLia.lengthSq() > 0.0001) {
        this.group.rotation.y = Math.atan2(_pennyToLia.x, _pennyToLia.z);
      }
      if (this.stateTimer < 2.5) {
        if (this.checkSeesLia()) {
          this.lastSeenPosition.set(liaPos.x, liaPos.y - 1.6, liaPos.z);
          this.transitionTo('CHASE');
        }
      } else {
        this.transitionTo('PATROL');
      }
    }
    else if (this.state === 'CHASE') {
      this.currentChaseSpeed = Math.min(this.chaseSpeedMax, this.chaseSpeedInitial + this.stateTimer * 0.3);
      if (this.group.userData.fartCloud) {
        this.group.userData.fartCloud.material.opacity = 0.15 + Math.sin(elapsedTime * 6) * 0.1;
      }

      const liaPos = isTouchDevice ? playerObj.position : camera.position;
      if (this.checkSeesLia()) {
        this.lastSeenPosition.set(liaPos.x, liaPos.y - 1.6, liaPos.z);
        this.chaseTimer = 0;
      } else {
        this.chaseTimer += delta;
      }

      _pennyToTarget.set(this.lastSeenPosition.x - this.group.position.x, this.lastSeenPosition.y - this.group.position.y, this.lastSeenPosition.z - this.group.position.z);
      const dist = _pennyToTarget.length();
      if (dist > 0.2) {
        _pennyToTarget.divideScalar(dist);
        this.group.position.addScaledVector(_pennyToTarget, this.currentChaseSpeed * delta);
        this.group.rotation.y = Math.atan2(_pennyToTarget.x, _pennyToTarget.z);
      }

      if (Math.hypot(liaPos.x - this.group.position.x, liaPos.z - this.group.position.z) < 0.7) {
        triggerCaught();
        return;
      }

      if (this.chaseTimer > 3.0 || this.stateTimer > 12.0) {
        this.transitionTo('PATROL');
      }
    }
  }
}

// Visual Generators
function createGhostBoyVisuals(hasPropeller) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x9bb540, emissive: 0x9bb540, emissiveIntensity: 1.8,
    roughness: 0.6, metalness: 0.0
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), bodyMat);
  body.scale.y = 0.85;
  body.position.set(0, 0.6, 0);
  group.add(body);
  group.userData.body = body;

  const eyeMat = () => new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat());
  leftEye.scale.set(1, 2, 1);
  leftEye.position.set(-0.15, 0.12, 0.41); 
  body.add(leftEye);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat());
  rightEye.scale.set(1, 2, 1);
  rightEye.position.set(0.15, 0.12, 0.41);
  body.add(rightEye);
  group.userData.leftEye = leftEye;
  group.userData.rightEye = rightEye;

  if (hasPropeller) {
    const beanie = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x2244cc, roughness: 0.8 })
    );
    beanie.position.set(0, 1.0, 0);
    group.add(beanie);
    
    const propGroup = new THREE.Group();
    propGroup.position.set(0, 1.3, 0);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    propGroup.add(pin);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
    blade.position.y = 0.05;
    propGroup.add(blade);
    group.add(propGroup);
    group.userData.propeller = propGroup;
  } else {
    // Pink bow
    const bow = new THREE.Group();
    bow.position.set(0, 1.05, 0);
    const bowMat = new THREE.MeshStandardMaterial({
      color: 0xff6b9d, emissive: 0xff6b9d, emissiveIntensity: 0.2, roughness: 0.5, metalness: 0
    });
    const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), bowMat);
    bow.add(bowKnot);
    const bowLoopL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), bowMat);
    bowLoopL.position.set(-0.12, 0, 0); bowLoopL.rotation.z = Math.PI / 9; bow.add(bowLoopL);
    const bowLoopR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), bowMat);
    bowLoopR.position.set(0.12, 0, 0); bowLoopR.rotation.z = -Math.PI / 9; bow.add(bowLoopR);
    group.add(bow);
    group.userData.bow = bow;
  }

  const glow = new THREE.PointLight(0x9bb540, 0.6, 4);
  glow.position.set(0, 0.6, 0);
  group.add(glow);

  const fartMat = new THREE.MeshStandardMaterial({
    color: 0x9bb540, emissive: 0x9bb540, emissiveIntensity: 0.4,
    roughness: 0.6, metalness: 0, transparent: true, opacity: 0.15, depthWrite: false
  });
  const fartCloud = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), fartMat);
  fartCloud.scale.y = 0.85;
  fartCloud.position.set(0, 0.6, 0);
  group.add(fartCloud);
  group.userData.fartCloud = fartCloud;

  return group;
}

function createSkeletonVisuals() {
  const group = new THREE.Group();
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xe0d8c8, roughness: 0.9 });

  const ribcage = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.6, 8), boneMat);
  ribcage.position.set(0, 1.0, 0);
  group.add(ribcage);
  group.userData.body = ribcage; // for bobbing

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), boneMat);
  skull.position.set(0, 1.5, 0);
  group.add(skull);

  const eyeMat = () => new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeMat());
  leftEye.position.set(-0.1, 1.55, 0.22);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeMat());
  rightEye.position.set(0.1, 1.55, 0.22);
  group.add(rightEye);
  group.userData.leftEye = leftEye;
  group.userData.rightEye = rightEye;
  
  // Limbs
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.6), boneMat);
  armL.position.set(-0.3, 0.9, 0); armL.rotation.z = Math.PI / 8; group.add(armL);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.6), boneMat);
  armR.position.set(0.3, 0.9, 0); armR.rotation.z = -Math.PI / 8; group.add(armR);
  
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.7), boneMat);
  legL.position.set(-0.15, 0.35, 0); group.add(legL);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.7), boneMat);
  legR.position.set(0.15, 0.35, 0); group.add(legR);

  return group;
}

function createGrandparentVisuals(isGrandpa = false) {
  const group = new THREE.Group();
  const ghoulMat = new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 0.9, metalness: 0 });

  // Hunched oversized body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), ghoulMat);
  body.scale.set(1.0, 1.2, 0.8);
  body.position.set(0, 0.6, 0.1);
  group.add(body);
  group.userData.body = body;

  // Decayed skin tone face
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x6a7a5a, roughness: 0.9, metalness: 0 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), faceMat);
  head.position.set(0, 1.2, 0.15);
  group.add(head);

  // Eyes - red angry glow
  const eyeMat = () => new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeMat());
  leftEye.position.set(-0.12, 1.25, 0.38);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeMat());
  rightEye.position.set(0.12, 1.25, 0.38);
  group.add(rightEye);
  group.userData.leftEye = leftEye;
  group.userData.rightEye = rightEye;

  // Vintage hat
  if (isGrandpa) {
    // Top hat
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.1 });
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 12), hatMat);
    hatBrim.position.set(0, 1.45, 0.15);
    group.add(hatBrim);
    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.25, 12), hatMat);
    hatCrown.position.set(0, 1.6, 0.15);
    group.add(hatCrown);
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: 0xcc0033, roughness: 0.4, metalness: 0 }));
    hatBand.position.set(0, 1.48, 0.15);
    group.add(hatBand);
  } else {
    // Floral granny hat
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x8a6a7a, roughness: 0.8, metalness: 0 });
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.04, 12), hatMat);
    hatBrim.position.set(0, 1.45, 0.15);
    group.add(hatBrim);
    const hatCrown = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
    hatCrown.position.set(0, 1.55, 0.15);
    group.add(hatCrown);
    // Tiny flower decoration
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xff6b9d, emissive: 0xff6b9d, emissiveIntensity: 0.3 });
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), flowerMat);
    flower.position.set(0.2, 1.6, 0.15);
    group.add(flower);
  }

  // Fart cloud glow around body
  const fartMat = new THREE.MeshStandardMaterial({
    color: 0x9bb540, emissive: 0x9bb540, emissiveIntensity: 0.4,
    roughness: 0.6, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false
  });
  const fartCloud = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), fartMat);
  fartCloud.scale.set(1.0, 0.85, 0.8);
  fartCloud.position.set(0, 0.6, 0);
  group.add(fartCloud);
  group.userData.fartCloud = fartCloud;

  // Accompanying point light
  const glow = new THREE.PointLight(0x9bb540, 0.4, 4);
  glow.position.set(0, 0.6, 0);
  group.add(glow);

  return group;
}

const pennyWaypoints = [
  new THREE.Vector3(0,    0, -2),
  new THREE.Vector3(0,    0, -10),
  new THREE.Vector3(2.5,  0, -6),
  new THREE.Vector3(2.5,  4, -11),
  new THREE.Vector3(0,    4, -8),
  new THREE.Vector3(-8,   4, -8),
  new THREE.Vector3(-8,   4, 0),
  new THREE.Vector3(0,    4, -13),
  new THREE.Vector3(2.5,  4, -11),
  new THREE.Vector3(2.5,  0, -6),
];

const tommyWaypoints = [
  new THREE.Vector3(-10,  0, 0),
  new THREE.Vector3(-12,  0, -3),
  new THREE.Vector3(-10,  0, 3),
  new THREE.Vector3(-5,   0, 0),
  new THREE.Vector3(0,    0, 2),
];

const josephWaypoints = [
  new THREE.Vector3(0,    0, -13),
  new THREE.Vector3(-3,   0, -10),
  new THREE.Vector3(3,    0, -8),
  new THREE.Vector3(0,    0, -6),
];

// Basement Fart-Cloud Kids (y = -4 for basement floor)
const basilWaypoints = [
  new THREE.Vector3(-10, -4, -10), // Furnace room
  new THREE.Vector3(-12, -4, -12),
  new THREE.Vector3(-8,  -4, -8),
  new THREE.Vector3(-10, -4, -5),
];

const coraWaypoints = [
  new THREE.Vector3(0,  -4, -10), // Workshop
  new THREE.Vector3(-3, -4, -12),
  new THREE.Vector3(3,  -4, -8),
  new THREE.Vector3(0,  -4, -5),
];

const daisyWaypoints = [
  new THREE.Vector3(0,  -4, 0),   // Scoville Lab / Storage area
  new THREE.Vector3(-3, -4, 2),
  new THREE.Vector3(3,  -4, -2),
  new THREE.Vector3(0,  -4, 3),
];

// 2nd Floor Zombie-Ghoul Grandparent waypoints (y = 8)
const grandpaWaypoints = [
  new THREE.Vector3(-10, 8, -12),   // Adult Dorm 1
  new THREE.Vector3(-8,  8, -10),
  new THREE.Vector3(-12, 8, -8),
  new THREE.Vector3(-10, 8, -12),
];

const grandmaWaypoints = [
  new THREE.Vector3(-10, 8, -6),    // Adult Dorm 2
  new THREE.Vector3(-7,  8, -7),
  new THREE.Vector3(-13, 8, -5),
  new THREE.Vector3(-10, 8, -3),
];

const gustavoWaypoints = [
  new THREE.Vector3(-10, 8, 0),     // Music Room
  new THREE.Vector3(-12, 8, 2),
  new THREE.Vector3(-7,  8, 3),
  new THREE.Vector3(-10, 8, -1),
];

const enemies = [
  new Enemy('Penny', createGhostBoyVisuals(false), pennyWaypoints, false, 1.2),
  new Enemy('Tommy', createGhostBoyVisuals(true), tommyWaypoints, false, 1.3),
  new Enemy('Joseph', createSkeletonVisuals(), josephWaypoints, true, 1.0),
  // Basement kids (Fart-Cloud Kids - fastest, easiest to stun)
  new Enemy('Basil', createGhostBoyVisuals(true), basilWaypoints, false, 1.5),
  new Enemy('Cora', createGhostBoyVisuals(false), coraWaypoints, false, 1.5),
  new Enemy('Daisy', createGhostBoyVisuals(false), daisyWaypoints, false, 1.5),
  // 2nd Floor Zombie-Ghoul Grandparents (slowest, hardest to stun)
  new Enemy('Grandpa Beanie', createGrandparentVisuals(true), grandpaWaypoints, false, 0.8),
  new Enemy('Grandma Beanie', createGrandparentVisuals(false), grandmaWaypoints, false, 0.7),
  new Enemy('Uncle Gustavo', createGrandparentVisuals(true), gustavoWaypoints, false, 0.9),
];

const _pennyToTarget = new THREE.Vector3();
const _pennyForward  = new THREE.Vector3();
const _pennyToLia    = new THREE.Vector3();
const _pennyEyePos   = new THREE.Vector3();
const _pennyLosDir   = new THREE.Vector3();
const _liaWorldPos   = new THREE.Vector3();

// ─── Caught & respawn mechanic ────────────────────────────────────────────────
function triggerCaught() {
  movementLocked = true;
  deathCount++;

  const flashEl = document.getElementById('caught-flash');
  flashEl.style.display = 'block';
  flashEl.style.opacity = '0.7';

  setTimeout(() => {
    if (controls) {
      camera.position.set(0, 1.6, 0);
      camera.rotation.set(0, 0, 0);
    } else {
      mobileYaw.value = 0;
      mobilePitch.value = 0;
    }
    playerObj.position.set(0, 0, 0);

    for (const enemy of enemies) {
      enemy.transitionTo('PATROL');
      enemy.waypointIndex = 0;
      enemy.group.position.copy(enemy.waypoints[0]);
    }
    
    movementLocked = false;
    flashEl.style.opacity = '0';
    setTimeout(() => { flashEl.style.display = 'none'; }, 400);
  }, 500);
}

// ─── Limbo Hall win condition ─────────────────────────────────────────────────
function checkLimboWin() {
  if (limboCleared) return;
  if (candleCount >= 4) {
    limboCleared = true;
    showLimboVictoryScreen();
  }
}

function showLimboVictoryScreen() {
  const el = document.getElementById('limbo-victory');
  el.style.display = 'flex';
  if (controls) controls.unlock();

  const dismiss = () => {
    el.style.display = 'none';
    window.removeEventListener('keydown', dismiss);
    window.removeEventListener('click', dismiss);
  };
  window.addEventListener('keydown', dismiss);
  window.addEventListener('click', dismiss);
}

// ─── HUD room element ─────────────────────────────────────────────────────────
const hudRoom      = document.getElementById('hud-room');
const hudCandles   = document.getElementById('hud-candles');
const interactPrompt = document.getElementById('interact-prompt');

function getCurrentRoom(x, y, z) {
  if (y > 7) {
    if (x >= -15 && x <= -5 && z >= -15 && z <= -9) return 'Adult Dorm 1';
    if (x >= -15 && x <= -5 && z >= -9  && z <= -3) return 'Adult Dorm 2';
    if (x >= -15 && x <= -5 && z >= -3  && z <= 5)  return 'Music Room';
    if (x >= -5  && x <= 5  && z >= -15 && z <= -6) return 'Observatory';
    if (x >= -5  && x <= 5  && z >= -6  && z <= 5)  return 'Terrace';
    return 'Heaven Hall';
  }
  if (y > 3) {
    if (x >= -15 && x <= -5 && z >= -5 && z <= 5)   return 'Playroom';
    if (x >= -15 && x <= -5 && z >= -15 && z <= -5) return 'Kids Dorms';
    if (x >= -5  && x <= 5  && z >= -15 && z <= -11) return 'Library';
    return 'Purgatory Hall';
  }
  if (y < 0) {
    if (x >= -15 && x <= -5 && z >= -15 && z <= -5) return 'Furnace Room';
    if (x >= -5  && x <= 5  && z >= -15 && z <= -5) return 'Workshop';
    if (x >= -5  && x <= 5  && z >= -5  && z <= 5)  return 'Scoville Lab';
    if (x >= -15 && x <= -5 && z >= -5  && z <= 5)  return 'Storage';
    return "Hell's Labyrinth";
  }
  if (x >= -15 && x <= -5 && z >= -5 && z <= 5)   return 'Kitchen';
  if (x >= -5  && x <= 5  && z >= -15 && z <= -5) return 'Living Room';
  return 'Lobby';
}

// ─── Interaction functions ────────────────────────────────────────────────────
function toggleFlashlight() {
  flashlightOn = !flashlightOn;
  if (!flashlightOn) flashSpot.intensity = 0;
  lensMat.emissiveIntensity = flashlightOn ? 0.8 : 0.0;
}

function lightCandle(candle) {
  candle.userData.lit = true;
  candle.userData.flameMesh.visible = true;
  candle.userData.waxMat.emissiveIntensity = 0.3;
  const glow = new THREE.PointLight(0xff8847, 0.8, 3);
  glow.position.set(0, 0.2, 0);
  candle.add(glow);
}

function tryInteract() {
  if (movementLocked) return;

  const pos = isTouchDevice ? playerObj.position : camera.position;
  camera.getWorldDirection(_fwd);

  // Only interactable now: unlit candles (require flashlight ON) + basement key
  if (!flashlightOn) return;

  // Check for basement key first (doesn't require flashlight, but needs interact)
  if (basementKey && !basementKey.userData.collected) {
    _toCandle.subVectors(basementKey.position, pos);
    const keyDist = _toCandle.length();
    if (keyDist < 2.5) {
      _toCandle.normalize();
      if (_fwd.dot(_toCandle) > 0.5) {
        collectBasementKey();
        return;
      }
    }
  }

  let bestCandle = null;
  let bestDist = Infinity;
  for (const candle of candles) {
    if (candle.userData.lit) continue;
    _toCandle.subVectors(candle.position, pos);
    const dist = _toCandle.length();
    if (dist > 2.5) continue;
    _toCandle.normalize();
    if (_fwd.dot(_toCandle) < 0.5) continue;
    if (dist < bestDist) {
      bestDist = dist;
      bestCandle = candle;
    }
  }

  if (bestCandle === null) return;
  lightCandle(bestCandle);
  candleCount++;
  hudCandles.textContent = `Candles lit: ${candleCount} / ${TOTAL_CANDLES}`;
  checkLimboWin();
}

function collectBasementKey() {
  basementKey.userData.collected = true;
  scene.remove(basementKey);
  basementKey = null;
  // Show key collected notification
  const hud = document.getElementById('hud');
  const msg = document.createElement('div');
  msg.id = 'key-msg';
  msg.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);color:#ffcc00;font-family:Georgia,serif;font-size:18px;text-shadow:0 0 8px #cc0033;z-index:20;pointer-events:none;';
  msg.textContent = '🗝️ Basement Key Collected! The stairs down are now unlocked.';
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
  // Remove the stairs down blocker
  wallColliders.pop(); // Remove the stairs down pit collider (last added)
  // Remove red railing
  scene.remove(redRailing);
}

// ─── Reusable vectors ─────────────────────────────────────────────────────────
const _fwd        = new THREE.Vector3();
const _right      = new THREE.Vector3();
const _up         = new THREE.Vector3(0, 1, 0);
const _testSphere = new THREE.Sphere(new THREE.Vector3(), 0.3);
const _toCandle   = new THREE.Vector3();

function getFloorHeight(x, y, z) {
  // Stairwell: ramp from ground (0) to 1st floor (4) and up to 2nd floor (8)
  if (x >= 0 && x <= 5 && z >= -11 && z <= -6) {
    const t = (-6 - z) / 5;
    return Math.max(0, Math.min(4, t * 4));
  }
  // Extended stairwell for 2nd floor (past the hole, z from -11 to -15)
  if (x >= 0 && x <= 5 && z >= -15 && z < -11) {
    const t = (-11 - z) / 4;
    return Math.max(4, Math.min(8, 4 + t * 4));
  }
  if (y > 6) return 8;
  if (y > 2) return 4;
  if (y < -2) return -4;
  return 0;
}

// ─── Game loop ────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const dt = timer.getDelta();
  const t  = timer.getElapsed();

  // Hands idle bob
  const bob = Math.sin(t * Math.PI * 2) * 0.02;
  leftHand.position.y  = -0.4  + bob;
  rightHand.position.y = -0.42 + bob;

  // Flashlight bob + sway
  flashlightGroup.position.y = -0.35 + Math.sin(t * Math.PI * 2) * 0.005;
  flashlightGroup.rotation.z = Math.sin(t * Math.PI) * 0.01;

  // Flashlight flicker
  if (flashlightOn) {
    flashSpot.intensity = 2.0 + Math.sin(t * 7) * 0.08 + Math.sin(t * 13) * 0.04;
  }

  // Candle flame flicker
  for (const candle of candles) {
    if (!candle.userData.lit) continue;
    candle.userData.flameMesh.rotation.y += 0.05;
    candle.userData.flameMesh.scale.y = 1.4 + Math.sin(t * 11 + candle.position.x) * 0.1;
  }

  if (!gameStarted || isPaused) { renderer.render(scene, camera); return; }

  // ── Movement + collision ─────────────────────────────────────────────────

  if (isTouchDevice) {
    camera.quaternion.setFromEuler(new THREE.Euler(mobilePitch.value, mobileYaw.value, 0, 'YXZ'));

    if (!movementLocked && (Math.abs(moveState.forward) > 0.01 || Math.abs(moveState.right) > 0.01)) {
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
      const targetFloorY = getFloorHeight(playerObj.position.x, playerObj.position.y, playerObj.position.z);
      const currentFloorY = playerObj.position.y;
      playerObj.position.y = currentFloorY + (targetFloorY - currentFloorY) * 10 * dt;
    }

    hudRoom.textContent = 'Room: ' + getCurrentRoom(playerObj.position.x, playerObj.position.y, playerObj.position.z);

  } else if (controls) {
    if (!movementLocked) {
      const speed = keys.sprint ? WALK_SPEED * SPRINT_MULT : WALK_SPEED;
      const dist  = speed * dt;

      camera.getWorldDirection(_fwd);
      _fwd.y = 0;
      if (_fwd.lengthSq() > 0.0001) _fwd.normalize();
      _right.crossVectors(_fwd, _up).normalize();

      const dx = (_fwd.x * moveState.forward + _right.x * moveState.right) * dist;
      const dz = (_fwd.z * moveState.forward + _right.z * moveState.right) * dist;
      const cx = camera.position.x, cz = camera.position.z;

      _testSphere.center.set(cx + dx, camera.position.y, cz);
      const canX = !wallColliders.some(b => b.intersectsSphere(_testSphere));
      _testSphere.center.set(cx, camera.position.y, cz + dz);
      const canZ = !wallColliders.some(b => b.intersectsSphere(_testSphere));

      camera.position.x += canX ? dx : 0;
      camera.position.z += canZ ? dz : 0;
      
      const targetFloorY = getFloorHeight(camera.position.x, camera.position.y - 1.6, camera.position.z);
      const currentFloorY = camera.position.y - 1.6;
      const nextFloorY = currentFloorY + (targetFloorY - currentFloorY) * 10 * dt;
      camera.position.y = nextFloorY + 1.6;
      
      playerObj.position.set(camera.position.x, nextFloorY, camera.position.z);
    }

    hudRoom.textContent = 'Room: ' + getCurrentRoom(camera.position.x, camera.position.y, camera.position.z);
  }

  // ── Track still-time (used by Penny's vision cone) ───────────────────────
  const isMovingThisFrame = (Math.abs(moveState.forward) > 0.01 || Math.abs(moveState.right) > 0.01);
  if (movementLocked || isMovingThisFrame) {
    timeSinceStoppedMoving = 0;
  } else {
    timeSinceStoppedMoving += dt;
  }

  // ── Enemies AI ─────────────────────────────────────────────────────────────
  if (!movementLocked) {
    let anySeesLia = false;
    for (const enemy of enemies) {
      enemy.update(dt, t);
      if (enemy.checkSeesLia()) anySeesLia = true;
    }
    lastPennySeesLia = anySeesLia;
  } else {
    lastPennySeesLia = false;
  }

  // ── Interact-prompt telegraphing (candles only) ───────────────────────────
  if (movementLocked) {
    interactPrompt.style.display = 'none';
  } else {
    const promptPos = isTouchDevice ? playerObj.position : camera.position;
    camera.getWorldDirection(_fwd);

    let bestCandle = null;
    let bestDist = Infinity;
    if (flashlightOn) {
      for (const candle of candles) {
        if (candle.userData.lit) continue;
        const tc = new THREE.Vector3().subVectors(candle.position, promptPos);
        const d = tc.length();
        if (d > 2.5) continue;
        tc.normalize();
        if (_fwd.dot(tc) < 0.5) continue;
        if (d < bestDist) {
          bestDist = d;
          bestCandle = candle;
        }
      }
    }

    if (bestCandle === null) {
      interactPrompt.style.display = 'none';
    } else {
      interactPrompt.textContent = 'Press E to light candle';
      interactPrompt.style.display = 'block';
    }
  }

  // ── Debug overlay ────────────────────────────────────────────────────────
  const debugEl = document.getElementById('debug-overlay');
  if (debugEl) {
    const pos = isTouchDevice ? playerObj.position : camera.position;
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);



    debugEl.textContent =
      `pos:   x=${pos.x.toFixed(2)} y=${pos.y.toFixed(2)} z=${pos.z.toFixed(2)}\n` +
      `look:  x=${camForward.x.toFixed(2)} z=${camForward.z.toFixed(2)}\n` +
      `flash: ${flashlightOn ? 'ON' : 'off'}\n` +
      `still-time: ${timeSinceStoppedMoving.toFixed(2)}s\n` +



      `penny-sees-lia: ${lastPennySeesLia ? 'true' : 'false'}\n` +
      `candles: ${candleCount}/${TOTAL_CANDLES}\n` +
      `deaths: ${deathCount}\n` +
      `limbo-cleared: ${limboCleared ? 'true' : 'false'}`;
  }

  renderer.render(scene, camera);
}

animate();
