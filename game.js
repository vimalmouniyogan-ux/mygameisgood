/* ======================================================
   NEON STRIKE - CLEAN MULTIPLAYER CLIENT
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

/* ======================================================
   DOM
====================================================== */

const $ = (id) => document.getElementById(id);

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
let ownedGuns = { pistol: true };

const movement = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false
};

let verticalVelocity = 0;
let isGrounded = true;
let isCrouched = false;
let slideTimer = 0;
let isAiming = false;
let lastShotTime = 0;
let networkTimer = 0;
let scoreOpen = false;
let isReloading = false;
let reloadTimeout = null;

const jumpStrength = 10;
const gravity = 28;
const groundY = 2.1;
const crouchY = 1.35;
const standY = 2.1;
const playerRadius = 0.65;
const arenaSize = 120;

const otherPlayers = new Map();
const collisionBoxes = [];
const projectiles = [];
const clock = new THREE.Clock();

/* ======================================================
   GUN DATA
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
    barrelScale: 1,
    automatic: false,
    pellets: 1
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
    color: 0x00d9ff,
    barrelScale: 0.78,
    automatic: true,
    pellets: 1
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
    barrelScale: 1.18,
    automatic: false,
    pellets: 8
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
    barrelScale: 1.25,
    automatic: true,
    pellets: 1
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
    barrelScale: 1.55,
    automatic: false,
    pellets: 1
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
   SCENE / CAMERA / RENDERER
====================================================== */

const scene = new THREE.Scene();

scene.background =
  new THREE.Color(0x02050a);

scene.fog =
  new THREE.Fog(
    0x02050a,
    45,
    190
  );

const camera =
  new THREE.PerspectiveCamera(
    76,
    window.innerWidth /
      window.innerHeight,
    0.05,
    500
  );

camera.position.set(
  0,
  groundY,
  25
);

const renderer =
  new THREE.WebGLRenderer({
    antialias: true,
    powerPreference:
      "high-performance"
  });

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio,
    2
  )
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.shadowMap.enabled =
  true;

renderer.shadowMap.type =
  THREE.PCFSoftShadowMap;

renderer.outputEncoding =
  THREE.sRGBEncoding;

$("game").appendChild(
  renderer.domElement
);

const controls =
  new THREE.PointerLockControls(
    camera,
    renderer.domElement
  );

/* ======================================================
   LIGHTING
====================================================== */

scene.add(
  new THREE.AmbientLight(
    0x5c7698,
    0.32
  )
);

const moon =
  new THREE.DirectionalLight(
    0x7ca7ff,
    1.05
  );

moon.position.set(
  -25,
  55,
  35
);

moon.castShadow = true;

moon.shadow.mapSize.width =
  2048;

moon.shadow.mapSize.height =
  2048;

scene.add(moon);

const cyan =
  new THREE.PointLight(
    0x00bbff,
    3.2,
    45,
    2
  );

cyan.position.set(
  0,
  7,
  0
);

scene.add(cyan);

const red =
  new THREE.PointLight(
    0xff254f,
    2.5,
    35,
    2
  );

red.position.set(
  0,
  8,
  -42
);

scene.add(red);

/* ======================================================
   MATERIALS
====================================================== */

const floorMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x25292d,
    roughness: 0.92,
    metalness: 0.08
  });

const wallMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x30353a,
    roughness: 0.82,
    metalness: 0.18
  });

const darkWallMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x1d2227,
    roughness: 0.78,
    metalness: 0.25
  });

const concreteMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x4b5054,
    roughness: 0.9,
    metalness: 0.08
  });

const metalMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x343a40,
    roughness: 0.38,
    metalness: 0.82
  });

const crateMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x695039,
    roughness: 0.86,
    metalness: 0.02
  });

const warningMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x8a741f,
    roughness: 0.65,
    metalness: 0.2
  });

/* ======================================================
   FLOOR
====================================================== */

const floor =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      arenaSize,
      0.7,
      arenaSize
    ),
    floorMaterial
  );

floor.position.y = -0.35;
floor.receiveShadow = true;

scene.add(floor);

const tileMaterial =
  new THREE.LineBasicMaterial({
    color: 0x39444b,
    transparent: true,
    opacity: 0.35
  });

for (
  let i = -arenaSize / 2;
  i <= arenaSize / 2;
  i += 6
) {
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry()
        .setFromPoints([
          new THREE.Vector3(
            i,
            0.015,
            -arenaSize / 2
          ),

          new THREE.Vector3(
            i,
            0.015,
            arenaSize / 2
          )
        ]),

      tileMaterial
    )
  );

  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry()
        .setFromPoints([
          new THREE.Vector3(
            -arenaSize / 2,
            0.016,
            i
          ),

          new THREE.Vector3(
            arenaSize / 2,
            0.016,
            i
          )
        ]),

      tileMaterial
    )
  );
}

/* ======================================================
   MAP / COLLISION
====================================================== */

function addCollisionBox(
  x,
  y,
  z,
  width,
  height,
  depth
) {
  collisionBoxes.push({
    minX: x - width / 2,
    maxX: x + width / 2,

    minY: y,
    maxY: y + height,

    minZ: z - depth / 2,
    maxZ: z + depth / 2
  });
}

function addBox(
  x,
  y,
  z,
  width,
  height,
  depth,
  material = concreteMaterial
) {
  const mesh =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        width,
        height,
        depth
      ),
      material
    );

  mesh.position.set(
    x,
    y + height / 2,
    z
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);

  addCollisionBox(
    x,
    y,
    z,
    width,
    height,
    depth
  );

  return mesh;
}

function createMapWall(
  x,
  y,
  z,
  width,
  height,
  depth
) {
  const wall =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        width,
        height,
        depth
      ),
      wallMaterial
    );

  wall.position.set(
    x,
    y,
    z
  );

  wall.castShadow = true;
  wall.receiveShadow = true;

  scene.add(wall);

  const top =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        width,
        0.08,
        depth
      ),
      metalMaterial
    );

  top.position.set(
    x,
    y + height / 2,
    z
  );

  scene.add(top);

  addCollisionBox(
    x,
    y - height / 2,
    z,
    width,
    height,
    depth
  );
}

createMapWall(
  0,
  5,
  -arenaSize / 2,
  arenaSize,
  10,
  1.2
);

createMapWall(
  0,
  5,
  arenaSize / 2,
  arenaSize,
  10,
  1.2
);

createMapWall(
  -arenaSize / 2,
  5,
  0,
  1.2,
  10,
  arenaSize
);

createMapWall(
  arenaSize / 2,
  5,
  0,
  1.2,
  10,
  arenaSize
);

function createBuilding(
  x,
  z,
  width,
  depth,
  height
) {
  const building =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        width,
        height,
        depth
      ),
      darkWallMaterial
    );

  building.position.set(
    x,
    height / 2,
    z
  );

  building.castShadow = true;
  building.receiveShadow = true;

  scene.add(building);

  const roof =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        width + 0.4,
        0.35,
        depth + 0.4
      ),
      metalMaterial
    );

  roof.position.set(
    x,
    height + 0.15,
    z
  );

  roof.castShadow = true;

  scene.add(roof);

  addCollisionBox(
    x,
    0,
    z,
    width,
    height,
    depth
  );
}

createBuilding(
  -40,
  -27,
  20,
  18,
  8
);

createBuilding(
  40,
  -27,
  20,
  18,
  8
);

createBuilding(
  -43,
  30,
  14,
  17,
  6
);

createBuilding(
  43,
  30,
  14,
  17,
  6
);

addBox(
  0,
  0,
  -17,
  28,
  7,
  3
);

addBox(
  -14,
  0,
  -8,
  3,
  7,
  18
);

addBox(
  14,
  0,
  -8,
  3,
  7,
  18
);

addBox(
  -30,
  0,
  2,
  14,
  3,
  2
);

addBox(
  30,
  0,
  2,
  14,
  3,
  2
);

addBox(
  -7,
  0,
  12,
  12,
  3,
  2
);

addBox(
  7,
  0,
  12,
  12,
  3,
  2
);

addBox(
  -27,
  0,
  -16,
  6,
  3,
  4
);

addBox(
  27,
  0,
  -16,
  6,
  3,
  4
);

addBox(
  -25,
  0,
  25,
  7,
  4,
  4
);

addBox(
  25,
  0,
  25,
  7,
  4,
  4
);

/* ======================================================
   CRATES
====================================================== */

function createCrate(
  x,
  z,
  scaleY = 1
) {
  const size = 2.8;

  addBox(
    x,
    0,
    z,
    size,
    size * scaleY,
    size,
    crateMaterial
  );
}

createCrate(-38, -8);
createCrate(-35, -8);
createCrate(-38, -5);
createCrate(-35, -5);

createCrate(38, -8);
createCrate(35, -8);
createCrate(38, -5);
createCrate(35, -5);

createCrate(-10, 35);
createCrate(-7, 35);
createCrate(10, 35);
createCrate(7, 35);

/* ======================================================
   BARRIERS
====================================================== */

function createBarrier(
  x,
  z,
  rotation = 0
) {
  const barrier =
    new THREE.Group();

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        5,
        1.4,
        0.55
      ),
      warningMaterial
    );

  body.castShadow = true;
  body.receiveShadow = true;

  barrier.add(body);

  for (
    let i = -1;
    i <= 1;
    i++
  ) {
    const leg =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.35,
          1.8,
          0.35
        ),
        metalMaterial
      );

    leg.position.set(
      i * 1.8,
      -0.2,
      0
    );

    barrier.add(leg);
  }

  barrier.position.set(
    x,
    0.8,
    z
  );

  barrier.rotation.y =
    rotation;

  scene.add(barrier);

  const cos =
    Math.abs(
      Math.cos(rotation)
    );

  const sin =
    Math.abs(
      Math.sin(rotation)
    );

  const width =
    5 * cos +
    0.55 * sin;

  const depth =
    5 * sin +
    0.55 * cos;

  addCollisionBox(
    x,
    0,
    z,
    width,
    1.8,
    depth
  );
}

createBarrier(
  -20,
  8,
  0
);

createBarrier(
  20,
  8,
  0
);

createBarrier(
  0,
  28,
  Math.PI / 2
);

/* ======================================================
   GUN MODEL
====================================================== */

const gun =
  new THREE.Group();

const gunBodyMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x6d7881,
    metalness: 0.8,
    roughness: 0.3
  });

const gunBarrelMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x101419,
    metalness: 0.9,
    roughness: 0.2
  });

const gunGlowMaterial =
  new THREE.MeshBasicMaterial({
    color: 0x00d9ff
  });

const gunBody =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.22,
      0.18,
      0.72
    ),
    gunBodyMaterial
  );

gunBody.position.set(
  0,
  0,
  -0.3
);

gunBody.castShadow = true;

gun.add(gunBody);

const gunBarrel =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.08,
      0.08,
      0.7
    ),
    gunBarrelMaterial
  );

gunBarrel.position.set(
  0,
  0.01,
  -0.85
);

gunBarrel.castShadow = true;

gun.add(gunBarrel);

const gunGlow =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.04,
      0.04,
      0.62
    ),
    gunGlowMaterial
  );

gunGlow.position.set(
  0,
  0,
  -0.86
);

gun.add(gunGlow);

const gunHandle =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.14,
      0.35,
      0.16
    ),
    gunBodyMaterial
  );

gunHandle.position.set(
  0,
  -0.22,
  -0.2
);

gunHandle.rotation.x =
  -0.18;

gunHandle.castShadow = true;

gun.add(gunHandle);

const muzzlePoint =
  new THREE.Object3D();

muzzlePoint.position.set(
  0,
  0.02,
  -1.2
);

gun.add(muzzlePoint);

const muzzleFlash =
  new THREE.PointLight(
    0xffcc66,
    0,
    4
  );

muzzlePoint.add(
  muzzleFlash
);

const gunBasePosition =
  new THREE.Vector3(
    0.48,
    -0.38,
    -0.75
  );

const gunBaseRotation =
  new THREE.Euler(
    -0.04,
    -0.08,
    0
  );

let gunRecoil = 0;

gun.position.copy(
  gunBasePosition
);

gun.rotation.copy(
  gunBaseRotation
);

camera.add(gun);

/* ======================================================
   GUN VISUAL
====================================================== */

function applyGunVisual() {
  const weapon =
    GUNS[currentGun];

  if (!weapon) {
    return;
  }

  const color =
    new THREE.Color(
      weapon.color
    );

  gunBodyMaterial.color.copy(
    color
  );

  gunGlowMaterial.color.copy(
    color
  );

  const scale =
    weapon.barrelScale || 1;

  gunBarrel.scale.set(
    1,
    scale,
    1
  );

  gun.position.copy(
    gunBasePosition
  );

  gun.rotation.copy(
    gunBaseRotation
  );

  gunValue.textContent =
    weapon.name;
}

/* ======================================================
   REMOTE PLAYER
====================================================== */

function createOtherPlayer(
  id,
  username = "Player"
) {
  if (
    otherPlayers.has(id)
  ) {
    return otherPlayers.get(
      id
    ).group;
  }

  const group =
    new THREE.Group();

  const bodyMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x00a8ff,
      roughness: 0.6,
      metalness: 0.25
    });

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.9,
        1.35,
        0.55
      ),
      bodyMaterial
    );

  body.position.y =
    0.95;

  body.castShadow = true;
  body.receiveShadow = true;

  group.add(body);

  const headMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xd7e4ef,
      roughness: 0.75,
      metalness: 0.05
    });

  const head =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.62,
        0.62,
        0.62
      ),
      headMaterial
    );

  head.position.y =
    1.92;

  head.castShadow = true;

  group.add(head);

  const visorMaterial =
    new THREE.MeshBasicMaterial({
      color: 0x00ffff
    });

  const visor =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.44,
        0.14,
        0.04
      ),
      visorMaterial
    );

  visor.position.set(
    0,
    1.97,
    -0.315
  );

  group.add(visor);

  scene.add(group);

  otherPlayers.set(
    id,
    {
      id,
      username,
      group,
      targetPosition:
        group.position.clone(),
      targetRotationY:
        group.rotation.y,
      health: 100,
      score: 0
    }
  );

  return group;
}

function removeOtherPlayer(
  id
) {
  const remote =
    otherPlayers.get(id);

  if (!remote) {
    return;
  }

  scene.remove(
    remote.group
  );

  otherPlayers.delete(id);
}

/* ======================================================
   TRACER
====================================================== */

function pointInsideBox(
  position,
  box
) {
  return (
    position.x >= box.minX &&
    position.x <= box.maxX &&
    position.y >= box.minY &&
    position.y <= box.maxY &&
    position.z >= box.minZ &&
    position.z <= box.maxZ
  );
}

function segmentHitsBox(
  start,
  end,
  box
) {
  const dx =
    end.x - start.x;

  const dy =
    end.y - start.y;

  const dz =
    end.z - start.z;

  let tMin = 0;
  let tMax = 1;

  if (
    Math.abs(dx) <
    0.000001
  ) {
    if (
      start.x < box.minX ||
      start.x > box.maxX
    ) {
      return false;
    }
  } else {
    let tx1 =
      (box.minX - start.x) /
      dx;

    let tx2 =
      (box.maxX - start.x) /
      dx;

    if (tx1 > tx2) {
      [tx1, tx2] =
        [tx2, tx1];
    }

    tMin =
      Math.max(
        tMin,
        tx1
      );

    tMax =
      Math.min(
        tMax,
        tx2
      );

    if (
      tMin >
      tMax
    ) {
      return false;
    }
  }

  if (
    Math.abs(dy) <
    0.000001
  ) {
    if (
      start.y < box.minY ||
      start.y > box.maxY
    ) {
      return false;
    }
  } else {
    let ty1 =
      (box.minY - start.y) /
      dy;

    let ty2 =
      (box.maxY - start.y) /
      dy;

    if (ty1 > ty2) {
      [ty1, ty2] =
        [ty2, ty1];
    }

    tMin =
      Math.max(
        tMin,
        ty1
      );

    tMax =
      Math.min(
        tMax,
        ty2
      );

    if (
      tMin >
      tMax
    ) {
      return false;
    }
  }

  if (
    Math.abs(dz) <
    0.000001
  ) {
    if (
      start.z < box.minZ ||
      start.z > box.maxZ
    ) {
      return false;
    }
  } else {
    let tz1 =
      (box.minZ - start.z) /
      dz;

    let tz2 =
      (box.maxZ - start.z) /
      dz;

    if (tz1 > tz2) {
      [tz1, tz2] =
        [tz2, tz1];
    }

    tMin =
      Math.max(
        tMin,
        tz1
      );

    tMax =
      Math.min(
        tMax,
        tz2
      );

    if (
      tMin >
      tMax
    ) {
      return false;
    }
  }

  return (
    tMin <= tMax
  );
}

function findTracerEnd(
  start,
  direction,
  maxDistance = 120
) {
  const end =
    start.clone().add(
      direction
        .clone()
        .multiplyScalar(
          maxDistance
        )
    );

  let closest =
    maxDistance;

  for (
    const box of
    collisionBoxes
  ) {
    if (
      segmentHitsBox(
        start,
        end,
        box
      )
    ) {
      const steps = 40;

      for (
        let i = 0;
        i <= steps;
        i++
      ) {
        const t =
          i / steps;

        const point =
          start.clone().lerp(
            end,
            t
          );

        if (
          pointInsideBox(
            point,
            box
          )
        ) {
          closest =
            Math.min(
              closest,
              maxDistance *
                t
            );
          break;
        }
      }
    }
  }

  return start.clone().add(
    direction
      .clone()
      .multiplyScalar(
        Math.max(
          0.25,
          closest
        )
      )
  );
}

function createTracer(
  origin,
  direction,
  gunId = currentGun
) {
  const weapon =
    GUNS[gunId] ||
    GUNS.pistol;

  const end =
    findTracerEnd(
      origin,
      direction,
      120
    );

  const geometry =
    new THREE.BufferGeometry()
      .setFromPoints([
        origin,
        end
      ]);

  const material =
    new THREE.LineBasicMaterial({
      color: weapon.color,
      transparent: true,
      opacity: 0.95
    });

  const tracer =
    new THREE.Line(
      geometry,
      material
    );

  scene.add(tracer);

  setTimeout(
    () => {
      scene.remove(
        tracer
      );

      geometry.dispose();
      material.dispose();
    },
    70
  );
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

  shopCoins.textContent =
    `Coins: ${coins}`;

  updateAmmoDisplay();
}

function updateAmmoDisplay() {
  const state =
    ammoState[currentGun];

  const weapon =
    GUNS[currentGun];

  if (
    !state ||
    !weapon
  ) {
    return;
  }

  if (ammoValue) {
    ammoValue.textContent =
      state.magazine;
  }

  if (reserveValue) {
    reserveValue.textContent =
      state.reserve;
  }

  if (reloadText) {
    reloadText.textContent =
      isReloading
        ? "RELOADING..."
        : "";
  }
}

/* ======================================================
   DAMAGE EFFECT
====================================================== */

function flashDamage() {
  damageFlash.style.opacity =
    "1";

  hitMarker.style.opacity =
    "1";

  setTimeout(
    () => {
      damageFlash.style.opacity =
        "0";
    },
    120
  );

  setTimeout(
    () => {
      hitMarker.style.opacity =
        "0";
    },
    120
  );
}

/* ======================================================
   KILL MESSAGE / FEED
====================================================== */

function showKillMessage(
  message
) {
  killMessage.textContent =
    message;

  killMessage.style.opacity =
    "1";

  setTimeout(
    () => {
      killMessage.style.opacity =
        "0";
    },
    1100
  );
}

function addKillFeed(
  message
) {
  if (!killFeed) {
    return;
  }

  const item =
    document.createElement(
      "div"
    );

  item.textContent =
    message;

  item.style.marginBottom =
    "5px";

  item.style.fontWeight =
    "800";

  item.style.color =
    "#ffffff";

  killFeed.appendChild(
    item
  );

  while (
    killFeed.children.length >
    5
  ) {
    killFeed.removeChild(
      killFeed.firstChild
    );
  }

  setTimeout(
    () => {
      if (item.parentNode) {
        item.remove();
      }
    },
    5000
  );
}

/* ======================================================
   COLLISION
====================================================== */

function collides(
  position
) {
  const limit =
    arenaSize / 2 -
    playerRadius -
    1;

  if (
    position.x < -limit ||
    position.x > limit ||
    position.z < -limit ||
    position.z > limit
  ) {
    return true;
  }

  const minX =
    position.x -
    playerRadius;

  const maxX =
    position.x +
    playerRadius;

  const minZ =
    position.z -
    playerRadius;

  const maxZ =
    position.z +
    playerRadius;

  for (
    const box of
    collisionBoxes
  ) {
    if (
      maxX > box.minX &&
      minX < box.maxX &&
      maxZ > box.minZ &&
      minZ < box.maxZ
    ) {
      return true;
    }
  }

  return false;
}

/* ======================================================
   RELOAD
====================================================== */

function refillCurrentMagazine() {
  const state =
    ammoState[currentGun];

  const weapon =
    GUNS[currentGun];

  if (!state || !weapon) {
    return;
  }

  state.magazine =
    weapon.magazine;

  state.reserve =
    weapon.reserve;

  updateAmmoDisplay();
}

function reload() {
  if (
    !playerJoined ||
    isReloading
  ) {
    return;
  }

  const state =
    ammoState[currentGun];

  const weapon =
    GUNS[currentGun];

  if (
    !state ||
    !weapon
  ) {
    return;
  }

  if (
    state.magazine >=
      weapon.magazine
  ) {
    return;
  }

  if (
    state.reserve <= 0
  ) {
    return;
  }

  isReloading = true;

  updateAmmoDisplay();

  if (reloadTimeout) {
    clearTimeout(
      reloadTimeout
    );
  }

  reloadTimeout =
    setTimeout(
      () => {
        const needed =
          weapon.magazine -
          state.magazine;

        const amount =
          Math.min(
            needed,
            state.reserve
          );

        state.magazine +=
          amount;

        state.reserve -=
          amount;

        isReloading = false;

        reloadTimeout = null;

        updateAmmoDisplay();
      },
      weapon.reload
    );
}

/* ======================================================
   WEAPON SWITCHING
====================================================== */

function switchWeapon(
  gunId
) {
  if (!GUNS[gunId]) {
    return;
  }

  if (
    !ownedGuns[gunId]
  ) {
    return;
  }

  if (isReloading) {
    return;
  }

  currentGun =
    gunId;

  applyGunVisual();
  updateAmmoDisplay();

  socket.emit(
    "equipGun",
    gunId
  );
}

/* ======================================================
   SHOOTING
====================================================== */

function getShotDirection(
  spread
) {
  const direction =
    new THREE.Vector3();

  camera.getWorldDirection(
    direction
  );

  const rightVector =
    new THREE.Vector3();

  const upVector =
    new THREE.Vector3();

  rightVector
    .crossVectors(
      direction,
      camera.up
    )
    .normalize();

  upVector
    .crossVectors(
      rightVector,
      direction
    )
    .normalize();

  if (spread > 0) {
    direction.addScaledVector(
      rightVector,
      (Math.random() -
        0.5) *
        spread
    );

    direction.addScaledVector(
      upVector,
      (Math.random() -
        0.5) *
        spread
    );
  }

  return direction.normalize();
}

function shoot() {
  if (
    !controls.isLocked ||
    !playerJoined ||
    isReloading
  ) {
    return;
  }

  const weapon =
    GUNS[currentGun];

  const state =
    ammoState[currentGun];

  if (!weapon || !state) {
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

  if (
    state.magazine <= 0
  ) {
    reload();
    return;
  }

  lastShotTime =
    now;

  state.magazine--;

  updateAmmoDisplay();

  const origin =
    new THREE.Vector3();

  muzzlePoint.getWorldPosition(
    origin
  );

  const pellets =
    weapon.pellets || 1;

  for (
    let i = 0;
    i < pellets;
    i++
  ) {
    const direction =
      getShotDirection(
        weapon.spread
      );

    createTracer(
      origin,
      direction,
      currentGun
    );
  }

  muzzleFlash.intensity =
    6;

  setTimeout(
    () => {
      muzzleFlash.intensity =
        0;
    },
    45
  );

  gunRecoil =
    isAiming
      ? 0.055
      : 0.085;

  socket.emit(
    "shoot",
    {
      origin: {
        x: origin.x,
        y: origin.y,
        z: origin.z
      },

      direction: {
        x:
          camera.getWorldDirection(
            new THREE.Vector3()
          ).x,

        y:
          camera.getWorldDirection(
            new THREE.Vector3()
          ).y,

        z:
          camera.getWorldDirection(
            new THREE.Vector3()
          ).z
      },

      gunId:
        currentGun
    }
  );

  if (
    state.magazine <= 0 &&
    state.reserve > 0
  ) {
    setTimeout(
      () => {
        reload();
      },
      80
    );
  }
}

/* ======================================================
   MOVEMENT
====================================================== */

function updateMovement(
  delta
) {
  if (
    !controls.isLocked ||
    !playerJoined
  ) {
    return;
  }

  move.set(
    0,
    0,
    0
  );

  if (movement.forward) {
    move.z -= 1;
  }

  if (movement.backward) {
    move.z += 1;
  }

  if (movement.left) {
    move.x -= 1;
  }

  if (movement.right) {
    move.x += 1;
  }

  if (
    move.lengthSq() > 0
  ) {
    move.normalize();

    const speed =
      movement.sprint
        ? 30
        : (
          isCrouched
            ? 10
            : 20
        );

    camera.getWorldDirection(
      forward
    );

    forward.y = 0;

    if (
      forward.lengthSq() > 0
    ) {
      forward.normalize();
    }

    right.crossVectors(
      forward,
      camera.up
    );

    if (
      right.lengthSq() > 0
    ) {
      right.normalize();
    }

    velocity.set(
      0,
      0,
      0
    );

    velocity.addScaledVector(
      forward,
      -move.z
    );

    velocity.addScaledVector(
      right,
      move.x
    );

    if (
      velocity.lengthSq() > 0
    ) {
      velocity.normalize();

      velocity.multiplyScalar(
        speed * delta
      );
    }

    const nextX =
      camera.position.clone();

    nextX.x +=
      velocity.x;

    if (
      !collides(nextX)
    ) {
      camera.position.x =
        nextX.x;
    }

    const nextZ =
      camera.position.clone();

    nextZ.z +=
      velocity.z;

    if (
      !collides(nextZ)
    ) {
      camera.position.z =
        nextZ.z;
    }
  }

  verticalVelocity -=
    gravity * delta;

  camera.position.y +=
    verticalVelocity *
    delta;

  if (
    camera.position.y <=
    groundY
  ) {
    camera.position.y =
      groundY;

    verticalVelocity = 0;

    isGrounded = true;
  }

  if (
    movement.crouch &&
    isGrounded
  ) {
    isCrouched = true;
  } else if (
    !movement.crouch &&
    isCrouched
  ) {
    isCrouched = false;
  }

  const targetY =
    isCrouched
      ? crouchY
      : standY;

  camera.position.y +=
    (
      targetY -
      camera.position.y
    ) *
    Math.min(
      1,
      delta * 12
    );

  networkTimer += delta;

  if (
    networkTimer >= 0.05
  ) {
    networkTimer = 0;

    socket.emit(
      "playerMove",
      {
        position: {
          x:
            camera.position.x,

          y:
            camera.position.y,

          z:
            camera.position.z
        },

        rotation: {
          x:
            camera.rotation.x,

          y:
            camera.rotation.y,

          z:
            camera.rotation.z
        }
      }
    );
  }
}

/* ======================================================
   REMOTE PLAYER UPDATE
====================================================== */

function updateRemotePlayers(
  delta
) {
  const alpha =
    1 -
    Math.pow(
      0.0001,
      delta
    );

  for (
    const remote of
    otherPlayers.values()
  ) {
    remote.group.position.lerp(
      remote.targetPosition,
      alpha
    );

    let difference =
      remote.targetRotationY -
      remote.group.rotation.y;

    difference =
      Math.atan2(
        Math.sin(
          difference
        ),
        Math.cos(
          difference
        )
      );

    remote.group.rotation.y +=
      difference *
      alpha;
  }
}

/* ======================================================
   GUN ANIMATION
====================================================== */

function updateGun() {
  const moving =
    movement.forward ||
    movement.backward ||
    movement.left ||
    movement.right;

  const t =
    performance.now() *
    0.008;

  const bobAmount =
    moving
      ? (
        movement.sprint
          ? 0.015
          : 0.008
      )
      : 0;

  const bobX =
    Math.cos(t * 0.5) *
    bobAmount;

  const bobY =
    Math.sin(t) *
    bobAmount;

  gunRecoil *= 0.78;

  const aimOffset =
    isAiming
      ? -0.04
      : 0;

  gun.position.set(
    gunBasePosition.x +
      bobX,

    gunBasePosition.y +
      bobY,

    gunBasePosition.z +
      gunRecoil +
      aimOffset
  );
}

/* ======================================================
   INPUT
====================================================== */

window.addEventListener(
  "keydown",
  (event) => {
    if (
      event.code === "KeyW"
    ) {
      movement.forward = true;
    }

    if (
      event.code === "KeyS"
    ) {
      movement.backward = true;
    }

    if (
      event.code === "KeyA"
    ) {
      movement.left = true;
    }

    if (
      event.code === "KeyD"
    ) {
      movement.right = true;
    }

    if (
      event.code ===
        "ShiftLeft" ||
      event.code ===
        "ShiftRight"
    ) {
      movement.sprint = true;
    }

    if (
      event.code === "KeyC"
    ) {
      movement.crouch = true;
      event.preventDefault();
    }

    if (
      event.code === "Space" &&
      isGrounded &&
      controls.isLocked &&
      playerJoined
    ) {
      verticalVelocity =
        jumpStrength;

      isGrounded =
        false;

      event.preventDefault();
    }

    if (
      event.code === "KeyR"
    ) {
      reload();
      event.preventDefault();
    }

    if (
      event.code === "KeyB"
    ) {
      if (
        shopPanel.style.display ===
        "block"
      ) {
        closeGunShop();
      } else {
        openGunShop();
      }

      event.preventDefault();
    }

    if (
      event.code === "Tab"
    ) {
      scoreOpen = true;

      scoreboard.style.display =
        "block";

      renderScoreboard();

      event.preventDefault();
    }

    if (
      event.code.startsWith(
        "Digit"
      )
    ) {
      const index =
        Number(
          event.code.slice(5)
        ) - 1;

      if (
        index >= 0 &&
        index <
          weaponOrder.length
      ) {
        switchWeapon(
          weaponOrder[index]
        );
      }
    }
  }
);

window.addEventListener(
  "keyup",
  (event) => {
    if (
      event.code === "KeyW"
    ) {
      movement.forward =
        false;
    }

    if (
      event.code === "KeyS"
    ) {
      movement.backward =
        false;
    }

    if (
      event.code === "KeyA"
    ) {
      movement.left =
        false;
    }

    if (
      event.code === "KeyD"
    ) {
      movement.right =
        false;
    }

    if (
      event.code ===
        "ShiftLeft" ||
      event.code ===
        "ShiftRight"
    ) {
      movement.sprint =
        false;
    }

    if (
      event.code === "KeyC"
    ) {
      movement.crouch =
        false;
    }

    if (
      event.code === "Tab"
    ) {
      scoreOpen = false;

      scoreboard.style.display =
        "none";
    }
  }
);

window.addEventListener(
  "mousedown",
  (event) => {
    if (
      event.button === 0
    ) {
      shoot();
    }

    if (
      event.button === 2
    ) {
      isAiming = true;
      event.preventDefault();
    }
  }
);

window.addEventListener(
  "mouseup",
  (event) => {
    if (
      event.button === 2
    ) {
      isAiming = false;
      event.preventDefault();
    }
  }
);

window.addEventListener(
  "contextmenu",
  (event) => {
    event.preventDefault();
  }
);

window.addEventListener(
  "blur",
  () => {
    movement.forward = false;
    movement.backward = false;
    movement.left = false;
    movement.right = false;
    movement.sprint = false;
    movement.crouch = false;
    isAiming = false;
  }
);

/* ======================================================
   SHOP
====================================================== */

function openGunShop() {
  if (
    !playerJoined
  ) {
    return;
  }

  renderShop();

  shopPanel.style.display =
    "block";
}

function closeGunShop() {
  shopPanel.style.display =
    "none";
}

shopButton.addEventListener(
  "click",
  () => {
    if (
      shopPanel.style.display ===
      "block"
    ) {
      closeGunShop();
    } else {
      openGunShop();
    }
  }
);

closeShop.addEventListener(
  "click",
  closeGunShop
);

function renderShop() {
  if (!gunList) {
    return;
  }

  shopCoins.textContent =
    `Coins: ${coins}`;

  gunList.innerHTML =
    "";

  for (
    const [
      gunId,
      weapon
    ] of Object.entries(
      GUNS
    )
  ) {
    const card =
      document.createElement(
        "div"
      );

    card.className =
      "gunCard";

    const owned =
      !!ownedGuns[gunId];

    const equipped =
      currentGun ===
      gunId;

    let action = "";

    if (
      equipped
    ) {
      action = `
        <button
          class="gunAction equippedButton"
          disabled
        >
          EQUIPPED
        </button>
      `;
    } else if (
      owned
    ) {
      action = `
        <button
          class="gunAction equipButton"
          data-equip="${gunId}"
        >
          EQUIP
        </button>
      `;
    } else {
      action = `
        <button
          class="gunAction buyButton"
          data-buy="${gunId}"
        >
          BUY ${weapon.price}
        </button>
      `;
    }

    const hex =
      weapon.color
        .toString(16)
        .padStart(
          6,
          "0"
        );

    card.innerHTML = `
      <div class="gunTop">
        <div>
          <div
            class="gunName"
            style="color:#${hex}"
          >
            ${weapon.name}
          </div>

          <div class="gunStats">
            Damage:
            ${weapon.damage}
            &nbsp; | &nbsp;
            Fire Rate:
            ${weapon.cooldown}ms
            &nbsp; | &nbsp;
            ${
              weapon.price === 0
                ? "FREE"
                : `${weapon.price} COINS`
            }
          </div>
        </div>

        ${action}
      </div>
    `;

    gunList.appendChild(
      card
    );
  }

  document
    .querySelectorAll(
      "[data-buy]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const gunId =
              button.dataset.buy;

            if (!gunId) {
              return;
            }

            socket.emit(
              "buyGun",
              gunId
            );
          }
        );
      }
    );

  document
    .querySelectorAll(
      "[data-equip]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const gunId =
              button.dataset.equip;

            if (!gunId) {
              return;
            }

            socket.emit(
              "equipGun",
              gunId
            );
          }
        );
      }
    );
}

/* ======================================================
   SCOREBOARD
====================================================== */

function renderScoreboard() {
  if (!scoreboardList) {
    return;
  }

  scoreboardList.innerHTML =
    "";

  const localRow =
    document.createElement(
      "div"
    );

  localRow.textContent =
    `${playerName || "You"} — ${score}`;

  localRow.style.padding =
    "5px 0";

  localRow.style.fontWeight =
    "900";

  scoreboardList.appendChild(
    localRow
  );

  for (
    const remote of
    otherPlayers.values()
  ) {
    const row =
      document.createElement(
        "div"
      );

    row.textContent =
      `${remote.username} — ${remote.score || 0}`;

    row.style.padding =
      "5px 0";

    scoreboardList.appendChild(
      row
    );
  }
}

/* ======================================================
   POINTER LOCK
====================================================== */

playButton.addEventListener(
  "click",
  () => {
    let name =
      usernameInput.value
        .trim()
        .replace(
          /[^\w\- ]/g,
          ""
        )
        .slice(
          0,
          16
        );

    if (!name) {
      name =
        "Player" +
        Math.floor(
          Math.random() *
            9000 +
            1000
        );
    }

    playerName =
      name;

    joinRequested =
      true;

    statusText.textContent =
      "Connecting to server...";

    if (
      !controls.isLocked
    ) {
      controls.lock();
    }

    if (
      playerJoined
    ) {
      return;
    }

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

controls.addEventListener(
  "lock",
  () => {
    startOverlay.style.display =
      "none";
  }
);

controls.addEventListener(
  "unlock",
  () => {
    if (
      health > 0
    ) {
      startOverlay.style.display =
        "flex";

      if (
        playerJoined
      ) {
        statusText.textContent =
          "Click PLAY to resume";
      }
    }
  }
);

usernameInput.addEventListener(
  "keydown",
  (event) => {
    if (
      event.code === "Enter"
    ) {
      playButton.click();
    }
  }
);

/* ======================================================
   SOCKET CONNECTION
====================================================== */

socket.on(
  "connect",
  () => {
    console.log(
      "CONNECTED TO SERVER:",
      socket.id
    );

    localPlayerId =
      socket.id;

    statusText.textContent =
      playerJoined
        ? "Connected"
        : (
          joinRequested
            ? "Joining arena..."
            : "Connected"
        );

    if (
      joinRequested &&
      playerName &&
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
  (reason) => {
    console.log(
      "DISCONNECTED:",
      reason
    );

    playerJoined =
      false;

    localPlayerId =
      null;

    playButton.disabled =
      false;

    startOverlay.style.display =
      "flex";

    statusText.textContent =
      "Disconnected — reconnecting...";

    for (
      const remote of
      otherPlayers.values()
    ) {
      scene.remove(
        remote.group
      );
    }

    otherPlayers.clear();

    updatePlayerCount();
  }
);

socket.on(
  "connect_error",
  (error) => {
    console.error(
      "SOCKET CONNECT ERROR:",
      error
    );

    playButton.disabled =
      false;

    statusText.textContent =
      `Server unavailable — ${
        error.message ||
        "connection failed"
      }`;
  }
);

/* ======================================================
   JOIN ACCEPTED
====================================================== */

socket.on(
  "joinAccepted",
  (data) => {
    console.log(
      "JOIN ACCEPTED:",
      data
    );

    localPlayerId =
      data.id ||
      socket.id;

    playerJoined =
      true;

    playButton.disabled =
      false;

    health =
      Number(
        data.health
      ) || 100;

    score =
      Number(
        data.score
      ) || 0;

    coins =
      Number(
        data.coins
      ) || 0;

    ownedGuns =
      data.ownedGuns ||
      {
        pistol: true
      };

    currentGun =
      data.currentGun ||
      "pistol";

    for (
      const [
        id,
        weapon
      ] of Object.entries(
        GUNS
      )
    ) {
      ammoState[id] = {
        magazine:
          weapon.magazine,

        reserve:
          weapon.reserve
      };
    }

    if (
      data.position
    ) {
      camera.position.set(
        Number(
          data.position.x
        ) || 0,

        Number(
          data.position.y
        ) || groundY,

        Number(
          data.position.z
        ) || 25
      );
    }

    verticalVelocity =
      0;

    isGrounded =
      true;

    isCrouched =
      false;

    applyGunVisual();

    updateHUD();

    renderShop();

    updatePlayerCount();

    statusText.textContent =
      "Connected";

    startOverlay.style.display =
      "none";

    if (
      !controls.isLocked
    ) {
      controls.lock();
    }
  }
);

/* ======================================================
   EXISTING PLAYERS
====================================================== */

socket.on(
  "existingPlayers",
  (players) => {
    if (
      !Array.isArray(
        players
      )
    ) {
      return;
    }

    for (
      const player of
      players
    ) {
      if (
        !player ||
        player.id ===
          localPlayerId
      ) {
        continue;
      }

      const avatar =
        createOtherPlayer(
          player.id,
          player.username ||
            "Player"
        );

      const p =
        player.position ||
        {
          x: 0,
          y: 0,
          z: 0
        };

      const r =
        player.rotation ||
        {
          y: 0
        };

      avatar.position.set(
        Number(p.x) || 0,
        0,
        Number(p.z) || 0
      );

      avatar.rotation.y =
        Number(r.y) || 0;

      const remote =
        otherPlayers.get(
          player.id
        );

      if (remote) {
        remote.targetPosition.copy(
          avatar.position
        );

        remote.targetRotationY =
          avatar.rotation.y;

        remote.health =
          Number(
            player.health ??
            100
          );

        remote.score =
          Number(
            player.score ??
            0
          );
      }
    }

    updatePlayerCount();

    renderScoreboard();
  }
);

/* ======================================================
   PLAYER JOINED
====================================================== */

socket.on(
  "playerJoined",
  (player) => {
    if (
      !player ||
      player.id ===
        localPlayerId
    ) {
      return;
    }

    const avatar =
      createOtherPlayer(
        player.id,
        player.username ||
          "Player"
      );

    const p =
      player.position ||
      {
        x: 0,
        y: 0,
        z: 0
      };

    const r =
      player.rotation ||
      {
        y: 0
      };

    avatar.position.set(
      Number(p.x) || 0,
      0,
      Number(p.z) || 0
    );

    avatar.rotation.y =
      Number(r.y) || 0;

    updatePlayerCount();

    renderScoreboard();
  }
);

/* ======================================================
   PLAYER MOVED
====================================================== */

socket.on(
  "playerMoved",
  (data) => {
    if (
      !data ||
      data.id ===
        localPlayerId
    ) {
      return;
    }

    let remote =
      otherPlayers.get(
        data.id
      );

    if (!remote) {
      createOtherPlayer(
        data.id,
        data.username ||
          "Player"
      );

      remote =
        otherPlayers.get(
          data.id
        );
    }

    if (
      !remote ||
      !data.position
    ) {
      return;
    }

    remote.targetPosition.set(
      Number(
        data.position.x
      ) || 0,

      0,

      Number(
        data.position.z
      ) || 0
    );

    if (
      data.rotation
    ) {
      remote.targetRotationY =
        Number(
          data.rotation.y
        ) || 0;
    }

    if (
      typeof data.health ===
      "number"
    ) {
      remote.health =
        data.health;
    }

    if (
      typeof data.score ===
      "number"
    ) {
      remote.score =
        data.score;
    }
  }
);

/* ======================================================
   PLAYER LEFT
====================================================== */

socket.on(
  "playerLeft",
  (id) => {
    removeOtherPlayer(
      id
    );

    updatePlayerCount();

    renderScoreboard();
  }
);

/* ======================================================
   PLAYER COUNT
====================================================== */

socket.on(
  "playerCount",
  (count) => {
    playerCountValue.textContent =
      String(
        Number(count) || 0
      );
  }
);

/* ======================================================
   PLAYER SHOT
====================================================== */

socket.on(
  "playerShot",
  (data) => {
    if (!data) {
      return;
    }

    const shooterId =
      data.id ||
      data.ownerId;

    if (
      shooterId ===
      localPlayerId
    ) {
      return;
    }

    if (
      !data.origin ||
      !data.direction
    ) {
      return;
    }

    const origin =
      new THREE.Vector3(
        data.origin.x,
        data.origin.y,
        data.origin.z
      );

    const direction =
      new THREE.Vector3(
        data.direction.x,
        data.direction.y,
        data.direction.z
      ).normalize();

    createTracer(
      origin,
      direction,
      data.gunId ||
        "pistol"
    );
  }
);

/* ======================================================
   PLAYER HIT
====================================================== */

socket.on(
  "playerHit",
  (data) => {
    if (
      !data ||
      data.targetId !==
        localPlayerId
    ) {
      return;
    }

    health =
      Math.max(
        0,
        Number(
          data.health
        ) || 0
      );

    updateHUD();

    flashDamage();

    if (
      health <= 0
    ) {
      controls.unlock();

      startOverlay.style.display =
        "flex";

      statusText.textContent =
        `Eliminated by ${
          data.attackerName ||
          "enemy"
        }`;
    }
  }
);

/* ======================================================
   SCORE UPDATE
====================================================== */

socket.on(
  "scoreUpdate",
  (data) => {
    if (
      !data ||
      data.id !==
        localPlayerId
    ) {
      return;
    }

    score =
      Number(
        data.score
      ) || 0;

    updateHUD();

    renderScoreboard();
  }
);

/* ======================================================
   CURRENCY UPDATE
====================================================== */

socket.on(
  "currencyUpdate",
  (data) => {
    if (
      !data ||
      data.id !==
        localPlayerId
    ) {
      return;
    }

    coins =
      Number(
        data.coins
      ) || 0;

    updateHUD();

    renderShop();
  }
);

/* ======================================================
   GUN INVENTORY
====================================================== */

socket.on(
  "gunInventory",
  (data) => {
    if (!data) {
      return;
    }

    ownedGuns =
      data.ownedGuns ||
      ownedGuns;

    currentGun =
      data.currentGun ||
      currentGun;

    isReloading =
      false;

    if (
      reloadTimeout
    ) {
      clearTimeout(
        reloadTimeout
      );

      reloadTimeout =
        null;
    }

    applyGunVisual();

    updateAmmoDisplay();

    renderShop();
  }
);

/* ======================================================
   GUN PURCHASED
====================================================== */

socket.on(
  "gunPurchased",
  (data) => {
    if (!data) {
      return;
    }

    ownedGuns =
      data.ownedGuns ||
      ownedGuns;

    coins =
      Number(
        data.coins
      ) || 0;

    currentGun =
      data.currentGun ||
      currentGun;

    applyGunVisual();

    updateHUD();

    renderShop();
  }
);

/* ======================================================
   GUN EQUIPPED
====================================================== */

socket.on(
  "gunEquipped",
  (data) => {
    if (!data) {
      return;
    }

    currentGun =
      data.gunId ||
      currentGun;

    if (
      data.ownedGuns
    ) {
      ownedGuns =
        data.ownedGuns;
    }

    applyGunVisual();

    updateAmmoDisplay();

    renderShop();
  }
);

/* ======================================================
   PURCHASE FAILED
====================================================== */

socket.on(
  "gunPurchaseFailed",
  (data) => {
    statusText.textContent =
      data?.message ||
      "Purchase failed";

    setTimeout(
      () => {
        if (
          controls.isLocked
        ) {
          statusText.textContent =
            "Connected";
        }
      },
      1200
    );
  }
);

/* ======================================================
   SHOP ERROR
====================================================== */

socket.on(
  "shopError",
  (message) => {
    console.warn(
      "SHOP ERROR:",
      message
    );
  }
);

/* ======================================================
   ELIMINATION
====================================================== */

socket.on(
  "playerEliminated",
  (data) => {
    if (!data) {
      return;
    }

    addKillFeed(
      `${
        data.attackerName ||
        "Player"
      } eliminated ${
        data.targetName ||
        "Player"
      }`
    );

    if (
      data.attackerId ===
      localPlayerId
    ) {
      showKillMessage(
        "ELIMINATED +10 COINS"
      );
    }
  }
);

/* ======================================================
   RESPAWN
====================================================== */

socket.on(
  "respawn",
  (data) => {
    if (!data) {
      return;
    }

    health =
      Number(
        data.health
      ) || 100;

    if (
      data.position
    ) {
      camera.position.set(
        Number(
          data.position.x
        ) || 0,

        Number(
          data.position.y
        ) || groundY,

        Number(
          data.position.z
        ) || 0
      );
    }

    verticalVelocity =
      0;

    isGrounded =
      true;

    isCrouched =
      false;

    refillCurrentMagazine();

    playerJoined =
      true;

    updateHUD();

    startOverlay.style.display =
      "flex";

    statusText.textContent =
      "Click PLAY to resume";

    renderScoreboard();
  }
);

/* ======================================================
   PLAYER COUNT HELPER
====================================================== */

function updatePlayerCount() {
  playerCountValue.textContent =
    String(
      otherPlayers.size +
      (
        playerJoined
          ? 1
          : 0
      )
    );
}

/* ======================================================
   INITIALIZE
====================================================== */

updateHUD();

applyGunVisual();

renderShop();

updatePlayerCount();

usernameInput.focus();

/* ======================================================
   RESIZE
====================================================== */

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }
);

/* ======================================================
   PROJECTILES
====================================================== */

function updateProjectiles(
  delta
) {
  for (
    let i =
      projectiles.length - 1;
    i >= 0;
    i--
  ) {
    const projectile =
      projectiles[i];

    projectile.age +=
      delta;

    projectile.mesh.position.addScaledVector(
      projectile.velocity,
      delta
    );

    if (
      projectile.age >
      0.25
    ) {
      scene.remove(
        projectile.mesh
      );

      projectiles.splice(
        i,
        1
      );
    }
  }
}

/* ======================================================
   GAME LOOP
====================================================== */

function animate() {
  requestAnimationFrame(
    animate
  );

  const delta =
    Math.min(
      clock.getDelta(),
      0.05
    );

  updateMovement(
    delta
  );

  updateRemotePlayers(
    delta
  );

  updateProjectiles(
    delta
  );

  updateGun();

  if (
    scoreOpen
  ) {
    renderScoreboard();
  }

  renderer.render(
    scene,
    camera
  );
}

animate();
