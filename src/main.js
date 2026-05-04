import Phaser from "phaser";
import "./styles.css";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 720;

const ASSETS = {
  background: "/assets/space-background.png",
  player: "/assets/player-ship.png",
  asteroid: "/assets/asteroid-large.png",
  enemy: "/assets/enemy-ufo.png",
  laser: "/assets/laser-bolt.png",
  explosion: "/assets/explosion-sheet.png",
  shipExplosion: "/assets/ship-explosion-sheet.png",
  powerups: "/assets/powerups-sheet.png",
};

const POWERUPS = [
  { key: "shield", frame: 0, label: "SHIELD", color: 0x50e4ff },
  { key: "rapid", frame: 1, label: "RAPID", color: 0xffb23c },
  { key: "double", frame: 2, label: "DOUBLE", color: 0xff4de1 },
  { key: "repair", frame: 3, label: "REPAIR", color: 0xff5a6a },
];

const POWERUP_SIZE = 46;
const POWERUP_PICKUP_RADIUS = 58;
const POWERUP_MAGNET_RADIUS = 132;

class SoundFX {
  constructor() {
    this.context = null;
    this.enabled = false;
  }

  unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
    }

    if (this.context.state === "suspended") {
      this.context.resume();
    }

    this.enabled = true;
  }

  tone({ frequency = 440, duration = 0.12, type = "sine", gain = 0.08, slide = 0 }) {
    if (!this.enabled || !this.context) return;

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const volume = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, frequency + slide), now + duration);
    }
    volume.gain.setValueAtTime(gain, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(volume).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  noise(duration = 0.22, gain = 0.12) {
    if (!this.enabled || !this.context) return;

    const now = this.context.currentTime;
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const volume = this.context.createGain();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + duration);
    volume.gain.setValueAtTime(gain, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.buffer = buffer;
    source.connect(filter).connect(volume).connect(this.context.destination);
    source.start(now);
  }

  shoot() {
    this.tone({ frequency: 760, duration: 0.08, type: "triangle", gain: 0.045, slide: 380 });
  }

  enemyShoot() {
    this.tone({ frequency: 210, duration: 0.12, type: "sawtooth", gain: 0.035, slide: -80 });
  }

  hit() {
    this.tone({ frequency: 180, duration: 0.1, type: "square", gain: 0.05, slide: -80 });
  }

  explosion() {
    this.noise(0.24, 0.13);
    this.tone({ frequency: 90, duration: 0.18, type: "sawtooth", gain: 0.055, slide: -44 });
  }

  shipExplosion() {
    this.noise(0.58, 0.2);
    this.tone({ frequency: 74, duration: 0.34, type: "sawtooth", gain: 0.08, slide: -38 });
    window.setTimeout(() => this.tone({ frequency: 148, duration: 0.18, type: "triangle", gain: 0.07, slide: -72 }), 90);
  }

  powerup() {
    this.tone({ frequency: 520, duration: 0.08, type: "sine", gain: 0.055, slide: 360 });
    window.setTimeout(() => this.tone({ frequency: 820, duration: 0.09, type: "sine", gain: 0.05, slide: 180 }), 70);
  }

  level() {
    this.tone({ frequency: 330, duration: 0.11, type: "triangle", gain: 0.05, slide: 210 });
    window.setTimeout(() => this.tone({ frequency: 510, duration: 0.12, type: "triangle", gain: 0.055, slide: 280 }), 110);
  }

  gameOver() {
    this.tone({ frequency: 280, duration: 0.16, type: "sawtooth", gain: 0.06, slide: -120 });
    window.setTimeout(() => this.tone({ frequency: 160, duration: 0.22, type: "sawtooth", gain: 0.055, slide: -70 }), 150);
  }
}

class SpaceBlasterScene extends Phaser.Scene {
  constructor() {
    super("space-blaster");
    this.sfx = new SoundFX();
  }

  preload() {
    this.load.image("space-background", ASSETS.background);
    this.load.image("player-ship", ASSETS.player);
    this.load.image("asteroid-large", ASSETS.asteroid);
    this.load.image("enemy-ufo", ASSETS.enemy);
    this.load.image("laser-bolt", ASSETS.laser);
    this.load.spritesheet("explosion", ASSETS.explosion, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet("ship-explosion", ASSETS.shipExplosion, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet("powerups", ASSETS.powerups, { frameWidth: 256, frameHeight: 256 });
  }

  create() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.gameStarted = false;
    this.gameOver = false;
    this.nextShotAt = 0;
    this.invulnerableUntil = 0;
    this.shieldUntil = 0;
    this.rapidUntil = 0;
    this.doubleUntil = 0;
    this.waveRemaining = 0;
    this.enemyRemaining = 0;
    this.levelTransitioning = false;

    this.buildWorld();
    this.buildPlayer();
    this.buildGroups();
    this.buildHud();
    this.buildAnimations();
    this.registerControls();
    this.createStartOverlay();
  }

  buildWorld() {
    const source = this.textures.get("space-background").getSourceImage();
    this.backgroundHeight = Math.ceil((GAME_WIDTH * source.height) / source.width);
    this.background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "space-background").setDepth(-20);
    this.background.setDisplaySize(GAME_WIDTH, this.backgroundHeight);

    this.farStars = this.add.group();
    this.nearStars = this.add.group();

    for (let i = 0; i < 120; i += 1) {
      const star = this.add.circle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.FloatBetween(0.8, 1.8),
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 0.82),
      );
      this.farStars.add(star);
    }

    for (let i = 0; i < 58; i += 1) {
      const star = this.add.circle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.FloatBetween(1.2, 2.5),
        0x75eaff,
        Phaser.Math.FloatBetween(0.34, 0.92),
      );
      this.nearStars.add(star);
    }

    const spark = this.add.graphics();
    spark.fillStyle(0xffffff, 1);
    spark.fillCircle(8, 8, 7);
    spark.generateTexture("spark", 16, 16);
    spark.destroy();
  }

  buildPlayer() {
    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - 92, "player-ship");
    this.player.setDepth(20);
    this.player.setScale(96 / this.player.width);
    this.player.body.setSize(this.player.width * 0.46, this.player.height * 0.5, true);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setDamping(true);
    this.player.body.setDrag(0.87);
    this.player.body.setMaxVelocity(390, 390);

    this.engineTrail = this.add.particles(0, 0, "spark", {
      follow: this.player,
      followOffset: { x: 0, y: 56 },
      lifespan: 320,
      speedY: { min: 70, max: 140 },
      speedX: { min: -24, max: 24 },
      scale: { start: 0.42, end: 0 },
      alpha: { start: 0.75, end: 0 },
      tint: [0x42d9ff, 0xff7248],
      frequency: 22,
      blendMode: "ADD",
    });
    this.engineTrail.setDepth(12);

    this.shieldRing = this.add.circle(this.player.x, this.player.y, 60, 0x5deaff, 0.08);
    this.shieldRing.setStrokeStyle(3, 0x72f0ff, 0.75);
    this.shieldRing.setDepth(19);
    this.shieldRing.setVisible(false);
  }

  buildGroups() {
    this.bullets = this.physics.add.group({ allowGravity: false });
    this.enemyBullets = this.physics.add.group({ allowGravity: false });
    this.asteroids = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group({ allowGravity: false });
    this.powerups = this.physics.add.group({ allowGravity: false });

    this.physics.add.overlap(this.bullets, this.asteroids, this.bulletHitsAsteroid, null, this);
    this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitsEnemy, null, this);
    this.physics.add.overlap(this.player, this.asteroids, this.playerHitsHazard, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.playerHitsHazard, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.playerHitsHazard, null, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);
  }

  buildHud() {
    const textStyle = {
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "18px",
      fontStyle: "700",
      color: "#f7fdff",
      stroke: "#061224",
      strokeThickness: 4,
    };

    this.scoreText = this.add.text(18, 16, "SCORE 0", textStyle).setDepth(50);
    this.levelText = this.add.text(GAME_WIDTH / 2, 16, "LEVEL 1", textStyle).setOrigin(0.5, 0).setDepth(50);
    this.livesText = this.add.text(GAME_WIDTH - 18, 16, "LIVES 3", textStyle).setOrigin(1, 0).setDepth(50);
    this.powerText = this.add
      .text(18, 48, "", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "800",
        color: "#7df4ff",
        stroke: "#061224",
        strokeThickness: 3,
      })
      .setDepth(50);

    this.pauseHint = this.add
      .text(GAME_WIDTH - 18, 48, "P PAUSE", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "800",
        color: "#a9bed4",
        stroke: "#061224",
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setDepth(50);
  }

  buildAnimations() {
    this.anims.create({
      key: "boom",
      frames: this.anims.generateFrameNumbers("explosion", { start: 0, end: 15 }),
      frameRate: 28,
      hideOnComplete: true,
    });

    this.anims.create({
      key: "ship-boom",
      frames: this.anims.generateFrameNumbers("ship-explosion", { start: 0, end: 15 }),
      frameRate: 8,
      hideOnComplete: true,
    });
  }

  registerControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      shoot: Phaser.Input.Keyboard.KeyCodes.SPACE,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
    });

    this.input.keyboard.on("keydown", () => this.sfx.unlock());
    this.input.on("pointerdown", () => {
      this.sfx.unlock();
      if (!this.gameStarted || this.gameOver) {
        this.startGame();
      }
    });

    this.input.keyboard.on("keydown-SPACE", () => {
      this.sfx.unlock();
      if (!this.gameStarted || this.gameOver) {
        this.startGame();
      }
    });

    this.input.keyboard.on("keydown-R", () => {
      if (this.gameOver) this.scene.restart();
    });

    this.input.keyboard.on("keydown-P", () => {
      if (!this.gameStarted || this.gameOver) return;
      this.physics.world.isPaused = !this.physics.world.isPaused;
      this.pauseHint.setText(this.physics.world.isPaused ? "PAUSED" : "P PAUSE");
    });
  }

  createStartOverlay() {
    this.overlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(100);
    const panel = this.add.rectangle(0, 0, 540, 306, 0x06132a, 0.82);
    panel.setStrokeStyle(2, 0x6ee9ff, 0.55);
    const title = this.add
      .text(0, -96, "ARMAAN'S\nSPACE BLASTER", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "42px",
        fontStyle: "900",
        color: "#ffffff",
        align: "center",
        lineSpacing: -6,
        stroke: "#071323",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    const body = this.add
      .text(0, 30, "WASD / Arrows to fly\nSpace / click / touch to fire\nBreak asteroids, dodge UFOs, grab powerups", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "18px",
        fontStyle: "700",
        color: "#cdefff",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    const cta = this.add
      .text(0, 115, "PRESS SPACE OR TAP", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "900",
        color: "#05111f",
        backgroundColor: "#67eaff",
        padding: { left: 18, right: 18, top: 10, bottom: 10 },
      })
      .setOrigin(0.5);

    this.overlay.add([panel, title, body, cta]);
    this.tweens.add({
      targets: cta,
      scale: 1.06,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  startGame() {
    if (this.gameOver) {
      this.scene.restart();
      return;
    }

    if (this.gameStarted) return;

    this.gameStarted = true;
    this.overlay.destroy();
    this.startLevel();
  }

  startLevel() {
    this.levelTransitioning = true;
    this.waveRemaining = 10 + this.level * 5;
    this.enemyRemaining = Math.max(1, Math.floor((this.level + 2) / 2));
    this.updateHud();

    const banner = this.add
      .text(GAME_WIDTH / 2, 160, `LEVEL ${this.level}`, {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "34px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#091424",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(80);

    this.tweens.add({
      targets: banner,
      y: 126,
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => banner.destroy(),
    });

    this.sfx.level();
    this.time.delayedCall(520, () => {
      this.levelTransitioning = false;
      this.spawnAsteroidWave();
      this.spawnEnemyWave();
    });
  }

  spawnAsteroidWave() {
    const delay = Math.max(300, 860 - this.level * 48);

    this.time.addEvent({
      delay,
      repeat: this.waveRemaining - 1,
      callback: () => {
        if (this.gameOver || !this.gameStarted) return;
        this.spawnAsteroid("large");
        this.waveRemaining -= 1;
      },
    });
  }

  spawnEnemyWave() {
    if (this.enemyRemaining <= 0) return;

    this.time.addEvent({
      delay: Math.max(1100, 2600 - this.level * 80),
      repeat: this.enemyRemaining - 1,
      startAt: 900,
      callback: () => {
        if (this.gameOver || !this.gameStarted) return;
        this.spawnEnemy();
        this.enemyRemaining -= 1;
      },
    });
  }

  spawnAsteroid(sizeKey, x = Phaser.Math.Between(42, GAME_WIDTH - 42), y = -80, velocityOverride = null) {
    const sizes = {
      large: { display: Phaser.Math.Between(92, 124), hp: 3, score: 80, next: "medium" },
      medium: { display: Phaser.Math.Between(60, 82), hp: 2, score: 45, next: "small" },
      small: { display: Phaser.Math.Between(34, 50), hp: 1, score: 25, next: null },
    };
    const config = sizes[sizeKey];
    const asteroid = this.asteroids.create(x, y, "asteroid-large");
    asteroid.setDepth(14);
    asteroid.setScale(config.display / Math.max(asteroid.width, asteroid.height));
    asteroid.setData("sizeKey", sizeKey);
    asteroid.setData("hp", config.hp);
    asteroid.setData("score", config.score);
    asteroid.setData("next", config.next);
    asteroid.setData("spin", Phaser.Math.FloatBetween(-1.8, 1.8));
    const radius = Math.min(asteroid.width, asteroid.height) * 0.35;
    asteroid.body.setCircle(radius, (asteroid.width - radius * 2) / 2, (asteroid.height - radius * 2) / 2);

    const speedY = Phaser.Math.Between(92, 140) + this.level * 8;
    const speedX = Phaser.Math.Between(-70, 70);
    asteroid.body.setVelocity(velocityOverride?.x ?? speedX, velocityOverride?.y ?? speedY);
    asteroid.body.setAngularVelocity(Phaser.Math.Between(-80, 80));
    return asteroid;
  }

  spawnEnemy() {
    const enemy = this.enemies.create(Phaser.Math.Between(74, GAME_WIDTH - 74), -90, "enemy-ufo");
    enemy.setDepth(18);
    enemy.setScale(112 / enemy.width);
    enemy.setData("hp", 3 + Math.floor(this.level / 2));
    enemy.setData("baseX", enemy.x);
    enemy.setData("phase", Phaser.Math.FloatBetween(0, Math.PI * 2));
    enemy.setData("nextShot", this.time.now + Phaser.Math.Between(850, 1400));
    const radius = Math.min(enemy.width, enemy.height) * 0.34;
    enemy.body.setCircle(radius, (enemy.width - radius * 2) / 2, (enemy.height - radius * 2) / 2);
    enemy.body.setVelocityY(70 + this.level * 5);
  }

  update(time, delta) {
    this.scrollBackground(delta);
    this.syncShield();

    if (!this.gameStarted || this.gameOver || this.physics.world.isPaused) {
      return;
    }

    this.handlePlayerMovement(time);
    this.handlePlayerShooting(time);
    this.updateEnemies(time);
    this.updatePowerups();
    this.recycleOffscreen();
    this.checkLevelComplete();
    this.updateHud();
  }

  scrollBackground(delta) {
    this.farStars.children.iterate((star) => {
      star.y += delta * 0.016;
      if (star.y > GAME_HEIGHT + 6) {
        star.y = -6;
        star.x = Phaser.Math.Between(0, GAME_WIDTH);
      }
    });

    this.nearStars.children.iterate((star) => {
      star.y += delta * 0.044;
      if (star.y > GAME_HEIGHT + 6) {
        star.y = -6;
        star.x = Phaser.Math.Between(0, GAME_WIDTH);
      }
    });
  }

  syncShield() {
    this.shieldRing.setPosition(this.player.x, this.player.y);
    const shieldActive = this.time.now < this.shieldUntil;
    this.shieldRing.setVisible(shieldActive);
    if (shieldActive) {
      this.shieldRing.setScale(1 + Math.sin(this.time.now / 120) * 0.045);
    }
  }

  handlePlayerMovement(time) {
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const up = this.cursors.up.isDown || this.keys.up.isDown;
    const down = this.cursors.down.isDown || this.keys.down.isDown;
    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);

    if (this.input.activePointer.isDown && this.input.activePointer.y > 90) {
      const pointer = this.input.activePointer;
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pointer.x, pointer.y);
      if (distance > 18) {
        vx += Math.cos(angle);
        vy += Math.sin(angle);
      }
    }

    const vector = new Phaser.Math.Vector2(vx, vy);
    if (vector.lengthSq() > 0) {
      vector.normalize().scale(370);
      this.player.body.setVelocity(vector.x, vector.y);
    } else {
      this.player.body.setVelocity(this.player.body.velocity.x * 0.88, this.player.body.velocity.y * 0.88);
    }

    this.player.setAngle(Phaser.Math.Clamp(this.player.body.velocity.x * 0.035, -12, 12));
    this.player.setAlpha(time < this.invulnerableUntil ? 0.58 + Math.sin(time / 55) * 0.28 : 1);
  }

  handlePlayerShooting(time) {
    if (this.keys.shoot.isDown || this.input.activePointer.isDown) {
      this.firePlayerLaser(time);
    }
  }

  firePlayerLaser(time) {
    const fireDelay = time < this.rapidUntil ? 92 : 170;
    if (time < this.nextShotAt) return;
    this.nextShotAt = time + fireDelay;

    if (time < this.doubleUntil) {
      this.spawnPlayerBullet(this.player.x - 22, this.player.y - 42, -36);
      this.spawnPlayerBullet(this.player.x + 22, this.player.y - 42, 36);
    } else {
      this.spawnPlayerBullet(this.player.x, this.player.y - 50, 0);
    }

    this.sfx.shoot();
  }

  spawnPlayerBullet(x, y, vx) {
    const bullet = this.bullets.create(x, y, "laser-bolt");
    bullet.setDepth(16);
    bullet.setScale(58 / bullet.height);
    bullet.body.setSize(bullet.width * 0.52, bullet.height * 0.82, true);
    bullet.body.setVelocity(vx, -690);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
  }

  updateEnemies(time) {
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active) return;

      const phase = enemy.getData("phase");
      const baseX = enemy.getData("baseX");
      enemy.x = Phaser.Math.Clamp(baseX + Math.sin(time / 520 + phase) * 74, 42, GAME_WIDTH - 42);

      if (time > enemy.getData("nextShot") && enemy.y > 70) {
        this.fireEnemyBullet(enemy);
        enemy.setData("nextShot", time + Phaser.Math.Between(1120, 1700) - this.level * 28);
      }
    });
  }

  fireEnemyBullet(enemy) {
    const bullet = this.enemyBullets.create(enemy.x, enemy.y + 38, "spark");
    bullet.setDepth(15);
    bullet.setDisplaySize(18, 18);
    bullet.body.setCircle(7, 1, 1);
    bullet.body.setVelocity(Phaser.Math.Between(-22, 22), 245 + this.level * 8);
    bullet.setTint(0xff4a38);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    this.sfx.enemyShoot();
  }

  bulletHitsAsteroid(bullet, asteroid) {
    bullet.destroy();
    this.damageAsteroid(asteroid, 1);
  }

  damageAsteroid(asteroid, amount) {
    const hp = asteroid.getData("hp") - amount;
    asteroid.setData("hp", hp);
    this.flashSprite(asteroid, 0xfff5ba);

    if (hp > 0) {
      this.sfx.hit();
      return;
    }

    const x = asteroid.x;
    const y = asteroid.y;
    const next = asteroid.getData("next");
    const score = asteroid.getData("score");
    const nextSize = next;
    const display = asteroid.displayWidth;
    asteroid.destroy();

    this.score += score;
    this.createExplosion(x, y, display / 120);

    if (nextSize) {
      for (let i = 0; i < 2; i += 1) {
        this.spawnAsteroid(nextSize, x + Phaser.Math.Between(-18, 18), y, {
          x: Phaser.Math.Between(-105, 105),
          y: Phaser.Math.Between(115, 205),
        });
      }
    } else if (Phaser.Math.Between(0, 100) < 13) {
      this.spawnPowerup(x, y);
    }
  }

  bulletHitsEnemy(bullet, enemy) {
    bullet.destroy();
    const hp = enemy.getData("hp") - 1;
    enemy.setData("hp", hp);
    this.flashSprite(enemy, 0xffffff);

    if (hp > 0) {
      this.sfx.hit();
      return;
    }

    this.score += 220 + this.level * 18;
    this.createExplosion(enemy.x, enemy.y, 0.78);
    if (Phaser.Math.Between(0, 100) < 36) {
      this.spawnPowerup(enemy.x, enemy.y);
    }
    enemy.destroy();
  }

  playerHitsHazard(player, hazard) {
    if (!hazard.active || this.time.now < this.invulnerableUntil) return;

    if (this.time.now < this.shieldUntil) {
      this.score += 20;
      this.createExplosion(hazard.x, hazard.y, 0.54);
      hazard.destroy();
      this.cameras.main.shake(90, 0.003);
      return;
    }

    hazard.destroy();
    this.lives -= 1;

    if (this.lives <= 0) {
      this.createShipExplosion(player.x, player.y);
      this.endGame();
      return;
    }

    this.invulnerableUntil = this.time.now + 1650;
    this.createExplosion(player.x, player.y, 0.72);
    this.cameras.main.shake(180, 0.009);
  }

  collectPowerup(player, powerup) {
    if (!powerup.active) return;

    const type = powerup.getData("type");
    powerup.destroy();

    if (type === "shield") this.shieldUntil = this.time.now + 7200;
    if (type === "rapid") this.rapidUntil = this.time.now + 7200;
    if (type === "double") this.doubleUntil = this.time.now + 8400;
    if (type === "repair") this.lives = Math.min(5, this.lives + 1);

    this.score += 90;
    this.sfx.powerup();
    this.cameras.main.flash(120, 70, 220, 255, false);
  }

  spawnPowerup(x, y) {
    const config = Phaser.Utils.Array.GetRandom(POWERUPS);
    const item = this.powerups.create(x, y, "powerups", config.frame);
    item.setDepth(17);
    const baseScale = POWERUP_SIZE / item.width;
    item.setScale(baseScale);
    item.setData("type", config.key);
    item.setData("color", config.color);
    item.setData("baseScale", baseScale);
    item.body.setCircle(24, 104, 104);
    item.body.setVelocity(Phaser.Math.Between(-22, 22), 96);
    item.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: item,
      scale: { from: baseScale * 0.88, to: baseScale * 1.1 },
      duration: 520,
      repeat: -1,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  updatePowerups() {
    this.powerups.children.iterate((powerup) => {
      if (!powerup?.active) return;

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, powerup.x, powerup.y);
      if (distance <= POWERUP_PICKUP_RADIUS) {
        this.collectPowerup(this.player, powerup);
        return;
      }

      if (distance <= POWERUP_MAGNET_RADIUS) {
        const pull = 1 - distance / POWERUP_MAGNET_RADIUS;
        const angle = Phaser.Math.Angle.Between(powerup.x, powerup.y, this.player.x, this.player.y);
        powerup.body.velocity.x += Math.cos(angle) * pull * 20;
        powerup.body.velocity.y += Math.sin(angle) * pull * 20;
        powerup.body.velocity.limit(180);
      }
    });
  }

  createExplosion(x, y, scale = 0.6) {
    const boom = this.add.sprite(x, y, "explosion");
    boom.setDepth(40);
    boom.setScale(Phaser.Math.Clamp(scale, 0.34, 1.12));
    boom.play("boom");

    const sparks = this.add.particles(x, y, "spark", {
      lifespan: { min: 230, max: 520 },
      speed: { min: 80, max: 290 },
      scale: { start: 0.42, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xffd166, 0xff5b38, 0x73eaff],
      blendMode: "ADD",
      emitting: false,
    });
    sparks.explode(34);
    this.time.delayedCall(620, () => sparks.destroy());
    this.sfx.explosion();
    this.cameras.main.shake(95, 0.0045);
  }

  createShipExplosion(x, y) {
    const blastX = Phaser.Math.Clamp(x, 190, GAME_WIDTH - 190);
    const blastY = Phaser.Math.Clamp(y - 54, 170, GAME_HEIGHT - 190);
    const blast = this.add.sprite(blastX, blastY, "ship-explosion");
    blast.setDepth(60);
    blast.setScale(1.45);
    blast.play("ship-boom");

    const shockwave = this.add.circle(blastX, blastY, 24, 0x7df4ff, 0);
    shockwave.setDepth(58);
    shockwave.setStrokeStyle(5, 0x7df4ff, 0.92);
    this.tweens.add({
      targets: shockwave,
      radius: 230,
      alpha: 0,
      duration: 1050,
      ease: "Cubic.easeOut",
      onComplete: () => shockwave.destroy(),
    });

    const debris = this.add.particles(blastX, blastY, "spark", {
      lifespan: { min: 850, max: 1650 },
      speed: { min: 150, max: 480 },
      scale: { start: 0.62, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x7df4ff, 0xffd166, 0xff5b38, 0xffffff],
      blendMode: "ADD",
      emitting: false,
    });
    debris.explode(92);
    this.time.delayedCall(1900, () => debris.destroy());

    this.cameras.main.flash(260, 255, 236, 176, false);
    this.cameras.main.shake(760, 0.014);
    this.sfx.shipExplosion();
  }

  flashSprite(sprite, tint) {
    sprite.setTint(tint);
    this.time.delayedCall(80, () => {
      if (sprite.active) sprite.clearTint();
    });
  }

  recycleOffscreen() {
    const killBelow = GAME_HEIGHT + 120;
    const killAbove = -170;

    this.bullets.children.iterate((bullet) => {
      if (bullet?.active && bullet.y < killAbove) bullet.destroy();
    });
    this.enemyBullets.children.iterate((bullet) => {
      if (bullet?.active && bullet.y > killBelow) bullet.destroy();
    });
    this.powerups.children.iterate((powerup) => {
      if (powerup?.active && powerup.y > killBelow) powerup.destroy();
    });
    this.asteroids.children.iterate((asteroid) => {
      if (asteroid?.active && asteroid.y > killBelow) asteroid.destroy();
    });
    this.enemies.children.iterate((enemy) => {
      if (enemy?.active && enemy.y > killBelow) enemy.destroy();
    });
  }

  checkLevelComplete() {
    if (this.levelTransitioning || this.waveRemaining > 0 || this.enemyRemaining > 0) return;
    if (this.asteroids.countActive(true) > 0 || this.enemies.countActive(true) > 0) return;

    this.level += 1;
    this.levelTransitioning = true;
    this.time.delayedCall(900, () => this.startLevel());
  }

  updateHud() {
    this.scoreText.setText(`SCORE ${this.score}`);
    this.levelText.setText(`LEVEL ${this.level}`);
    this.livesText.setText(`LIVES ${this.lives}`);

    const active = [];
    if (this.time.now < this.shieldUntil) active.push("SHIELD");
    if (this.time.now < this.rapidUntil) active.push("RAPID");
    if (this.time.now < this.doubleUntil) active.push("DOUBLE");
    this.powerText.setText(active.join("  "));
  }

  endGame() {
    this.gameOver = true;
    this.physics.world.isPaused = true;
    this.engineTrail.stop();
    this.player.setVisible(false);
    this.sfx.gameOver();

    this.time.delayedCall(1900, () => this.showGameOverOverlay());
  }

  showGameOverOverlay() {
    const overlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(110);
    const panel = this.add.rectangle(0, 0, 428, 250, 0x070d1b, 0.9);
    panel.setStrokeStyle(2, 0xff674a, 0.72);
    const title = this.add
      .text(0, -72, "MISSION OVER", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "38px",
        fontStyle: "900",
        color: "#fff4ec",
        stroke: "#150711",
        strokeThickness: 7,
      })
      .setOrigin(0.5);
    const score = this.add
      .text(0, 2, `Score ${this.score}  •  Level ${this.level}`, {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "20px",
        fontStyle: "800",
        color: "#bdeeff",
      })
      .setOrigin(0.5);
    const restart = this.add
      .text(0, 82, "PRESS R / SPACE OR TAP", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "900",
        color: "#08111f",
        backgroundColor: "#ffb347",
        padding: { left: 16, right: 16, top: 10, bottom: 10 },
      })
      .setOrigin(0.5);
    overlay.add([panel, title, score, restart]);
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#02040c",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [SpaceBlasterScene],
};

new Phaser.Game(config);
