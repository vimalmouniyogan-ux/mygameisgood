/* ======================================================
   NEON STRIKE - REBUILT MULTIPLAYER CLIENT
   Three.js r128 + Socket.IO
====================================================== */

const SERVER_URL = "https://mygameisgood.onrender.com";

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 6000,
  timeout: 25000,
  autoConnect: true
});

socket.on("connect", () => {
  console.log("CONNECTED TO SERVER:", socket.id);

  if (statusText) {
    statusText.textContent = "CONNECTED";
  }

  requestJoin();
});

socket.on("connect_error", (error) => {
  console.error("SERVER CONNECTION ERROR:", error);

  if (statusText) {
    statusText.textContent = "CONNECTION ERROR";
  }
});

socket.on("disconnect", (reason) => {
  console.log("DISCONNECTED:", reason);

  if (statusText) {
    statusText.textContent = "DISCONNECTED";
  }
});

socket.on("joinAccepted", (data) => {
  console.log("JOIN ACCEPTED:", data);

  playerJoined = true;
  joinRequested = false;

  if (statusText) {
    statusText.textContent = "IN ARENA";
  }

  if (startOverlay) {
    startOverlay.style.display = "none";
  }

  try {
    controls.lock();
  } catch (e) {}
});

const $ = id => document.getElementById(id);

const healthValue = $("healthValue");
const scoreValue = $("scoreValue");
const coinsValue = $("coinsValue");
const playerCountValue = $("playerCountValue");
const gunValue = $("gunValue");

const startOverlay = $("startOverlay");
const playButton = $("playButton");

const usernameInput = $("usernameInput");
const statusText = $("statusText");

const damageFlash = $("damageFlash");
const hitMarker = $("hitMarker");
const killMessage = $("killMessage");

const shopButton = $("shopButton");
const shopPanel = $("shopPanel");
const closeShop = $("closeShop");
const shopCoins = $("shopCoins");
const gunList = $("gunList");

const ammoValue = $("ammoValue");
const reserveValue = $("reserveValue");
const reloadText = $("reloadText");

const crosshair = $("crosshair");
const killFeed = $("killFeed");
const scoreboard = $("scoreboard");
const scoreboardList = $("scoreboardList");

/* ======================================================
   STATE
====================================================== */

let localPlayerId = null;
let playerName = "";
let playerJoined = false;
let joinRequested = false;

let health = 100;
let score = 0;
let coins = 0;

let currentGun = "pistol";
let ownedGuns = {
  pistol: true
};

let isShopOpen = false;
let cameraMode = "first";
let isAiming = false;
let firing = false;
let isReloading = false;

let verticalVelocity = 0;
let isGrounded = true;
let isCrouched = false;

let lastShotTime = 0;
let networkTimer = 0;
let scoreOpen = false;
let reloadTimeout = null;

const playerPosition = new THREE.Vector3(0, 2.1, 25);

let yaw = 0;
let pitch = 0;

const otherPlayers = new Map();
const collisionBoxes = [];
const projectiles = [];

const clock = new THREE.Clock();

const movement = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false
};

// ===============================
// MOVEMENT SETTINGS
// ===============================

const WALK_SPEED = 19;
const SPRINT_SPEED = 30;
const CROUCH_SPEED = 9;

const STAND_HEIGHT = 2.1;
const CROUCH_HEIGHT = 1.25;

// Energy system
const MAX_ENERGY = 100;
let energy = MAX_ENERGY;

const SPRINT_DRAIN = 28;     // energy per second
const ENERGY_REGEN = 20;     // energy per second
const REGEN_DELAY = 0.8;

let sprintRegenTimer = 0;

/* ======================================================
   WEAPONS
====================================================== */

const GUNS = {
  pistol: {
    name: "Pistol",
    price: 0,
    damage: 25,
    cooldown: 220,
    magazine: 12,
    reserve: 60,
    reload: 900,
    spread: 0.004,
    color: 0x6d7881,
    automatic: false
  },

  smg: {
    name: "SMG",
    price: 20,
    damage: 15,
    cooldown: 75,
    magazine: 30,
    reserve: 120,
    reload: 1100,
    spread: 0.018,
    color: 0x00e5ff,
    automatic: true
  },

  shotgun: {
    name: "Shotgun",
    price: 40,
    damage: 12,
    cooldown: 700,
    magazine: 6,
    reserve: 36,
    reload: 1400,
    spread: 0.085,
    color: 0xffa52f,
    automatic: false
  },

  rifle: {
    name: "Assault Rifle",
    price: 60,
    damage: 35,
    cooldown: 150,
    magazine: 30,
    reserve: 90,
    reload: 1300,
    spread: 0.01,
    color: 0x62ff75,
    automatic: true
  },

  railgun: {
    name: "Railgun",
    price: 100,
    damage: 80,
    cooldown: 1000,
    magazine: 5,
    reserve: 20,
    reload: 1600,
    spread: 0,
    color: 0xff47ff,
    automatic: false
  }
};

const weaponOrder = [
  "pistol",
  "smg",
  "shotgun",
  "rifle",
  "railgun"
];

const ammoState = {};

for (const [id, weapon] of Object.entries(GUNS)) {
  ammoState[id] = {
    magazine: weapon.magazine,
    reserve: weapon.reserve
  };
}

/* ======================================================
   THREE.JS
====================================================== */

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x02020b);

scene.fog = new THREE.Fog(
  0x02020b,
  55,
  190
);

const camera = new THREE.PerspectiveCamera(
  76,
  innerWidth / innerHeight,
  0.05,
  500
);

camera.position.set(
  playerPosition.x,
  playerPosition.y,
  playerPosition.z
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
  innerWidth,
  innerHeight
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type =
  THREE.PCFSoftShadowMap;

if ("outputEncoding" in renderer) {
  renderer.outputEncoding =
    THREE.sRGBEncoding;
}

$("game").appendChild(renderer.domElement);

const controls =
  new THREE.PointerLockControls(
    camera,
    renderer.domElement
  );

  controls.addEventListener("change", () => {
  yaw = camera.rotation.y;
  pitch = camera.rotation.x;
});

/* ======================================================
   LIGHTING
====================================================== */

scene.add(
  new THREE.AmbientLight(
    0x617aa5,
    0.42
  )
);

const moon =
  new THREE.DirectionalLight(
    0x86a8ff,
    1.1
  );

moon.position.set(
  -30,
  60,
  25
);

moon.castShadow = true;

scene.add(moon);

const lights = [];

function neonLight(
  color,
  x,
  y,
  z,
  intensity = 2.2,
  distance = 28
) {
  const light =
    new THREE.PointLight(
      color,
      intensity,
      distance,
      2
    );

  light.position.set(
    x,
    y,
    z
  );

  scene.add(light);

  lights.push(light);

  return light;
}

neonLight(
  0x00eaff,
  0,
  8,
  0,
  3.2,
  42
);

neonLight(
  0xff16d9,
  -38,
  8,
  -35,
  2.6,
  30
);

neonLight(
  0x7b35ff,
  38,
  8,
  -35,
  2.6,
  30
);

neonLight(
  0x00ff9d,
  -38,
  7,
  35,
  2.3,
  28
);

neonLight(
  0xff245c,
  38,
  7,
  35,
  2.3,
  28
);

/* ======================================================
   MATERIALS
====================================================== */

function mat(
  color,
  roughness = 0.65,
  metalness = 0.2,
  emissive = 0x000000,
  emissiveIntensity = 0
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity
  });
}

const floorMat = mat(
  0x080d16,
  0.7,
  0.5,
  0x001522,
  0.8
);

const wallMat = mat(
  0x101824,
  0.58,
  0.72,
  0x03101c,
  0.7
);

const darkMat = mat(
  0x070b13,
  0.5,
  0.85,
  0x02030a,
  0.6
);

const metalMat = mat(
  0x273449,
  0.28,
  0.9,
  0x051322,
  0.5
);

const glassMat =
  new THREE.MeshStandardMaterial({
    color: 0x102f4a,
    transparent: true,
    opacity: 0.55,
    metalness: 0.6,
    roughness: 0.15,
    emissive: 0x003b55,
    emissiveIntensity: 1.5
  });

const neonC =
  new THREE.MeshBasicMaterial({
    color: 0x00eaff
  });

const neonM =
  new THREE.MeshBasicMaterial({
    color: 0xff18dc
  });

const neonG =
  new THREE.MeshBasicMaterial({
    color: 0x56ff89
  });

const neonP =
  new THREE.MeshBasicMaterial({
    color: 0x874cff
  });

/* ======================================================
   MAP
====================================================== */

function addCollisionBox(
  x,
  y,
  z,
  w,
  h,
  d
) {
  collisionBoxes.push({
    minX: x - w / 2,
    maxX: x + w / 2,

    minY: y,
    maxY: y + h,

    minZ: z - d / 2,
    maxZ: z + d / 2
  });
}

function addBox(
  x,
  y,
  z,
  w,
  h,
  d,
  material = wallMat,
  collide = true
) {
  const mesh =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        w,
        h,
        d
      ),
      material
    );

  mesh.position.set(
    x,
    y + h / 2,
    z
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);

  if (collide) {
    addCollisionBox(
      x,
      y,
      z,
      w,
      h,
      d
    );
  }

  return mesh;
}

function strip(
  x,
  y,
  z,
  w,
  h,
  d,
  material,
  rotation = 0
) {
  const mesh =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        w,
        h,
        d
      ),
      material
    );

  mesh.position.set(
    x,
    y,
    z
  );

  mesh.rotation.y =
    rotation;

  scene.add(mesh);

  return mesh;
}

function tower(
  x,
  z,
  w,
  d,
  h,
  color
) {
  addBox(
    x,
    0,
    z,
    w,
    h,
    d,
    darkMat,
    true
  );

  const glass =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        w + 0.05,
        h * 0.72,
        d + 0.05
      ),
      glassMat
    );

  glass.position.set(
    x,
    h * 0.58,
    z
  );

  scene.add(glass);

  for (
    let y = 2;
    y < h;
    y += 2.4
  ) {
    strip(
      x - w / 2 - 0.04,
      y,
      z,
      0.12,
      0.09,
      d + 0.3,
      color
    );

    strip(
      x + w / 2 + 0.04,
      y,
      z,
      0.12,
      0.09,
      d + 0.3,
      color
    );
  }

  strip(
    x,
    h + 0.18,
    z,
    w + 0.4,
    0.18,
    0.16,
    color
  );

  for (
    let i = -1;
    i <= 1;
    i++
  ) {
    strip(
      x + i * (w * 0.3),
      h + 1.2,
      z,
      0.08,
      0.9,
      0.08,
      color
    );
  }
}

function pillar(
  x,
  z,
  color
) {
  addBox(
    x,
    0,
    z,
    2.2,
    9,
    2.2,
    metalMat,
    true
  );

  strip(
    x,
    4.5,
    z,
    2.35,
    0.13,
    2.35,
    color
  );

  strip(
    x,
    8.2,
    z,
    2.35,
    0.13,
    2.35,
    color
  );
}

/* Floor */

addBox(
  0,
  -0.5,
  0,
  120,
  1,
  120,
  floorMat,
  false
);

/* Neon grid */

for (
  let i = -60;
  i <= 60;
  i += 6
) {
  strip(
    i,
    0.025,
    0,
    0.035,
    0.04,
    120,
    i % 12 === 0
      ? neonC
      : new THREE.MeshBasicMaterial({
          color: 0x14243a
        })
  );

  strip(
    0,
    0.026,
    i,
    120,
    0.04,
    0.035,
    i % 12 === 0
      ? neonM
      : new THREE.MeshBasicMaterial({
          color: 0x14243a
        })
  );
}

/* Outer walls */

addBox(
  0,
  0,
  -60,
  120,
  10,
  1.2,
  wallMat,
  true
);

addBox(
  0,
  0,
  60,
  120,
  10,
  1.2,
  wallMat,
  true
);

addBox(
  -60,
  0,
  0,
  1.2,
  10,
  120,
  wallMat,
  true
);

addBox(
  60,
  0,
  0,
  1.2,
  10,
  120,
  wallMat,
  true
);

/* Wall lights */

for (
  let x = -54;
  x <= 54;
  x += 12
) {
  strip(
    x,
    5,
    -59.32,
    7,
    0.16,
    0.08,
    x % 24 === 0
      ? neonC
      : neonM
  );

  strip(
    x,
    5,
    59.32,
    7,
    0.16,
    0.08,
    x % 24 === 0
      ? neonM
      : neonC
  );
}

for (
  let z = -54;
  z <= 54;
  z += 12
) {
  strip(
    -59.32,
    5,
    z,
    0.08,
    0.16,
    7,
    neonP
  );

  strip(
    59.32,
    5,
    z,
    0.08,
    0.16,
    7,
    neonG
  );
}

/* Four cyber towers */

tower(
  -42,
  -38,
  17,
  16,
  13,
  neonC
);

tower(
  42,
  -38,
  17,
  16,
  13,
  neonM
);

tower(
  -42,
  38,
  17,
  16,
  13,
  neonG
);

tower(
  42,
  38,
  17,
  16,
  13,
  neonP
);

/* Central arena */

addBox(
  0,
  0,
  -18,
  30,
  5,
  3,
  metalMat,
  true
);

strip(
  0,
  5.08,
  -18,
  30,
  0.2,
  0.16,
  neonC
);

addBox(
  -16,
  0,
  -7,
  3,
  7,
  20,
  wallMat,
  true
);

addBox(
  16,
  0,
  -7,
  3,
  7,
  20,
  wallMat,
  true
);

strip(
  -14.42,
  3.5,
  -7,
  0.12,
  7,
  20,
  neonM
);

strip(
  14.42,
  3.5,
  -7,
  0.12,
  7,
  20,
  neonC
);

/* Reactor */

const reactor =
  new THREE.Group();

scene.add(reactor);

reactor.position.set(
  0,
  0,
  7
);

const reactorBase =
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      5,
      5,
      0.7,
      32
    ),
    metalMat
  );

reactorBase.position.y =
  0.35;

reactor.add(
  reactorBase
);

const reactorCore =
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      2.2,
      2.2,
      5,
      20
    ),
    new THREE.MeshBasicMaterial({
      color: 0x00eaff,
      transparent: true,
      opacity: 0.72
    })
  );

reactorCore.position.y =
  3;

reactor.add(
  reactorCore
);

for (
  let i = 0;
  i < 4;
  i++
) {
  const ring =
    new THREE.Mesh(
      new THREE.TorusGeometry(
        3.1,
        0.08,
        8,
        48
      ),
      i % 2
        ? neonM
        : neonC
    );

  ring.rotation.x =
    Math.PI / 2;

  ring.position.y =
    3;

  ring.rotation.z =
    i * Math.PI / 4;

  reactor.add(ring);
}

neonLight(
  0x00eaff,
  0,
  4,
  7,
  3,
  18
);

/* Side cover */

const covers = [
  [-30, 2, 13, 2, 3, neonM],
  [30, 2, 13, 2, 3, neonC],
  [-8, 22, 12, 2, 3, neonP],
  [8, 22, 12, 2, 3, neonG],
  [-27, -15, 6, 4, 3, neonM],
  [27, -15, 6, 4, 3, neonC],
  [-24, 24, 7, 4, 4, neonP],
  [24, 24, 7, 4, 4, neonG]
];

for (
  const [x, z, w, d, h, color]
  of covers
) {
  addBox(
    x,
    0,
    z,
    w,
    h,
    d,
    metalMat,
    true
  );

  strip(
    x,
    h + 0.05,
    z,
    w + 0.2,
    0.12,
    0.12,
    color
  );
}

/* Pylons
