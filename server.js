const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT =
  process.env.PORT ||
  3000;

app.use(
  express.json()
);

app.use(
  express.static(
    path.join(
      __dirname
    )
  )
);

/* ======================================================
   HEALTH
====================================================== */

app.get(
  "/health",
  (req, res) => {
    res.json({
      ok: true,
      players: players.size
    });
  }
);

/* ======================================================
   MAIN PAGE
====================================================== */

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
   GAME DATA
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

const players =
  new Map();

const collisionBoxes = [];

/* ======================================================
   SPAWN POINTS
====================================================== */

const spawnPoints = [
  {
    x: -48,
    y: 2.1,
    z: 45
  },

  {
    x: 48,
    y: 2.1,
    z: 45
  },

  {
    x: -48,
    y: 2.1,
    z: -42
  },

  {
    x: 48,
    y: 2.1,
    z: -42
  },

  {
    x: 0,
    y: 2.1,
    z: 45
  },

  {
    x: 0,
    y: 2.1,
    z: 35
  }
];

/* ======================================================
   COLLISION BOXES
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
    minX:
      x - width / 2,

    maxX:
      x + width / 2,

    minY: y,

    maxY:
      y + height,

    minZ:
      z - depth / 2,

    maxZ:
      z + depth / 2
  });
}

/* OUTER WALLS */

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

/* BUILDINGS */

addCollisionBox(
  -40,
  0,
  -27,
  20,
  8,
  18
);

addCollisionBox(
  40,
  0,
  -27,
  20,
  8,
  18
);

addCollisionBox(
  -43,
  0,
  30,
  14,
  6,
  17
);

addCollisionBox(
  43,
  0,
  30,
  14,
  6,
  17
);

/* CENTRAL */

addCollisionBox(
  0,
  0,
  -17,
  28,
  7,
  3
);

addCollisionBox(
  -14,
  0,
  -8,
  3,
  7,
  18
);

addCollisionBox(
  14,
  0,
  -8,
  3,
  7,
  18
);

/* COVER */

addCollisionBox(
  -30,
  0,
  2,
  14,
  3,
  2
);

addCollisionBox(
  30,
  0,
  2,
  14,
  3,
  2
);

addCollisionBox(
  -7,
  0,
  12,
  12,
  3,
  2
);

addCollisionBox(
  7,
  0,
  12,
  12,
  3,
  2
);

/* BLOCKS */

addCollisionBox(
  -27,
  0,
  -16,
  6,
  3,
  4
);

addCollisionBox(
  27,
  0,
  -16,
  6,
  3,
  4
);

addCollisionBox(
  -25,
  0,
  25,
  7,
  4,
  4
);

addCollisionBox(
  25,
  0,
  25,
  7,
  4,
  4
);

/* CRATES */

addCollisionBox(
  -38,
  0,
  -8,
  2.8,
  2.8,
  2.8
);

addCollisionBox(
  -35,
  0,
  -8,
  2.8,
  2.8,
  2.8
);

addCollisionBox(
  -38,
  0,
  -5,
  2.8,
  2.8,
  2.8
);

addCollisionBox(
  -35,
  0,
  -5,
  2.8,
  2.8,
  2.8
);

addCollisionBox(
  38,
  0,
  -8,
  2.8,
  2.8,
  2.8
);

addCollisionBox(
  35,
  0,
  -8,
  2.8,
  2.8,
  2.8
);

addCollisionBox(
  38,
  0,
  -5,
  2.8,
  2.8,
  2.8
);

addCollisionBox(
  35,
  0,
  -5,
  2.8,
  2.8,
  2.8
);

/* ======================================================
   HELPERS
====================================================== */

function safeNumber(
  value,
  fallback = 0
) {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function positionCollides(
  position,
  radius = 0.65
) {
  const limit =
    60 -
    radius -
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
    radius;

  const maxX =
    position.x +
    radius;

  const minZ =
    position.z -
    radius;

  const maxZ =
    position.z +
    radius;

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

function getSpawnPoint() {
  return (
    spawnPoints[
      Math.floor(
        Math.random() *
          spawnPoints.length
      )
    ]
  );
}

function distancePointToRay(
  point,
  origin,
  direction
) {
  const toPoint =
    {
      x:
        point.x -
        origin.x,

      y:
        point.y -
        origin.y,

      z:
        point.z -
        origin.z
    };

  const projection =
    toPoint.x *
      direction.x +
    toPoint.y *
      direction.y +
    toPoint.z *
      direction.z;

  if (
    projection < 0
  ) {
    return Infinity;
  }

  const closest =
    {
      x:
        origin.x +
        direction.x *
          projection,

      y:
        origin.y +
        direction.y *
          projection,

      z:
        origin.z +
        direction.z *
          projection
    };

  return Math.sqrt(
    Math.pow(
      point.x -
        closest.x,
      2
    ) +
      Math.pow(
        point.y -
          closest.y,
        2
      ) +
      Math.pow(
        point.z -
          closest.z,
        2
      )
  );
}

function rayHitsBox(
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
      originAxis,
      directionAxis,
      minAxis,
      maxAxis
    ] of axes
  ) {
    if (
      Math.abs(
        directionAxis
      ) <
      0.000001
    ) {
      if (
        originAxis <
          minAxis ||
        originAxis >
          maxAxis
      ) {
        return null;
      }

      continue;
    }

    let t1 =
      (minAxis -
        originAxis) /
      directionAxis;

    let t2 =
      (maxAxis -
        originAxis) /
      directionAxis;

    if (t1 > t2) {
      [t1, t2] =
        [t2, t1];
    }

    tMin =
      Math.max(
        tMin,
        t1
      );

    tMax =
      Math.min(
        tMax,
        t2
      );

    if (
      tMin >
      tMax
    ) {
      return null;
    }
  }

  return tMin >= 0
    ? tMin
    : tMax >= 0
      ? tMax
      : null;
}

function nearestWallDistance(
  origin,
  direction,
  maxDistance = 120
) {
  let closest =
    maxDistance;

  for (
    const box of
    collisionBoxes
  ) {
    const hit =
      rayHitsBox(
        origin,
        direction,
        box
      );

    if (
      hit !== null &&
      hit <
        closest &&
      hit >= 0
    ) {
      closest = hit;
    }
  }

  return closest;
}

/* ======================================================
   PLAYER SNAPSHOT
====================================================== */

function playerSnapshot(
  player
) {
  return {
    id: player.id,

    username:
      player.username,

    position: {
      x:
        player.position.x,

      y:
        player.position.y,

      z:
        player.position.z
    },

    rotation: {
      x:
        player.rotation.x,

      y:
        player.rotation.y,

      z:
        player.rotation.z
    },

    health:
      player.health,

    score:
      player.score
  };
}

/* ======================================================
   BROADCAST CURRENT PLAYERS
====================================================== */

function getPlayersArray(
  excludeId = null
) {
  const result = [];

  for (
    const player of
    players.values()
  ) {
    if (
      player.id ===
      excludeId
    ) {
      continue;
    }

    result.push(
      playerSnapshot(
        player
      )
    );
  }

  return result;
}

/* ======================================================
   SOCKET CONNECTION
====================================================== */

io.on(
  "connection",
  (socket) => {
    console.log(
      "CONNECTED:",
      socket.id
    );

    socket.emit(
      "playerCount",
      players.size
    );

    /* ==================================================
       JOIN GAME
    ================================================== */

    socket.on(
      "joinGame",
      (data) => {
        let player =
          players.get(
            socket.id
          );

        if (player) {
          socket.emit(
            "joinAccepted",
            {
              id:
                player.id,

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
            }
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
            .slice(
              0,
              16
            );

        if (!username) {
          username =
            `Player${Math.floor(
              Math.random() *
                9000 +
                1000
            )}`;
        }

        const spawn =
          getSpawnPoint();

        player = {
          id:
            socket.id,

          username,

          health: 100,

          score: 0,

          coins: 0,

          ownedGuns: {
            pistol: true
          },

          currentGun:
            "pistol",

          position: {
            x:
              spawn.x,

            y:
              spawn.y,

            z:
              spawn.z
          },

          rotation: {
            x: 0,
            y: 0,
            z: 0
          },

          lastShot:
            0,

          alive: true
        };

        players.set(
          socket.id,
          player
        );

        socket.emit(
          "joinAccepted",
          {
            id:
              player.id,

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
          }
        );

        socket.emit(
          "existingPlayers",
          getPlayersArray(
            socket.id
          )
        );

        socket.broadcast.emit(
          "playerJoined",
          playerSnapshot(
            player
          )
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

    /* ==================================================
       PLAYER MOVE
    ================================================== */

    socket.on(
      "playerMove",
      (data) => {
        const player =
          players.get(
            socket.id
          );

        if (!player) {
          return;
        }

        if (
          !player.alive
        ) {
          return;
        }

        if (
          !data?.position
        ) {
          return;
        }

        const x =
          clamp(
            safeNumber(
              data.position.x,
              player.position.x
            ),
            -58,
            58
          );

        const y =
          clamp(
            safeNumber(
              data.position.y,
              player.position.y
            ),
            1.1,
            6
          );

        const z =
          clamp(
            safeNumber(
              data.position.z,
              player.position.z
            ),
            -58,
            58
          );

        const newPosition = {
          x,
          y,
          z
        };

        /*
          Server validates destination to stop
          impossible movement through obstacles.
        */

        const dx =
          newPosition.x -
          player.position.x;

        const dz =
          newPosition.z -
          player.position.z;

        const maxStep =
          2.2;

        if (
          Math.abs(dx) >
            maxStep ||
          Math.abs(dz) >
            maxStep
        ) {
          return;
        }

        if (
          !positionCollides(
            newPosition
          )
        ) {
          player.position =
            newPosition;
        }

        if (
          data.rotation
        ) {
          player.rotation = {
            x:
              clamp(
                safeNumber(
                  data.rotation.x,
                  0
                ),
                -1.55,
                1.55
              ),

            y:
              safeNumber(
                data.rotation.y,
                0
              ),

            z:
              safeNumber(
                data.rotation.z,
                0
              )
          };
        }

        socket.broadcast.emit(
          "playerMoved",
          playerSnapshot(
            player
          )
        );
      }
    );

    /* ==================================================
       SHOOT
    ================================================== */

    socket.on(
      "shoot",
      (data) => {
        const shooter =
          players.get(
            socket.id
          );

        if (!shooter) {
          return;
        }

        if (
          !shooter.alive
        ) {
          return;
        }

        if (
          !data?.origin ||
          !data?.direction
        ) {
          return;
        }

        const gunId =
          GUNS[
            data.gunId
          ]
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

        const origin = {
          x:
            safeNumber(
              data.origin.x,
              shooter.position.x
            ),

          y:
            safeNumber(
              data.origin.y,
              shooter.position.y
            ),

          z:
            safeNumber(
              data.origin.z,
              shooter.position.z
            )
        };

        let dx =
          safeNumber(
            data.direction.x,
            0
          );

        let dy =
          safeNumber(
            data.direction.y,
            0
          );

        let dz =
          safeNumber(
            data.direction.z,
            -1
          );

        const length =
          Math.sqrt(
            dx * dx +
            dy * dy +
            dz * dz
          );

        if (
          !Number.isFinite(
            length
          ) ||
          length <
            0.000001
        ) {
          return;
        }

        dx /= length;
        dy /= length;
        dz /= length;

        const direction = {
          x: dx,
          y: dy,
          z: dz
        };

        const wallDistance =
          nearestWallDistance(
            origin,
            direction,
            120
          );

        let closestTarget =
          null;

        let closestDistance =
          wallDistance;

        /* ==============================================
           FIND PLAYER HIT
        ============================================== */

        for (
          const target of
          players.values()
        ) {
          if (
            target.id ===
              shooter.id ||
            !target.alive ||
            target.health <= 0
          ) {
            continue;
          }

          const headPoint = {
            x:
              target.position.x,

            y:
              target.position.y +
              1.0,

            z:
              target.position.z
          };

          const bodyPoint = {
            x:
              target.position.x,

            y:
              target.position.y +
              0.25,

            z:
              target.position.z
          };

          const headDistance =
            distancePointToRay(
              headPoint,
              origin,
              direction
            );

          const bodyDistance =
            distancePointToRay(
              bodyPoint,
              origin,
              direction
            );

          const hitRadius =
            0.95;

          let hitDistance =
            Infinity;

          if (
            headDistance <
            hitRadius
          ) {
            hitDistance =
              Math.sqrt(
                Math.pow(
                  headPoint.x -
                    origin.x,
                  2
                ) +
                  Math.pow(
                    headPoint.y -
                      origin.y,
                    2
                  ) +
                  Math.pow(
                    headPoint.z -
                      origin.z,
                    2
                  )
              );
          }

          if (
            bodyDistance <
              hitRadius &&
            bodyDistance <
              hitDistance
          ) {
            hitDistance =
              Math.sqrt(
                Math.pow(
                  bodyPoint.x -
                    origin.x,
                  2
                ) +
                  Math.pow(
                    bodyPoint.y -
                      origin.y,
                    2
                  ) +
                  Math.pow(
                    bodyPoint.z -
                      origin.z,
                    2
                  )
              );
          }

          if (
            hitDistance <
            closestDistance
          ) {
            closestDistance =
              hitDistance;

            closestTarget =
              target;
          }
        }

        /* ==============================================
           SHOOT EVENT FOR OTHER CLIENTS
        ============================================== */

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

        /* ==============================================
           APPLY DAMAGE
        ============================================== */

        if (
          !closestTarget
        ) {
          return;
        }

        closestTarget.health =
          Math.max(
            0,
            closestTarget.health -
              weapon.damage
          );

        const targetSocket =
          io.sockets.sockets.get(
            closestTarget.id
          );

        if (
          targetSocket
        ) {
          targetSocket.emit(
            "playerHit",
            {
              targetId:
                closestTarget.id,

              health:
                closestTarget.health,

              attackerId:
                shooter.id,

              attackerName:
                shooter.username
            }
          );
        }

        socket.emit(
          "scoreUpdate",
          {
            id:
              shooter.id,

            score:
              shooter.score
          }
        );

        io.emit(
          "playerMoved",
          playerSnapshot(
            closestTarget
          )
        );

        /* ==============================================
           ELIMINATION
        ============================================== */

        if (
          closestTarget.health <= 0
        ) {
          closestTarget.alive =
            false;

          shooter.score += 1;
          shooter.coins += 10;

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
                closestTarget.id,

              targetName:
                closestTarget.username
            }
          );

          setTimeout(
            () => {
              const current =
                players.get(
                  closestTarget.id
                );

              if (!current) {
                return;
              }

              const spawn =
                getSpawnPoint();

              current.health =
                100;

              current.alive =
                true;

              current.position =
                {
                  x:
                    spawn.x,

                  y:
                    spawn.y,

                  z:
                    spawn.z
                };

              current.rotation =
                {
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

                    health:
                      current.health,

                    position:
                      current.position
                  }
                );
              }

              io.emit(
                "playerMoved",
                playerSnapshot(
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
      (gunId) => {
        const player =
          players.get(
            socket.id
          );

        if (!player) {
          return;
        }

        const gun =
          GUNS[gunId];

        if (!gun) {
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
          gun.price
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
          gun.price;

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

        console.log(
          `${player.username} bought ${gun.name}`
        );
      }
    );

    /* ==================================================
       EQUIP GUN
    ================================================== */

    socket.on(
      "equipGun",
      (gunId) => {
        const player =
          players.get(
            socket.id
          );

        if (!player) {
          return;
        }

        if (
          !GUNS[gunId]
        ) {
          return;
        }

        if (
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

        console.log(
          `${player.username} equipped ${gunId}`
        );
      }
    );

    /* ==================================================
       DISCONNECT
    ================================================== */

    socket.on(
      "disconnect",
      (reason) => {
        const player =
          players.get(
            socket.id
          );

        if (player) {
          console.log(
            `${player.username} disconnected: ${reason}`
          );
        } else {
          console.log(
            `Player disconnected: ${socket.id}`
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
