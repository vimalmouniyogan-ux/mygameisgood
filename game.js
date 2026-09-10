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
  timeout: 25000
});

const $ = id => document.getElementById(id);

const healthValue = $("healthValue");
const scoreValue = $("scoreValue");
const coinsValue = $("coinsValue");
const playerCountValue = $("playerCountValue");
const gunValue = $("gunValue");

const startOverlay = $("startOverlay");
const playButton = $("playButton");
const firstPersonButton =
  $("firstPersonButton");

const thirdPersonButton =
  $("thirdPersonButton");firstPersonButton.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    cameraMode = "first";

    firstPersonButton.classList.add("active");
    thirdPersonButton.classList.remove("active");

    applyGunVisual();
  }
);

thirdPersonButton.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    cameraMode = "third";

    thirdPersonButton.classList.add("active");
    firstPersonButton.classList.remove("active");

    applyGunVisual();
  }
);
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

const playerPosition = new THREE.Vector3(0, 2.1, 45);

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

/* Pylons */

pillar(
  -21,
  -28,
  neonC
);

pillar(
  21,
  -28,
  neonM
);

pillar(
  -21,
  28,
  neonG
);

pillar(
  21,
  28,
  neonP
);

/* ======================================================
   PLAYER AVATARS
====================================================== */

function makeNameTag(
  username,
  health = 100
) {
  const canvas =
    document.createElement("canvas");

  canvas.width = 512;
  canvas.height = 128;

  const ctx =
    canvas.getContext("2d");

  function draw() {
    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.fillStyle =
      "rgba(3,8,15,.85)";

    ctx.roundRect?.(
      10,
      10,
      492,
      108,
      18
    );

    if (!ctx.roundRect) {
      ctx.fillRect(
        10,
        10,
        492,
        108
      );
    }

    ctx.fill();

    ctx.strokeStyle =
      "#00eaff";

    ctx.lineWidth = 4;

    ctx.strokeRect(
      10,
      10,
      492,
      108
    );

    ctx.fillStyle =
      "#ffffff";

    ctx.font =
      "bold 38px Arial";

    ctx.textAlign =
      "center";

    ctx.fillText(
      username,
      256,
      54
    );

    ctx.fillStyle =
      "#111923";

    ctx.fillRect(
      70,
      76,
      372,
      18
    );

    ctx.fillStyle =
      health > 50
        ? "#3dff88"
        : health > 25
          ? "#ffd45a"
          : "#ff4d69";

    ctx.fillRect(
      70,
      76,
      372 * Math.max(
        0,
        health / 100
      ),
      18
    );
  }

  draw();

  const texture =
    new THREE.CanvasTexture(
      canvas
    );

  texture.needsUpdate = true;

  const material =
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

  const sprite =
    new THREE.Sprite(
      material
    );

  sprite.scale.set(
    3.8,
    0.95,
    1
  );

  sprite.position.y =
    3.15;

  return {
    sprite,
    canvas,
    ctx,
    texture,
    draw
  };
}

function createGunModel(
  gunId,
  thirdPerson = true
) {
  const weapon =
    GUNS[gunId] ||
    GUNS.pistol;

  const group =
    new THREE.Group();

  const bodyMaterial =
    new THREE.MeshStandardMaterial({
      color: weapon.color,
      metalness: 0.8,
      roughness: 0.28,
      emissive: weapon.color,
      emissiveIntensity: 0.18
    });

  const dark =
    new THREE.MeshStandardMaterial({
      color: 0x090e16,
      metalness: 0.95,
      roughness: 0.22
    });

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.25,
        0.2,
        0.9
      ),
      bodyMaterial
    );

  group.add(body);

  const barrel =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.045,
        0.06,
        0.75,
        10
      ),
      dark
    );

  barrel.rotation.x =
    Math.PI / 2;

  barrel.position.z =
    -0.75;

  group.add(barrel);

  const rail =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.06,
        0.045,
        0.65
      ),
      new THREE.MeshBasicMaterial({
        color: weapon.color
      })
    );

  rail.position.y =
    0.13;

  rail.position.z =
    -0.25;

  group.add(rail);

  if (thirdPerson) {
    group.scale.set(
      1.2,
      1.2,
      1.2
    );
  }

  return group;
}

function createPlayerAvatar(
  id,
  username,
  isLocal = false
) {
  const group =
    new THREE.Group();

  const bodyMaterial =
    new THREE.MeshStandardMaterial({
      color: isLocal
        ? 0x126d91
        : 0x28394d,
      metalness: 0.65,
      roughness: 0.3,
      emissive: isLocal
        ? 0x003c55
        : 0x07101d,
      emissiveIntensity: 0.8
    });

  const armorMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x182432,
      metalness: 0.9,
      roughness: 0.24
    });

  const visorMaterial =
    new THREE.MeshBasicMaterial({
      color: isLocal
        ? 0x00eaff
        : 0xff18dc
    });

  /* Torso */

  const torso =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.95,
        1.05,
        0.55
      ),
      bodyMaterial
    );

  torso.position.y =
    1.35;

  group.add(torso);

  /* Chest armor */

  const chest =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.7,
        0.48,
        0.61
      ),
      armorMaterial
    );

  chest.position.set(
    0,
    1.48,
    -0.02
  );

  group.add(chest);

  /* Core */

  const core =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.2,
        0.22,
        0.04
      ),
      new THREE.MeshBasicMaterial({
        color: 0x00eaff
      })
    );

  core.position.set(
    0,
    1.52,
    -0.34
  );

  group.add(core);

  /* Head */

  const head =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.34,
        16,
        12
      ),
      bodyMaterial
    );

  head.position.y =
    2.15;

  group.add(head);

  /* Helmet */

  const helmet =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.37,
        16,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.58
      ),
      armorMaterial
    );

  helmet.position.y =
    2.18;

  group.add(helmet);

  /* Visor */

  const visor =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.48,
        0.17,
        0.06
      ),
      visorMaterial
    );

  visor.position.set(
    0,
    2.15,
    -0.32
  );

  group.add(visor);

  /* Arms */

  function createArm(
    side
  ) {
    const shoulder =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.19,
          10,
          8
        ),
        armorMaterial
      );

    shoulder.position.set(
      side * 0.63,
      1.62,
      0
    );

    group.add(shoulder);

    const arm =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.13,
          0.15,
          0.72,
          8
        ),
        bodyMaterial
      );

    arm.position.set(
      side * 0.67,
      1.15,
      0
    );

    group.add(arm);

    return arm;
  }

  createArm(-1);
  const rightArm =
    createArm(1);

  /* Legs */

  for (
    const side of [-1, 1]
  ) {
    const leg =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.16,
          0.19,
          0.9,
          8
        ),
        bodyMaterial
      );

    leg.position.set(
      side * 0.27,
      0.48,
      0
    );

    group.add(leg);

    const boot =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.34,
          0.22,
          0.52
        ),
        armorMaterial
      );

    boot.position.set(
      side * 0.27,
      0.08,
      -0.08
    );

    group.add(boot);
  }

  /* Shoulder lights */

  const shoulderLight =
    new THREE.MeshBasicMaterial({
      color:
        isLocal
          ? 0x00eaff
          : 0xff18dc
    });

  const lightL =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.3,
        0.05,
        0.1
      ),
      shoulderLight
    );

  lightL.position.set(
    -0.63,
    1.67,
    -0.03
  );

  group.add(lightL);

  const lightR =
    lightL.clone();

  lightR.position.x =
    0.63;

  group.add(lightR);

  /* Gun */

  const weapon =
    createGunModel(
      currentGun,
      true
    );

  weapon.position.set(
    0.75,
    1.15,
    -0.3
  );

  weapon.rotation.y =
    Math.PI;

  group.add(weapon);

  /* Name */

  const tag =
    makeNameTag(
      username,
      100
    );

  group.add(
    tag.sprite
  );

  group.userData = {
    id,
    username,
    isLocal,
    health: 100,
    score: 0,
    tag,
    gun: weapon
  };

  scene.add(group);

  return group;
}

/* ======================================================
   LOCAL GUN
====================================================== */

const gun =
  new THREE.Group();

camera.add(gun);

const gunBodyMat =
  mat(
    0x5d6977,
    0.28,
    0.9
  );

const gunDarkMat =
  mat(
    0x0a1018,
    0.2,
    0.95
  );

const gunGlowMat =
  new THREE.MeshBasicMaterial({
    color: 0x00eaff
  });

const gunBody =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.28,
      0.2,
      0.85
    ),
    gunBodyMat
  );

gunBody.position.set(
  0,
  0,
  -0.42
);

gun.add(gunBody);

const gunBarrel =
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.055,
      0.065,
      0.82,
      10
    ),
    gunDarkMat
  );

gunBarrel.rotation.x =
  Math.PI / 2;

gunBarrel.position.set(
  0,
  0.02,
  -0.95
);

gun.add(gunBarrel);

const gunRail =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.055,
      0.045,
      0.7
    ),
    gunGlowMat
  );

gunRail.position.set(
  0,
  0.13,
  -0.55
);

gun.add(gunRail);

const gunHandle =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.16,
      0.38,
      0.18
    ),
    gunBodyMat
  );

gunHandle.position.set(
  0,
  -0.22,
  -0.22
);

gunHandle.rotation.x =
  -0.18;

gun.add(gunHandle);

const muzzlePoint =
  new THREE.Object3D();

muzzlePoint.position.set(
  0,
  0,
  -1.36
);

gun.add(
  muzzlePoint
);

const muzzleFlash =
  new THREE.PointLight(
    0xffd166,
    0,
    5
  );

muzzlePoint.add(
  muzzleFlash
);

const gunBasePosition =
  new THREE.Vector3(
    0.48,
    -0.32,
    -0.72
  );

let gunRecoil = 0;

function applyGunVisual() {
  const weapon =
    GUNS[currentGun];

  if (!weapon) return;

  gunBodyMat.color.setHex(
    weapon.color
  );

  gunGlowMat.color.setHex(
    weapon.color
  );

  gun.position.copy(
    gunBasePosition
  );

  gun.rotation.set(
    0,
    0,
    0
  );

  gun.visible =
    cameraMode === "first";

  gunValue.textContent =
    weapon.name.toUpperCase();

  updateAmmoHUD();

  const local =
    otherPlayers.get(
      localPlayerId
    );

  if (
    local &&
    local.userData
  ) {
    if (local.userData.gun) {
      local.remove(
        local.userData.gun
      );
    }

    const newGun =
      createGunModel(
        currentGun,
        true
      );

    newGun.position.set(
      0.75,
      1.15,
      -0.3
    );

    newGun.rotation.y =
      Math.PI;

    local.add(
      newGun
    );

    local.userData.gun =
      newGun;
  }
}

/* ======================================================
   HUD
====================================================== */

function updateHUD() {
  healthValue.textContent =
    Math.max(
      0,
      Math.round(health)
    );

  scoreValue.textContent =
    score;

  coinsValue.textContent =
    coins;

  playerCountValue.textContent =
    Math.max(
      1,
      otherPlayers.size
    );

  gunValue.textContent =
    GUNS[currentGun]
      ?.name
      .toUpperCase() ||
    "PISTOL";

  updateAmmoHUD();
}

function updateAmmoHUD() {
  const ammo =
    ammoState[currentGun];

  if (!ammo) return;

  ammoValue.textContent =
    ammo.magazine;

  reserveValue.textContent =
    "/ " + ammo.reserve;

  reloadText.style.opacity =
    isReloading ? "1" : "0";
}

/* ======================================================
   COLLISION
====================================================== */

function collides(
  position,
  radius = 0.65
) {
  if (
    position.x < -58 ||
    position.x > 58 ||
    position.z < -58 ||
    position.z > 58
  ) {
    return true;
  }

  for (
    const box of collisionBoxes
  ) {
    if (
      position.x + radius > box.minX &&
      position.x - radius < box.maxX &&
      position.z + radius > box.minZ &&
      position.z - radius < box.maxZ
    ) {
      return true;
    }
  }

  return false;
}

function updateMovement(delta) {

  if (
    !controls.isLocked ||
    !playerJoined ||
    isShopOpen
  ) return;

  const dir = new THREE.Vector3();

  // WASD
  if (movement.forward)  dir.z -= 1; // W = forward
  if (movement.backward) dir.z += 1; // S = backward
  if (movement.left)     dir.x -= 1; // A = left
  if (movement.right)    dir.x += 1; // D = right

  if (dir.lengthSq() > 0) {

    dir.normalize();

    // Convert local movement to world movement
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    const worldX =
      dir.x * cosYaw -
      dir.z * sinYaw;

    const worldZ =
      dir.x * sinYaw +
      dir.z * cosYaw;

    const speed =
      movement.sprint
        ? 28
        : (isCrouched ? 10 : 19);

    const step =
      speed * delta;

    // X collision
    const nextX =
      playerPosition.clone();

    nextX.x += worldX * step;

    if (!collides(nextX)) {
      playerPosition.x = nextX.x;
    }

    // Z collision
    const nextZ =
      playerPosition.clone();

    nextZ.z += worldZ * step;

    if (!collides(nextZ)) {
      playerPosition.z = nextZ.z;
    }
  }

  // Gravity
  verticalVelocity -= 28 * delta;

  playerPosition.y +=
    verticalVelocity * delta;

  if (playerPosition.y <= 2.1) {

    playerPosition.y = 2.1;
    verticalVelocity = 0;
    isGrounded = true;

  } else {

    isGrounded = false;
  }

  // Network update
  networkTimer += delta;

  if (networkTimer >= 0.05) {

    networkTimer = 0;

    socket.emit("playerMove", {
      position: {
        x: playerPosition.x,
        y: playerPosition.y,
        z: playerPosition.z
      },

      rotation: {
        x: pitch,
        y: yaw,
        z: 0
      }
    });
  }
}

addEventListener("keydown", e => {

  if (isShopOpen) return;

  const k =
    e.key.toLowerCase();

  if (k === "w")
    movement.forward = true;

  if (k === "s")
    movement.backward = true;

  if (k === "a")
    movement.left = true;

  if (k === "d")
    movement.right = true;

  if (k === "shift")
    movement.sprint = true;

  if (k === "c")
    movement.crouch = true;

  if (
    k === " " &&
    controls.isLocked &&
    isGrounded
  ) {

    e.preventDefault();

    verticalVelocity =
      10;

    isGrounded =
      false;
  }
});

addEventListener("keyup", e => {

  const k =
    e.key.toLowerCase();

  if (k === "w")
    movement.forward = false;

  if (k === "s")
    movement.backward = false;

  if (k === "a")
    movement.left = false;

  if (k === "d")
    movement.right = false;

  if (k === "shift")
    movement.sprint = false;

  if (k === "c")
    movement.crouch = false;
});

/* ======================================================
   CAMERA
====================================================== */

function updateCamera() {
  if (!playerJoined) return;

  if (cameraMode === "first") {
    camera.position.set(
      playerPosition.x,
      playerPosition.y,
      playerPosition.z
    );

    gun.visible = true;
    return;
  }

  // THIRD PERSON
  const cameraDistance = 3.5;

  const behind = new THREE.Vector3(
    Math.sin(yaw),
    0,
    Math.cos(yaw)
  );

  const desired = new THREE.Vector3(
    playerPosition.x + behind.x * cameraDistance,
    playerPosition.y + 1.7,
    playerPosition.z + behind.z * cameraDistance
  );

  // Keep camera from going underground
  desired.y = Math.max(desired.y, 1.8);

  camera.position.lerp(
    desired,
    0.18
  );

  // Keep the camera looking where the player is aiming
  const lookTarget = new THREE.Vector3(
    playerPosition.x,
    playerPosition.y + 1.35,
    playerPosition.z
  );

  const lookDirection =
    new THREE.Vector3()
      .subVectors(
        lookTarget,
        camera.position
      )
      .normalize();

  const targetYaw =
    Math.atan2(
      -lookDirection.x,
      -lookDirection.z
    );

  const targetPitch =
    Math.asin(
      THREE.MathUtils.clamp(
        lookDirection.y,
        -1,
        1
      )
    );

  camera.rotation.order = "YXZ";

  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  gun.visible = false;
}

/* ======================================================
   CAMERA MODE
====================================================== */

function toggleCameraMode() {
  if (
    !playerJoined ||
    isShopOpen
  ) {
    return;
  }

  cameraMode =
    cameraMode === "first"
      ? "third"
      : "first";

  applyGunVisual();
  
  const localAvatar =
  otherPlayers.get(localPlayerId);

if (localAvatar) {
  localAvatar.visible =
    cameraMode === "third";
}

  addFeed(
    "CAMERA",
    cameraMode === "first"
      ? "FIRST PERSON"
      : "THIRD PERSON",
    false
  );
}

/* ======================================================
   SHOOTING
====================================================== */

function getAimDirection() {
  const direction =
    new THREE.Vector3(
      0,
      0,
      -1
    );

  direction.applyEuler(
    camera.rotation
  );

  direction.normalize();

  const weapon =
    GUNS[currentGun];

  if (
    weapon &&
    weapon.spread > 0
  ) {
    direction.x +=
      (Math.random() - 0.5) *
      weapon.spread;

    direction.y +=
      (Math.random() - 0.5) *
      weapon.spread;

    direction.z +=
      (Math.random() - 0.5) *
      weapon.spread;

    direction.normalize();
  }

  return direction;
}

function shoot() {
  if (
    !playerJoined ||
    isShopOpen ||
    !controls.isLocked ||
    isReloading
  ) {
    return;
  }

  const weapon =
    GUNS[currentGun];

  const ammo =
    ammoState[currentGun];

  if (!weapon || !ammo)
    return;

  if (
    ammo.magazine <= 0
  ) {
    reload();
    return;
  }

  const now =
    performance.now();

  if (
    now - lastShotTime <
    weapon.cooldown
  ) {
    return;
  }

  lastShotTime = now;

  ammo.magazine--;

  updateAmmoHUD();

  const direction =
    getAimDirection();

  const origin =
    new THREE.Vector3();

 if (cameraMode === "first") {
  // First-person: fire from the camera/gun
  origin.copy(camera.position);

  const muzzleWorld =
    new THREE.Vector3();

  muzzlePoint.getWorldPosition(
    muzzleWorld
  );

  origin.copy(muzzleWorld);
} else {
  // Third-person: fire from the player's chest/gun height
  origin.set(
    playerPosition.x,
    playerPosition.y +
      (isCrouched ? 1.15 : 1.45),
    playerPosition.z
  );
}

  socket.emit(
    "shoot",
    {
      origin: {
        x: origin.x,
        y: origin.y,
        z: origin.z
      },

      direction: {
        x: direction.x,
        y: direction.y,
        z: direction.z
      },

      gunId: currentGun
    }
  );

  createTracer(
    origin,
    direction,
    weapon.color
  );

  gunRecoil = 0.08;

  muzzleFlash.intensity =
    4;

  setTimeout(() => {
    muzzleFlash.intensity =
      0;
  }, 45);
}

/* ======================================================
   RELOAD
====================================================== */

function reload() {
  if (
    isReloading ||
    !playerJoined ||
    isShopOpen
  ) {
    return;
  }

  const weapon =
    GUNS[currentGun];

  const ammo =
    ammoState[currentGun];

  if (
    ammo.magazine >=
      weapon.magazine ||
    ammo.reserve <= 0
  ) {
    return;
  }

  isReloading = true;

  updateAmmoHUD();

  clearTimeout(
    reloadTimeout
  );

  reloadTimeout =
    setTimeout(() => {
      const needed =
        weapon.magazine -
        ammo.magazine;

      const amount =
        Math.min(
          needed,
          ammo.reserve
        );

      ammo.magazine +=
        amount;

      ammo.reserve -=
        amount;

      isReloading = false;

      updateAmmoHUD();
    }, weapon.reload);
}

/* ======================================================
   TRACER
====================================================== */

function createTracer(
  origin,
  direction,
  color
) {
  const length = 90;

  const end =
    origin.clone().add(
      direction
        .clone()
        .multiplyScalar(length)
    );

  const geometry =
    new THREE.BufferGeometry()
      .setFromPoints([
        origin,
        end
      ]);

  const material =
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8
    });

  const line =
    new THREE.Line(
      geometry,
      material
    );

  scene.add(line);

  projectiles.push({
    mesh: line,
    life: 0.045
  });
}

/* ======================================================
   REMOTE PLAYERS
====================================================== */

function addRemotePlayer(
  data
) {
  if (
    !data ||
    !data.id ||
    data.id === localPlayerId
  ) {
    return;
  }

  removeRemotePlayer(
    data.id
  );

  const avatar =
    createPlayerAvatar(
      data.id,
      data.username ||
        "Player",
      false
    );

  avatar.position.set(
    data.position.x,
    0,
    data.position.z
  );

  avatar.rotation.y =
    data.rotation?.y || 0;

  avatar.userData.health =
    data.health ?? 100;

  avatar.userData.score =
    data.score ?? 0;

  avatar.userData.tag.draw();

  otherPlayers.set(
    data.id,
    avatar
  );

  updateHUD();
}

function removeRemotePlayer(
  id
) {
  const avatar =
    otherPlayers.get(id);

  if (!avatar)
    return;

  scene.remove(
    avatar
  );

  otherPlayers.delete(
    id
  );

  updateHUD();
}

function updateRemotePlayer(
  data
) {
  if (
    !data ||
    data.id === localPlayerId
  ) {
    return;
  }

  let avatar =
    otherPlayers.get(
      data.id
    );

  if (!avatar) {
    addRemotePlayer(
      data
    );

    avatar =
      otherPlayers.get(
        data.id
      );
  }

  if (!avatar)
    return;

  avatar.position.x =
    THREE.MathUtils.lerp(
      avatar.position.x,
      data.position.x,
      0.45
    );

  avatar.position.z =
    THREE.MathUtils.lerp(
      avatar.position.z,
      data.position.z,
      0.45
    );

  avatar.rotation.y =
    THREE.MathUtils.lerp(
      avatar.rotation.y,
      data.rotation?.y || 0,
      0.45
    );

  avatar.userData.health =
    data.health ?? 100;

  avatar.userData.score =
    data.score ?? 0;

  avatar.userData.tag.draw();
}

function updateRemotePlayers(
  delta
) {
  for (
    const avatar
    of otherPlayers.values()
  ) {
    avatar.userData.tag.sprite.lookAt(
      camera.position
    );
  }
}

/* ======================================================
   FEED
====================================================== */

function addFeed(
  label,
  text,
  kill = false
) {
  const item =
    document.createElement(
      "div"
    );

  item.className =
    "feedItem";

  item.textContent =
    `${label}: ${text}`;

  if (kill) {
    item.style.borderColor =
      "rgba(255,70,100,.35)";
  }

  killFeed.prepend(
    item
  );

  setTimeout(() => {
    item.style.opacity =
      "0";

    setTimeout(() => {
      item.remove();
    }, 400);
  }, 3000);
}

function showKillMessage(
  text
) {
  killMessage.textContent =
    text;

  killMessage.style.opacity =
    "1";

  setTimeout(() => {
    killMessage.style.opacity =
      "0";
  }, 900);
}

/* ======================================================
   SHOP
====================================================== */

function openGunShop() {
  if (!playerJoined || isShopOpen) {
    return;
  }

  isShopOpen = true;
  firing = false;
  isAiming = false;

  if (controls.isLocked) {
    controls.unlock();
  }

  renderer.domElement.style.cursor = "default";

  startOverlay.style.display = "none";

  renderShop();
  shopPanel.style.display = "block";
}

function closeGunShop() {
  if (!isShopOpen) {
    return;
  }

  isShopOpen = false;

  shopPanel.style.display = "none";

  renderer.domElement.style.cursor = "default";

  startOverlay.style.display = "flex";

  playButton.textContent = "RESUME";

  statusText.textContent =
    "Click RESUME to return to the match";
}

function renderShop() {
  shopCoins.textContent =
    "Coins: " + coins;

  gunList.innerHTML = "";

  for (
    const gunId
    of weaponOrder
  ) {
    const weapon =
      GUNS[gunId];

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "gunCard";

    const owned =
      !!ownedGuns[gunId];

    const equipped =
      currentGun === gunId;

    card.innerHTML = `
      <div class="gunTop">
        <div>
          <div class="gunName">
            ${weapon.name}
          </div>

          <div class="gunStats">
            Damage: ${weapon.damage}
            · Fire rate: ${Math.round(
              60000 /
              weapon.cooldown
            )}/min
            · Magazine: ${
              weapon.magazine
            }
            <br>
            ${
              weapon.price === 0
                ? "FREE"
                : "Price: " +
                  weapon.price +
                  " coins"
            }
          </div>
        </div>

        <button class="gunAction ${
          equipped
            ? "equippedButton"
            : owned
              ? "equipButton"
              : "buyButton"
        }">
          ${
            equipped
              ? "EQUIPPED"
              : owned
                ? "EQUIP"
                : "BUY"
          }
        </button>
      </div>
    `;

    const button =
      card.querySelector(
        "button"
      );

    button.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        if (equipped)
          return;

        if (owned) {
          socket.emit(
            "equipGun",
            gunId
          );
        } else {
          socket.emit(
            "buyGun",
            gunId
          );
        }
      }
    );

    gunList.appendChild(
      card
    );
  }
}

/* ======================================================
   SCOREBOARD
====================================================== */

function renderScoreboard() {
  scoreboardList.innerHTML =
    "";

  const all = [
    {
      username:
        playerName,
      score,
      health,
      id:
        localPlayerId
    },

    ...Array.from(
      otherPlayers.values()
    ).map(
      avatar => ({
        username:
          avatar.userData.username,
        score:
          avatar.userData.score,
        health:
          avatar.userData.health,
        id:
          avatar.userData.id
      })
    )
  ];

  all.sort(
    (a, b) =>
      b.score - a.score
  );

  all.forEach(
    (player, index) => {
      const row =
        document.createElement(
          "div"
        );

      row.className =
        "scoreRow";

      row.innerHTML = `
        <div>
          ${index + 1}
        </div>

        <div>
          ${player.username}
        </div>

        <div>
          ${player.score}
        </div>

        <div>
          ${Math.max(
            0,
            Math.round(
              player.health
            )
          )}
        </div>
      `;

      scoreboardList.appendChild(
        row
      );
    }
  );
}

/* ======================================================
   INPUT
====================================================== */

window.addEventListener(
  "keydown",
  event => {
    if (
      event.target ===
      usernameInput
    ) {
      return;
    }

    if (isShopOpen) {
      return;
    }

    const key =
      event.key.toLowerCase();

    if (key === "w")
      movement.forward = true;

    if (key === "s")
      movement.backward = true;

    if (key === "a")
      movement.left = true;

    if (key === "d")
      movement.right = true;

    if (
      event.key === "Shift"
    ) {
      movement.sprint =
        true;
    }

    if (
      event.code ===
      "Space"
    ) {
      event.preventDefault();

      if (
        isGrounded &&
        controls.isLocked
      ) {
        verticalVelocity =
          10;

        isGrounded = false;
      }
    }

    if (key === "c") {
      movement.crouch =
        true;
    }

    if (key === "r") {
      reload();
    }

    if (key === "v") {
      toggleCameraMode();
    }

    if (key === "b") {
      openGunShop();
    }

    if (
      event.key === "Tab"
    ) {
      event.preventDefault();

      scoreOpen = true;

      scoreboard.style.display =
        "block";

      renderScoreboard();
    }

    if (
      /^[1-5]$/.test(
        event.key
      )
    ) {
      const index =
        Number(event.key) - 1;

      const gunId =
        weaponOrder[index];

      if (
        ownedGuns[gunId]
      ) {
        currentGun =
          gunId;

        applyGunVisual();
      }
    }
  }
);

window.addEventListener(
  "keyup",
  event => {
    const key =
      event.key.toLowerCase();

    if (key === "w")
      movement.forward = false;

    if (key === "s")
      movement.backward = false;

    if (key === "a")
      movement.left = false;

    if (key === "d")
      movement.right = false;

    if (
      event.key === "Shift"
    ) {
      movement.sprint =
        false;
    }

    if (key === "c") {
      movement.crouch =
        false;
    }

    if (
      event.key === "Tab"
    ) {
      scoreOpen = false;

      scoreboard.style.display =
        "none";
    }
  }
);

window.addEventListener(
  "mousedown",
  event => {
    if (
      isShopOpen ||
      !playerJoined ||
      !controls.isLocked
    ) {
      return;
    }

    if (
      event.button === 0
    ) {
      firing = true;

      shoot();
    }

    if (
      event.button === 2
    ) {
      isAiming = true;

      crosshair.classList.add(
        "scoped"
      );

      camera.fov = 62;

      camera.updateProjectionMatrix();
    }
  }
);

window.addEventListener(
  "mouseup",
  event => {
    if (
      event.button === 0
    ) {
      firing = false;
    }

    if (
      event.button === 2
    ) {
      isAiming = false;

      crosshair.classList.remove(
        "scoped"
      );

      camera.fov = 76;

      camera.updateProjectionMatrix();
    }
  }
);

window.addEventListener(
  "contextmenu",
  event => {
    event.preventDefault();
  }
);

/* ======================================================
   SHOP EVENTS
====================================================== */

shopButton.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    if (isShopOpen) {
      closeGunShop();
    } else {
      openGunShop();
    }
  }
);

shopPanel.addEventListener(
  "mousedown",
  event => {
    event.stopPropagation();
  }
);

shopPanel.addEventListener(
  "click",
  event => {
    event.stopPropagation();
  }
);

closeShop.addEventListener(
  "click",
  event => {
    event.stopPropagation();

    closeGunShop();
  }
);

/* ======================================================
   PLAY / RESUME
====================================================== */

playButton.addEventListener(
  "click",
  () => {
    if (
      playerJoined
    ) {
      startOverlay.style.display =
        "none";

      playButton.textContent =
        "PLAY";

      statusText.textContent =
        "Connected";

      controls.lock();

      return;
    }

    const name =
      usernameInput.value
        .trim()
        .slice(0, 16);

    if (!name) {
      statusText.textContent =
        "Enter a player name first.";

      usernameInput.focus();

      return;
    }

    playerName =
      name;

    joinRequested =
      true;

    playButton.disabled =
      true;

    statusText.textContent =
      "Joining game...";

    if (
      socket.connected
    ) {
      socket.emit(
        "joinGame",
        {
          username:
            playerName
        }
      );
    } else {
      socket.connect();
    }
  }
);

/* ======================================================
   POINTER LOCK
====================================================== */

controls.addEventListener(
  "lock",
  () => {
    if (
      !isShopOpen
    ) {
      startOverlay.style.display =
        "none";
    }

    renderer.domElement.style.cursor =
      "none";
  }
);

controls.addEventListener(
  "unlock",
  () => {
    firing = false;

    if (
      isShopOpen
    ) {
      return;
    }

    if (
      playerJoined
    ) {
      startOverlay.style.display =
        "flex";

      playButton.textContent =
        "RESUME";

      statusText.textContent =
        "Click RESUME to continue";

      renderer.domElement.style.cursor =
        "default";
    }
  }
);

function showDeathScreen() {
  const oldTitle =
    startOverlay.querySelector("#startPanel h1");

  if (oldTitle) {
    oldTitle.textContent =
      "YOU DIED";
  }

  startOverlay.style.display =
    "flex";

  playButton.style.display =
    "none";

  usernameInput.style.display =
    "none";

  statusText.textContent =
    "Respawning...";
}

function hideDeathScreen() {
  const oldTitle =
    startOverlay.querySelector("#startPanel h1");

  if (oldTitle) {
    oldTitle.textContent =
      "NEON STRIKE";
  }

  startOverlay.style.display =
    "none";

  playButton.style.display =
    "";

  usernameInput.style.display =
    "";

  statusText.textContent =
    "Connected";
}

/* ======================================================
   SOCKET EVENTS
====================================================== */

socket.on(
  "connect",
  () => {
    statusText.textContent =
      joinRequested
        ? "Connected — joining..."
        : "Connected to server";

    if (
      joinRequested &&
      !playerJoined
    ) {
      socket.emit(
        "joinGame",
        {
          username:
            playerName
        }
      );
    }
  }
);

socket.on(
  "disconnect",
  () => {
    statusText.textContent =
      "Disconnected — reconnecting...";
  }
);

socket.on(
  "joinAccepted",
  data => {
    localPlayerId =
      data.id;

    playerName =
      data.username;

    health =
      data.health;

    score =
      data.score;

    coins =
      data.coins;

    ownedGuns =
      data.ownedGuns ||
      {
        pistol: true
      };

    currentGun =
      data.currentGun ||
      "pistol";

    playerPosition.set(
      data.position.x,
      data.position.y,
      data.position.z
    );

    yaw =
      data.rotation?.y ||
      0;

    pitch =
      data.rotation?.x ||
      0;

    playerJoined =
      true;

    joinRequested =
      false;

    playButton.disabled =
      false;

    playButton.textContent =
      "PLAY";

    startOverlay.style.display =
      "none";

    createLocalAvatar();

    applyGunVisual();

    updateHUD();

    controls.lock();
  }
);

function createLocalAvatar() {
  if (
    otherPlayers.has(
      localPlayerId
    )
  ) {
    scene.remove(
      otherPlayers.get(
        localPlayerId
      )
    );
  }

  const avatar =
    createPlayerAvatar(
      localPlayerId,
      playerName,
      true
    );

  avatar.userData.health =
    health;

  avatar.userData.score =
    score;

  avatar.position.set(
    playerPosition.x,
    0,
    playerPosition.z
  );

  avatar.rotation.y =
    yaw;

  avatar.visible =
    cameraMode ===
    "third";

  otherPlayers.set(
    localPlayerId,
    avatar
  );
}

socket.on(
  "existingPlayers",
  players => {
    for (
      const player of players
    ) {
      addRemotePlayer(
        player
      );
    }

    updateHUD();
  }
);

socket.on(
  "playerJoined",
  player => {
    addRemotePlayer(
      player
    );
  }
);

socket.on(
  "playerMoved",
  data => {
    if (
      data.id ===
      localPlayerId
    ) {
      return;
    }

    updateRemotePlayer(
      data
    );
  }
);

socket.on(
  "playerLeft",
  id => {
    removeRemotePlayer(
      id
    );
  }
);

socket.on(
  "playerCount",
  count => {
    playerCountValue.textContent =
      count;
  }
);

socket.on(
  "playerHit",
  data => {
    if (
      data.targetId !==
      localPlayerId
    ) {
      return;
    }

    health =
      data.health;

    updateHUD();

    damageFlash.style.opacity =
      "1";

    setTimeout(() => {
      damageFlash.style.opacity =
        "0";
    }, 100);

    hitMarker.style.opacity =
      "1";

    setTimeout(() => {
      hitMarker.style.opacity =
        "0";
    }, 150);
  }
);

socket.on(
  "scoreUpdate",
  data => {
    if (
      data.id ===
      localPlayerId
    ) {
      score =
        data.score;

      updateHUD();
    } else {
      const avatar =
        otherPlayers.get(
          data.id
        );

      if (avatar) {
        avatar.userData.score =
          data.score;
      }
    }
  }
);

socket.on(
  "currencyUpdate",
  data => {
    if (
      data.id ===
      localPlayerId
    ) {
      coins =
        data.coins;

      updateHUD();

      if (isShopOpen) {
        renderShop();
      }
    }
  }
);

socket.on(
  "gunPurchased",
  data => {
    ownedGuns =
      data.ownedGuns;

    coins =
      data.coins;

    currentGun =
      data.currentGun;

    ammoState[
      currentGun
    ].magazine =
      GUNS[
        currentGun
      ].magazine;

    ammoState[
      currentGun
    ].reserve =
      GUNS[
        currentGun
      ].reserve;

    applyGunVisual();

    updateHUD();

    renderShop();

    addFeed(
      "SHOP",
      `${GUNS[currentGun].name} purchased`
    );
  }
);

socket.on(
  "gunPurchaseFailed",
  data => {
    addFeed(
      "SHOP",
      data.message ||
        "Purchase failed"
    );
  }
);

socket.on(
  "gunInventory",
  data => {
    ownedGuns =
      data.ownedGuns;

    currentGun =
      data.currentGun;

    applyGunVisual();

    updateHUD();

    if (isShopOpen) {
      renderShop();
    }
  }
);

socket.on(
  "playerShot",
  data => {
    if (
      data.id ===
      localPlayerId
    ) {
      return;
    }

    createTracer(
      new THREE.Vector3(
        data.origin.x,
        data.origin.y,
        data.origin.z
      ),
      new THREE.Vector3(
        data.direction.x,
        data.direction.y,
        data.direction.z
      ),
      GUNS[
        data.gunId
      ]?.color ||
        0x00eaff
    );
  }
);

socket.on(
  "playerEliminated",
  data => {
    addFeed(
      "ELIMINATION",
      `${data.attackerName} eliminated ${data.targetName}`,
      true
    );

    if (
      data.attackerId ===
      localPlayerId
    ) {
      showKillMessage(
        "+10 COINS"
      );
    }

    if (
  data.targetId ===
  localPlayerId
) {
  health = 0;

  updateHUD();

  firing = false;
  isAiming = false;
  isReloading = false;

  showDeathScreen();

  if (controls.isLocked) {
    controls.unlock();
  }
}
});

socket.on(
  "respawn",
  data => {
    if (
      data.id !==
      localPlayerId
    ) {
      return;
    }

    health =
      data.health;

    playerPosition.set(
      data.position.x,
      data.position.y,
      data.position.z
    );

    verticalVelocity =
      0;

    isGrounded =
      true;

    updateHUD();

    hideDeathScreen();

applyGunVisual();
updateHUD();

if (!controls.isLocked) {
  controls.lock();
}
  }
);

/* ======================================================
   ANIMATION
====================================================== */

function updateGun() {
  gunRecoil *= 0.72;

  gun.position.copy(
    gunBasePosition
  );

  gun.position.z +=
    gunRecoil;

  gun.rotation.x =
    -gunRecoil * 2.5;
}

function animate() {
  requestAnimationFrame(
    animate
  );

  const delta =
    Math.min(
      clock.getDelta(),
      0.05
    );

  if (
    firing &&
    GUNS[currentGun]?.automatic &&
    !isShopOpen
  ) {
    shoot();
  }

  updateMovement(
    delta
  );

  updateCamera();

  updateRemotePlayers(
    delta
  );

  updateGun();

  reactor.rotation.y +=
    delta * 0.7;

  for (
    let i =
      projectiles.length - 1;
    i >= 0;
    i--
  ) {
    const projectile =
      projectiles[i];

    projectile.life -=
      delta;

    if (
      projectile.life <= 0
    ) {
      scene.remove(
        projectile.mesh
      );

      projectile.mesh.geometry.dispose();
      projectile.mesh.material.dispose();

      projectiles.splice(
        i,
        1
      );
    }
  }

  if (scoreOpen) {
    renderScoreboard();
  }

  renderer.render(
    scene,
    camera
  );
}

/* ======================================================
   RESIZE
====================================================== */

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      innerWidth /
      innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      innerWidth,
      innerHeight
    );
  }
);

/* ======================================================
   START
====================================================== */

updateHUD();

applyGunVisual();

animate();
