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
   DEATH SCREEN
====================================================== */

function showDeathScreen() {

  isDead = true;

  firing = false;
  isAiming = false;
  isReloading = false;

  movement.forward = false;
  movement.backward = false;
  movement.left = false;
  movement.right = false;
  movement.sprint = false;
  movement.crouch = false;

  if (controls.isLocked) {
    controls.unlock();
  }

  startOverlay.style.display =
    "flex";

  const title =
    startOverlay.querySelector(
      "h1"
    );

  if (title) {
    title.textContent =
      "YOU DIED";

    title.style.color =
      "#ff4565";

    title.style.textShadow =
      "0 0 25px rgba(255,50,80,.8)";
  }

  usernameInput.style.display =
    "none";

  playButton.style.display =
    "none";

  statusText.textContent =
    "RESPAWNING...";

  statusText.style.color =
    "#ff4565";
}

function hideDeathScreen() {

  isDead = false;

  const title =
    startOverlay.querySelector(
      "h1"
    );

  if (title) {
    title.textContent =
      "NEON STRIKE";

    title.style.color =
      "";

    title.style.textShadow =
      "";
  }

  usernameInput.style.display =
    "";

  playButton.style.display =
    "";

  playButton.textContent =
    "PLAY";

  statusText.textContent =
    "Connected";

  statusText.style.color =
    "";
}

/* ======================================================
   SHOP
====================================================== */

function openGunShop() {

  if (
    !playerJoined ||
    isDead ||
    isShopOpen
  ) {
    return;
  }

  isShopOpen = true;

  firing = false;
  isAiming = false;

  if (controls.isLocked) {
    controls.unlock();
  }

  renderer.domElement.style.cursor =
    "default";

  startOverlay.style.display =
    "none";

  renderShop();

  shopPanel.style.display =
    "block";
}

function closeGunShop() {

  if (!isShopOpen) {
    return;
  }

  isShopOpen = false;

  shopPanel.style.display =
    "none";

  renderer.domElement.style.cursor =
    "default";

  startOverlay.style.display =
    "flex";

  playButton.textContent =
    "RESUME";

  statusText.textContent =
    "Click RESUME to return to the match";
}

function renderShop() {

  shopCoins.textContent =
    "Coins: " + coins;

  gunList.innerHTML =
    "";

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
            · Fire rate:
            ${Math.round(
              60000 /
              weapon.cooldown
            )}/min
            · Magazine:
            ${weapon.magazine}

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

        if (equipped) {
          return;
        }

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
      b.score -
      a.score
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

    if (isShopOpen || isDead) {
      return;
    }

    const key =
      event.key.toLowerCase();

    if (key === "w") {
      movement.forward = true;
    }

    if (key === "s") {
      movement.backward = true;
    }

    if (key === "a") {
      movement.left = true;
    }

    if (key === "d") {
      movement.right = true;
    }

    if (
      event.key === "Shift"
    ) {
      movement.sprint = true;
    }

    if (
      event.code === "Space"
    ) {

      event.preventDefault();

      if (
        isGrounded &&
        controls.isLocked
      ) {

        verticalVelocity =
          10;

        isGrounded =
          false;
      }
    }

    if (key === "c") {
      movement.crouch = true;
    }

    if (key === "r") {
      reload();
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

        if (
          currentGun !==
          gunId
        ) {

          currentGun =
            gunId;

          isReloading =
            false;

          clearTimeout(
            reloadTimeout
          );

          applyGunVisual();
        }
      }
    }
  }
);

window.addEventListener(
  "keyup",
  event => {

    const key =
      event.key.toLowerCase();

    if (key === "w") {
      movement.forward = false;
    }

    if (key === "s") {
      movement.backward = false;
    }

    if (key === "a") {
      movement.left = false;
    }

    if (key === "d") {
      movement.right = false;
    }

    if (
      event.key === "Shift"
    ) {
      movement.sprint = false;
    }

    if (key === "c") {
      movement.crouch = false;
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

/*
  Prevent stuck WASD when the
  browser loses focus.
*/

window.addEventListener(
  "blur",
  () => {

    movement.forward = false;
    movement.backward = false;
    movement.left = false;
    movement.right = false;
    movement.sprint = false;
    movement.crouch = false;

    firing = false;
  }
);

/* ======================================================
   MOUSE
====================================================== */

window.addEventListener(
  "mousedown",
  event => {

    if (
      isShopOpen ||
      isDead ||
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
   PLAY
====================================================== */

playButton.addEventListener(
  "click",
  () => {

    if (isDead) {
      return;
    }

    if (playerJoined) {

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
      !isShopOpen &&
      !isDead
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

    movement.forward = false;
    movement.backward = false;
    movement.left = false;
    movement.right = false;
    movement.sprint = false;

    if (
      isShopOpen ||
      isDead
    ) {
      return;
    }

    if (playerJoined) {

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

/* ======================================================
   SOCKET CONNECTION
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

/* ======================================================
   JOIN
====================================================== */

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
      data.ownedGuns || {
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

    camera.rotation.order =
      "YXZ";

    camera.rotation.y =
      yaw;

    camera.rotation.x =
      pitch;

    playerJoined =
      true;

    joinRequested =
      false;

    isDead =
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

    updateCamera();

    controls.lock();
  }
);

/* ======================================================
   LOCAL AVATAR
====================================================== */

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

  /*
    Always hidden because
    this is first-person only.
  */

  avatar.visible =
    false;

  otherPlayers.set(
    localPlayerId,
    avatar
  );
}

/* ======================================================
   EXISTING PLAYERS
====================================================== */

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

/* ======================================================
   HP
====================================================== */

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
      Math.max(
        0,
        data.health
      );

    updateHUD();

    damageFlash.style.opacity =
      "1";

    setTimeout(() => {

      damageFlash.style.opacity =
        "0";

    }, 100);
  }
);

/* ======================================================
   SCORE
====================================================== */

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

/* ======================================================
   COINS
====================================================== */

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

/* ======================================================
   GUN PURCHASE
====================================================== */

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

/* ======================================================
   EQUIP GUN
====================================================== */

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

/* ======================================================
   REMOTE SHOOTING
====================================================== */

socket.on(
  "playerShot",
  data => {

    if (
      data.id ===
      localPlayerId
    ) {
      return;
    }

    const direction =
      new THREE.Vector3(
        data.direction.x,
        data.direction.y,
        data.direction.z
      ).normalize();

    createProjectile(
      new THREE.Vector3(
        data.origin.x,
        data.origin.y,
        data.origin.z
      ),
      direction,
      GUNS[
        data.gunId
      ]?.color ||
        0x00eaff,
      data.gunId ||
        "pistol",
      false
    );
  }
);

/* ======================================================
   ELIMINATION
====================================================== */

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

      /*
        Show YOU DIED instead of
        the normal pause screen.
      */

      showDeathScreen();
    }
  }
);

/* ======================================================
   RESPAWN
====================================================== */

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

    firing =
      false;

    isReloading =
      false;

    clearTimeout(
      reloadTimeout
    );

    updateHUD();

    hideDeathScreen();

    /*
      The server has already
      respawned the player.

      The browser may require a
      user click before Pointer Lock
      can be activated again.
    */

    startOverlay.style.display =
      "flex";

    playButton.textContent =
      "PLAY";

    statusText.textContent =
      "RESPAWNED — CLICK PLAY";

    renderer.domElement.style.cursor =
      "default";

    updateCamera();
  }
);

/* ======================================================
   GUN ANIMATION
====================================================== */

function updateGun(delta) {

  if (!gun) {
    return;
  }

  /*
    Recoil recovery
  */

  gunRecoil *=
    Math.pow(
      0.02,
      delta
    );

  /*
    Reload animation.

    The weapon moves down,
    rotates, then returns.
  */

  if (isReloading) {

    const weapon =
      GUNS[currentGun];

    const reloadDuration =
      weapon.reload;

    const elapsed =
      reloadDuration -
      Math.max(
        0,
        reloadTimeout?._idleTimeout ||
        0
      );

    reloadAnimation +=
      delta /
      (reloadDuration / 1000);

    const t =
      Math.min(
        1,
        reloadAnimation
      );

    /*
      Smooth sine animation.
    */

    const down =
      Math.sin(
        t * Math.PI
      );

    gun.position.copy(
      gunBasePosition
    );

    gun.position.y -=
      down * 0.22;

    gun.position.z +=
      down * 0.12;

    gun.rotation.x =
      down * 0.3;

    gun.rotation.z =
      down * -0.18;

  } else {

    gun.position.copy(
      gunBasePosition
    );

    gun.position.z +=
      gunRecoil;

    gun.rotation.x =
      -gunRecoil * 2.5;

    gun.rotation.z =
      0;
  }

  /*
    Small idle weapon movement.
  */

  if (
    !isReloading &&
    !firing
  ) {

    const time =
      performance.now() *
      0.002;

    gun.position.y +=
      Math.sin(time) *
      0.006;
  }

  /*
    Muzzle flash timer.
  */

  if (
    muzzleFlashTimer > 0
  ) {

    muzzleFlashTimer -=
      delta;

    if (
      muzzleFlashTimer <= 0
    ) {
      muzzleFlashTimer = 0;
    }
  }
}

/* ======================================================
   PROJECTILE ANIMATION
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

    projectile.life -=
      delta;

    if (
      projectile.impact
    ) {

      const scale =
        1 +
        projectile.age *
        5;

      projectile.mesh.scale.set(
        scale,
        scale,
        scale
      );

      projectile.mesh.material.opacity =
        Math.max(
          0,
          projectile.life /
            0.18
        );

    } else {

      const previous =
        projectile.mesh.position.clone();

      projectile.mesh.position.add(
        projectile.velocity
          .clone()
          .multiplyScalar(delta)
      );

      /*
        Add slight glowing pulse
        to the projectile.
      */

      const pulse =
        1 +
        Math.sin(
          projectile.age *
          70
        ) *
        0.15;

      projectile.mesh.scale.set(
        pulse,
        pulse,
        pulse
      );

      /*
        Stop the projectile if it
        travels too long.
      */

      if (
        projectile.age >
        0.45
      ) {
        projectile.life =
          0;
      }
    }

    if (
      projectile.life <= 0
    ) {

      scene.remove(
        projectile.mesh
      );

      projectile.mesh.traverse(
        child => {

          if (
            child.geometry
          ) {
            child.geometry.dispose();
          }

          if (
            child.material
          ) {

            if (
              Array.isArray(
                child.material
              )
            ) {

              child.material.forEach(
                material =>
                  material.dispose()
              );

            } else {

              child.material.dispose();
            }
          }
        }
      );

      projectiles.splice(
        i,
        1
      );
    }
  }
}

/* ======================================================
   ANIMATION
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

  if (
    firing &&
    GUNS[currentGun]
      ?.automatic &&
    !isShopOpen &&
    !isDead
  ) {

    shoot();
  }

  updateMovement(
    delta
  );

  updateCamera();

  updateRemotePlayers();

  updateGun(
    delta
  );

  updateProjectiles(
    delta
  );

  reactor.rotation.y +=
    delta * 0.7;

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
