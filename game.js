/* ======================================================
   NEON STRIKE - REBUILT MULTIPLAYER SERVER
====================================================== */

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();

const server =
  http.createServer(app);

const io =
  new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

const PORT =
  process.env.PORT || 3000;

app.use(
  express.json()
);

app.use(
  express.static(
    path.join(__dirname)
  )
);

app.get(
  "/health",
  (req, res) => {
    res.json({
      ok: true,
      players:
        players.size
    });
  }
);

app.get(
  "/",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);

/* ======================================================
   WEAPONS
====================================================== */

const GUNS = {
  pistol: {
    name: "Pistol",
    price: 0,
    damage: 25,
    cooldown: 220
  },

  smg: {
    name: "SMG",
    price: 20,
    damage: 15,
    cooldown: 75
  },

  shotgun: {
    name: "Shotgun",
    price: 40,
    damage: 12,
    cooldown: 700
  },

  rifle: {
    name: "Assault Rifle",
    price: 60,
    damage: 35,
    cooldown: 150
  },

  railgun: {
    name: "Railgun",
    price: 100,
    damage: 80,
    cooldown: 1000
  }
};

/* ======================================================
   PLAYERS
====================================================== */

const players =
  new Map();

/* ======================================================
   MAP COLLISION
====================================================== */

const collisionBoxes = [];

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

/* Outer walls */

addCollisionBox(
  0,
  0,
  -60,
  120,
  10,
  1.2
);

addCollisionBox(
  0,
  0,
  60,
  120,
  10,
  1.2
);

addCollisionBox(
  -60,
  0,
  0,
  1.2,
  10,
  120
);

addCollisionBox(
  60,
  0,
  0,
  1.2,
  10,
  120
);

/* Towers */

addCollisionBox(
  -42,
  0,
  -38,
  17,
  13,
  16
);

addCollisionBox(
  42,
  0,
  -38,
  17,
  13,
  16
);

addCollisionBox(
  -42,
  0,
  38,
  17,
  13,
  16
);

addCollisionBox(
  42,
  0,
  38,
  17,
  13,
  16
);

/* Central structures */

addCollisionBox(
  0,
  0,
  -18,
  30,
  5,
  3
);

addCollisionBox(
  -16,
  0,
  -7,
  3,
  7,
  20
);

addCollisionBox(
  16,
  0,
  -7,
  3,
  7,
  20
);

/* Cover */

const covers = [
  [-30, 2, 13, 2, 3],
  [30, 2, 13, 2, 3],
  [-8, 22, 12, 2, 3],
  [8, 22, 12, 2, 3],
  [-27, -15, 6, 4, 3],
  [27, -15, 6, 4, 3],
  [-24, 24, 7, 4, 4],
  [24, 24, 7, 4, 4]
];

for (
  const [x, z, w, d, h]
  of covers
) {
  addCollisionBox(
    x,
    0,
    z,
    w,
    h,
    d
  );
}

/* Pylons */

addCollisionBox(
  -21,
  0,
  -28,
  2.2,
  9,
  2.2
);

addCollisionBox(
  21,
  0,
  -28,
  2.2,
  9,
  2.2
);

addCollisionBox(
  -21,
  0,
  28,
  2.2,
  9,
  2.2
);

addCollisionBox(
  21,
  0,
  28,
  2.2,
  9,
  2.2
);

/* ======================================================
   SPAWNS
====================================================== */

const spawnPoints = [
  {
    x: -50,
    y: 2.1,
    z: 48
  },

  {
    x: 50,
    y: 2.1,
    z: 48
  },

  {
    x: -50,
    y: 2.1,
    z: -48
  },

  {
    x: 50,
    y: 2.1,
    z: -48
  },

  {
    x: 0,
    y: 2.1,
    z: 48
  },

  {
    x: 0,
    y: 2.1,
    z: 32
  }
];

function getSpawnPoint() {
  return {
    ...spawnPoints[
      Math.floor(
        Math.random() *
          spawnPoints.length
      )
    ]
  };
}

/* ======================================================
   HELPERS
====================================================== */

function safeNumber(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function positionCollides(
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
      position.x + radius >
        box.minX &&
      position.x - radius <
        box.maxX &&
      position.z + radius >
        box.minZ &&
      position.z - radius <
        box.maxZ
    ) {
      return true;
    }
  }

  return false;
}

function normalize(
  x,
  y,
  z
) {
  const length =
    Math.sqrt(
      x * x +
      y * y +
      z * z
    );

  if (
    !Number.isFinite(
      length
    ) ||
    length < 0.000001
  ) {
    return null;
  }

  return {
    x: x / length,
    y: y / length,
    z: z / length
  };
}

/* ======================================================
   RAY / BOX
====================================================== */

function rayAABB(
  origin,
  direction,
  box
) {
  let tMin = 0;
  let tMax = Infinity;

  const axes = [
    [
      origin.x,
      direction.x,
      box.minX,
      box.maxX
    ],

    [
      origin.y,
      direction.y,
      box.minY,
      box.maxY
    ],

    [
      origin.z,
      direction.z,
      box.minZ,
      box.maxZ
    ]
  ];

  for (
    const [
      originValue,
      directionValue,
      min,
      max
    ] of axes
  ) {
    if (
      Math.abs(
        directionValue
      ) < 0.00000001
    ) {
      if (
        originValue < min ||
        originValue > max
      ) {
        return null;
      }

      continue;
    }

    let a =
      (min - originValue) /
      directionValue;

    let b =
      (max - originValue) /
      directionValue;

    if (a > b) {
      [
        a,
        b
      ] = [
        b,
        a
      ];
    }

    tMin =
      Math.max(
        tMin,
        a
      );

    tMax =
      Math.min(
        tMax,
        b
      );

    if (
      tMin > tMax
    ) {
      return null;
    }
  }

  if (tMin >= 0)
    return tMin;

  if (tMax >= 0)
    return tMax;

  return null;
}

function nearestWallDistance(
  origin,
  direction,
  maximum = 120
) {
  let best =
    maximum;

  for (
    const box of collisionBoxes
  ) {
    const distance =
      rayAABB(
        origin,
        direction,
        box
      );

    if (
      distance !== null &&
      distance >= 0 &&
      distance < best
    ) {
      best =
        distance;
    }
  }

  return best;
}

function raySphere(
  origin,
  direction,
  center,
  radius
) {
  const ox =
    origin.x -
    center.x;

  const oy =
    origin.y -
    center.y;

  const oz =
    origin.z -
    center.z;

  const b =
    ox * direction.x +
    oy * direction.y +
    oz * direction.z;

  const c =
    ox * ox +
    oy * oy +
    oz * oz -
    radius * radius;

  const discriminant =
    b * b - c;

  if (
    discriminant < 0
  ) {
    return null;
  }

  const distance =
    -b -
    Math.sqrt(
      discriminant
    );

  return distance >= 0
    ? distance
    : null;
}

/* ======================================================
   SNAPSHOTS
====================================================== */

function snapshot(
  player
) {
  return {
    id: player.id,

    username:
      player.username,

    position: {
      ...player.position
    },

    rotation: {
      ...player.rotation
    },

    health:
      player.health,

    score:
      player.score
  };
}

function allPlayers(
  exclude = null
) {
  const result = [];

  for (
    const player
    of players.values()
  ) {
    if (
      player.id !==
      exclude
    ) {
      result.push(
        snapshot(player)
      );
    }
  }

  return result;
}

function stateFor(
  player
) {
  return {
    id: player.id,

    username:
      player.username,

    health:
      player.health,

    score:
      player.score,

    coins:
      player.coins,

    ownedGuns:
      player.ownedGuns,

    currentGun:
      player.currentGun,

    position:
      player.position,

    rotation:
      player.rotation
  };
}

/* ======================================================
   SOCKET.IO
====================================================== */

io.on(
  "connection",
  socket => {
    console.log(
      "CONNECTED:",
      socket.id
    );

    socket.emit(
      "playerCount",
      players.size
    );

    /* JOIN */

    socket.on(
      "joinGame",
      data => {
        let player =
          players.get(
            socket.id
          );

        if (player) {
          socket.emit(
            "joinAccepted",
            stateFor(player)
          );

          return;
        }

        let username =
          String(
            data?.username ||
              "Player"
          )
            .trim()
            .replace(
              /[^\w\- ]/g,
              ""
            )
            .slice(0, 16);

        if (!username) {
          username =
            "Player" +
            Math.floor(
              Math.random() *
                9000 +
                1000
            );
        }

        const spawn =
          getSpawnPoint();

        player = {
          id: socket.id,

          username,

          health: 100,

          score: 0,

          /* Give new players coins
             so the shop can actually
             be tested immediately. */

          coins: 100,

          ownedGuns: {
            pistol: true
          },

          currentGun:
            "pistol",

          position: {
            ...spawn
          },

          rotation: {
            x: 0,
            y: 0,
            z: 0
          },

          lastShot: 0,

          alive: true
        };

        players.set(
          socket.id,
          player
        );

        socket.emit(
          "joinAccepted",
          stateFor(player)
        );

        socket.emit(
          "existingPlayers",
          allPlayers(
            socket.id
          )
        );

        socket.broadcast.emit(
          "playerJoined",
          snapshot(player)
        );

        io.emit(
          "playerCount",
          players.size
        );

        console.log(
          `${username} joined the game`
        );
      }
    );

    /* MOVEMENT */

    socket.on(
      "playerMove",
      data => {
        const player =
          players.get(
            socket.id
          );

        if (
          !player ||
          !player.alive ||
          !data?.position
        ) {
          return;
        }

        const next = {
          x: clamp(
            safeNumber(
              data.position.x,
              player.position.x
            ),
            -58,
            58
          ),

          y: clamp(
            safeNumber(
              data.position.y,
              player.position.y
            ),
            2.1,
            6
          ),

          z: clamp(
            safeNumber(
              data.position.z,
              player.position.z
            ),
            -58,
            58
          )
        };

        const dx =
          next.x -
          player.position.x;

        const dz =
          next.z -
          player.position.z;

        /* Prevent teleporting */

        if (
          Math.abs(dx) >
            2.2 ||
          Math.abs(dz) >
            2.2
        ) {
          return;
        }

        if (
          !positionCollides(
            next
          )
        ) {
          player.position =
            next;
        }

        if (
          data.rotation
        ) {
          player.rotation = {
            x: clamp(
              safeNumber(
                data.rotation.x,
                player.rotation.x
              ),
              -1.55,
              1.55
            ),

            y: safeNumber(
              data.rotation.y,
              player.rotation.y
            ),

            z: 0
          };
        }

        socket.broadcast.emit(
          "playerMoved",
          snapshot(player)
        );
      }
    );

    /* ==================================================
       SHOOT
    ================================================== */

    socket.on(
      "shoot",
      data => {
        const shooter =
          players.get(
            socket.id
          );

        if (
          !shooter ||
          !shooter.alive ||
          !data?.origin ||
          !data?.direction
        ) {
          return;
        }

        const gunId =
          GUNS[data.gunId]
            ? data.gunId
            : "pistol";

        if (
          !shooter.ownedGuns[
            gunId
          ]
        ) {
          return;
        }

        const weapon =
          GUNS[gunId];

        const now =
          Date.now();

        if (
          now -
            shooter.lastShot <
          weapon.cooldown
        ) {
          return;
        }

        shooter.lastShot =
          now;

        let origin = {
          x: safeNumber(
            data.origin.x,
            shooter.position.x
          ),

          y: safeNumber(
            data.origin.y,
            shooter.position.y +
              1.2
          ),

          z: safeNumber(
            data.origin.z,
            shooter.position.z
          )
        };

        /*
          Don't trust a wildly
          distant client origin.
        */

        const originDistance =
          Math.sqrt(
            Math.pow(
              origin.x -
                shooter.position.x,
              2
            ) +
            Math.pow(
              origin.y -
                shooter.position.y,
              2
            ) +
            Math.pow(
              origin.z -
                shooter.position.z,
              2
            )
          );

        if (
          originDistance > 4
        ) {
          origin = {
            x: shooter.position.x,

            y:
              shooter.position.y +
              1.4,

            z: shooter.position.z
          };
        }

        const direction =
          normalize(
            safeNumber(
              data.direction.x
            ),
            safeNumber(
              data.direction.y
            ),
            safeNumber(
              data.direction.z
            )
          );

        if (!direction)
          return;

        /* Tell everyone else about
           the shot for visuals. */

        socket.broadcast.emit(
          "playerShot",
          {
            id:
              shooter.id,

            origin,

            direction,

            gunId
          }
        );

        /* Wall distance */

        const wallDistance =
          nearestWallDistance(
            origin,
            direction,
            120
          );

        let target = null;
        let targetDistance =
          wallDistance;

        /* Hit detection */

        for (
          const candidate
          of players.values()
        ) {
          if (
            candidate.id ===
              shooter.id ||
            !candidate.alive ||
            candidate.health <= 0
          ) {
            continue;
          }

          const head = {
            x:
              candidate.position.x,

            y:
              candidate.position.y +
              1.65,

            z:
              candidate.position.z
          };

          const body = {
            x:
              candidate.position.x,

            y:
              candidate.position.y +
              0.9,

            z:
              candidate.position.z
          };

          const headHit =
            raySphere(
              origin,
              direction,
              head,
              0.43
            );

          const bodyHit =
            raySphere(
              origin,
              direction,
              body,
              0.7
            );

          let hitDistance =
            Infinity;

          let damage =
            weapon.damage;

          if (
            headHit !== null
          ) {
            hitDistance =
              headHit;

            damage =
              Math.round(
                weapon.damage *
                  1.5
              );
          }

          if (
            bodyHit !== null &&
            bodyHit <
              hitDistance
          ) {
            hitDistance =
              bodyHit;

            damage =
              weapon.damage;
          }

          if (
            hitDistance <
            targetDistance
          ) {
            targetDistance =
              hitDistance;

            target =
              candidate;

            target.__pendingDamage =
              damage;
          }
        }

        if (!target)
          return;

        const damage =
          target.__pendingDamage ||
          weapon.damage;

        delete target.__pendingDamage;

        target.health =
          Math.max(
            0,
            target.health -
              damage
          );

        const targetSocket =
          io.sockets.sockets.get(
            target.id
          );

        if (targetSocket) {
          targetSocket.emit(
            "playerHit",
            {
              targetId:
                target.id,

              health:
                target.health,

              attackerId:
                shooter.id,

              attackerName:
                shooter.username
            }
          );
        }

        io.emit(
          "playerMoved",
          snapshot(target)
        );

        /* ELIMINATION */

        if (
          target.health <= 0
        ) {
          target.alive =
            false;

          shooter.score++;

          shooter.coins +=
            10;

          socket.emit(
            "scoreUpdate",
            {
              id:
                shooter.id,

              score:
                shooter.score
            }
          );

          socket.emit(
            "currencyUpdate",
            {
              id:
                shooter.id,

              coins:
                shooter.coins
            }
          );

          io.emit(
            "playerEliminated",
            {
              attackerId:
                shooter.id,

              attackerName:
                shooter.username,

              targetId:
                target.id,

              targetName:
                target.username
            }
          );

          /* Respawn */

          setTimeout(
            () => {
              const current =
                players.get(
                  target.id
                );

              if (!current)
                return;

              const spawn =
                getSpawnPoint();

              current.health =
                100;

              current.alive =
                true;

              current.position = {
                ...spawn
              };

              current.rotation = {
                x: 0,
                y: 0,
                z: 0
              };

              const victimSocket =
                io.sockets.sockets.get(
                  current.id
                );

              if (
                victimSocket
              ) {
                victimSocket.emit(
                  "respawn",
                  {
                    id:
                      current.id,

                    health: 100,

                    position:
                      current.position
                  }
                );
              }

              io.emit(
                "playerMoved",
                snapshot(
                  current
                )
              );
            },
            1800
          );
        }
      }
    );

    /* ==================================================
       BUY GUN
    ================================================== */

    socket.on(
      "buyGun",
      gunId => {
        const player =
          players.get(
            socket.id
          );

        const weapon =
          GUNS[gunId];

        if (
          !player ||
          !weapon
        ) {
          return;
        }

        if (
          player.ownedGuns[
            gunId
          ]
        ) {
          return;
        }

        if (
          player.coins <
          weapon.price
        ) {
          socket.emit(
            "gunPurchaseFailed",
            {
              message:
                "Not enough coins"
            }
          );

          return;
        }

        player.coins -=
          weapon.price;

        player.ownedGuns[
          gunId
        ] = true;

        player.currentGun =
          gunId;

        socket.emit(
          "gunPurchased",
          {
            ownedGuns:
              player.ownedGuns,

            coins:
              player.coins,

            currentGun:
              player.currentGun
          }
        );

        socket.emit(
          "currencyUpdate",
          {
            id:
              player.id,

            coins:
              player.coins
          }
        );
      }
    );

    /* ==================================================
       EQUIP GUN
    ================================================== */

    socket.on(
      "equipGun",
      gunId => {
        const player =
          players.get(
            socket.id
          );

        if (
          !player ||
          !GUNS[gunId] ||
          !player.ownedGuns[
            gunId
          ]
        ) {
          return;
        }

        player.currentGun =
          gunId;

        socket.emit(
          "gunInventory",
          {
            ownedGuns:
              player.ownedGuns,

            currentGun:
              player.currentGun
          }
        );
      }
    );

    /* ==================================================
       DISCONNECT
    ================================================== */

    socket.on(
      "disconnect",
      reason => {
        const player =
          players.get(
            socket.id
          );

        if (player) {
          console.log(
            `${player.username} disconnected: ${reason}`
          );
        }

        players.delete(
          socket.id
        );

        io.emit(
          "playerLeft",
          socket.id
        );

        io.emit(
          "playerCount",
          players.size
        );
      }
    );
  }
);

/* ======================================================
   START SERVER
====================================================== */

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Neon Strike server running on port ${PORT}`
    );
  }
);
