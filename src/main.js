import Phaser from "phaser";
import "./styles.css";

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const ASSETS = {
  background: "/assets/space-background.png",
  player: "/assets/player-ship.png",
  asteroid: "/assets/asteroid-large.png",
  enemy: "/assets/enemy-ufo.png",
  enemyRaider: "/assets/enemy-raider.png",
  enemyAlien: "/assets/enemy-alien.png",
  enemyCruiser: "/assets/enemy-cruiser.png",
  bossCrimsonCommand: "/assets/boss-crimson-command.png",
  bossHiveQueen: "/assets/boss-hive-queen.png",
  bossCrystalWarden: "/assets/boss-crystal-warden.png",
  bossIronDreadnought: "/assets/boss-iron-dreadnought.png",
  bossVoidMothership: "/assets/boss-void-mothership.png",
  laser: "/assets/laser-bolt.png",
  enemyProjectiles: "/assets/enemy-projectiles.png",
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

const ENEMY_TYPES = [
  {
    key: "ufo",
    texture: "enemy-ufo",
    unlockLevel: 1,
    display: 112,
    hp: 3,
    score: 220,
    speed: 78,
    weapon: "orb",
    shotDelay: [1050, 1650],
    movement: "sine",
    weight: 4,
  },
  {
    key: "raider",
    texture: "enemy-raider",
    unlockLevel: 1,
    display: 104,
    hp: 2,
    score: 185,
    speed: 124,
    weapon: "shard",
    shotDelay: [760, 1250],
    movement: "zigzag",
    weight: 4,
  },
  {
    key: "alien",
    texture: "enemy-alien",
    unlockLevel: 1,
    display: 96,
    hp: 2,
    score: 170,
    speed: 92,
    weapon: "spray",
    shotDelay: [1050, 1550],
    movement: "drift",
    weight: 3,
  },
  {
    key: "cruiser",
    texture: "enemy-cruiser",
    unlockLevel: 2,
    display: 172,
    hp: 8,
    score: 520,
    speed: 54,
    weapon: "heavy",
    shotDelay: [900, 1400],
    movement: "cruiser",
    weight: 2,
  },
];

const BOSS_TYPES = [
  {
    level: 1,
    name: "Crimson Command",
    texture: "boss-crimson-command",
    displayWidth: 460,
    y: 220,
    hp: 46,
    score: 1400,
    fireDelay: 880,
    moveRange: 210,
    moveSpeed: 760,
    damageTint: 0xffd27a,
    damageSpots: [
      { x: -132, y: -18, size: 38 },
      { x: 126, y: -22, size: 38 },
      { x: 0, y: 60, size: 44 },
    ],
  },
  {
    level: 2,
    name: "Nebula Hive Queen",
    texture: "boss-hive-queen",
    displayWidth: 390,
    y: 224,
    hp: 58,
    score: 1900,
    fireDelay: 760,
    moveRange: 235,
    moveSpeed: 910,
    damageTint: 0xcfff6d,
    damageSpots: [
      { x: -92, y: -44, size: 36 },
      { x: 100, y: 24, size: 38 },
      { x: -18, y: 92, size: 42 },
    ],
  },
  {
    level: 3,
    name: "Crystal Star Warden",
    texture: "boss-crystal-warden",
    displayWidth: 430,
    y: 222,
    hp: 74,
    score: 2500,
    fireDelay: 690,
    moveRange: 250,
    moveSpeed: 840,
    damageTint: 0xff83ff,
    damageSpots: [
      { x: -120, y: 18, size: 36 },
      { x: 116, y: 12, size: 36 },
      { x: 0, y: -62, size: 44 },
      { x: 0, y: 108, size: 42 },
    ],
  },
  {
    level: 4,
    name: "Iron Eclipse Dreadnought",
    texture: "boss-iron-dreadnought",
    displayWidth: 430,
    y: 226,
    hp: 94,
    score: 3300,
    fireDelay: 640,
    moveRange: 270,
    moveSpeed: 1020,
    damageTint: 0xff9852,
    damageSpots: [
      { x: -126, y: -10, size: 40 },
      { x: 136, y: -14, size: 40 },
      { x: -58, y: 86, size: 42 },
      { x: 62, y: 74, size: 42 },
    ],
  },
  {
    level: 5,
    name: "Void Mothership",
    texture: "boss-void-mothership",
    displayWidth: 640,
    y: 198,
    hp: 122,
    score: 4600,
    fireDelay: 560,
    moveRange: 230,
    moveSpeed: 960,
    damageTint: 0xb482ff,
    damageSpots: [
      { x: -190, y: -28, size: 42 },
      { x: 188, y: -30, size: 42 },
      { x: -78, y: 54, size: 38 },
      { x: 92, y: 58, size: 38 },
      { x: 0, y: -10, size: 50 },
    ],
  },
];

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
    this.load.image("enemy-raider", ASSETS.enemyRaider);
    this.load.image("enemy-alien", ASSETS.enemyAlien);
    this.load.image("enemy-cruiser", ASSETS.enemyCruiser);
    this.load.image("boss-crimson-command", ASSETS.bossCrimsonCommand);
    this.load.image("boss-hive-queen", ASSETS.bossHiveQueen);
    this.load.image("boss-crystal-warden", ASSETS.bossCrystalWarden);
    this.load.image("boss-iron-dreadnought", ASSETS.bossIronDreadnought);
    this.load.image("boss-void-mothership", ASSETS.bossVoidMothership);
    this.load.image("laser-bolt", ASSETS.laser);
    this.load.spritesheet("enemy-projectiles", ASSETS.enemyProjectiles, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet("explosion", ASSETS.explosion, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet("ship-explosion", ASSETS.shipExplosion, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet("powerups", ASSETS.powerups, { frameWidth: 256, frameHeight: 256 });
  }

  create() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.maxHull = 100;
    this.hull = this.maxHull;
    this.gameStarted = false;
    this.gameOver = false;
    this.nextShotAt = 0;
    this.invulnerableUntil = 0;
    this.shieldUntil = 0;
    this.rapidUntil = 0;
    this.doubleUntil = 0;
    this.shotCounter = 0;
    this.waveRemaining = 0;
    this.enemyRemaining = 0;
    this.levelTransitioning = false;
    this.bossPhaseStarted = false;
    this.bossActive = false;
    this.currentBoss = null;
    this.bossDamageMarks = [];

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
    this.bosses = this.physics.add.group({ allowGravity: false });
    this.powerups = this.physics.add.group({ allowGravity: false });

    this.physics.add.overlap(this.bullets, this.asteroids, this.bulletHitsAsteroid, null, this);
    this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitsEnemy, null, this);
    this.physics.add.overlap(this.bullets, this.bosses, this.bulletHitsBoss, null, this);
    this.physics.add.overlap(this.player, this.asteroids, this.playerHitsHazard, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.playerHitsHazard, null, this);
    this.physics.add.overlap(this.player, this.bosses, this.playerHitsBoss, null, this);
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
    this.hullText = this.add
      .text(18, 45, "HULL 100%", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        fontStyle: "900",
        color: "#8fffea",
        stroke: "#061224",
        strokeThickness: 3,
      })
      .setDepth(50);
    this.powerText = this.add
      .text(18, 68, "", {
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

    this.bossHud = this.add.container(GAME_WIDTH / 2, 64).setDepth(55).setVisible(false);
    this.bossNameText = this.add
      .text(0, -26, "", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "18px",
        fontStyle: "900",
        color: "#fff5ec",
        stroke: "#061224",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.bossBarBack = this.add.rectangle(0, 0, 560, 18, 0x061224, 0.86);
    this.bossBarBack.setStrokeStyle(2, 0x80eaff, 0.42);
    this.bossBarFill = this.add.rectangle(-278, 0, 556, 14, 0xff4d4d, 0.96).setOrigin(0, 0.5);
    this.bossHpText = this.add
      .text(0, 24, "", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "900",
        color: "#aeeeff",
        stroke: "#061224",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.bossHud.add([this.bossNameText, this.bossBarBack, this.bossBarFill, this.bossHpText]);
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
      .text(0, 30, "WASD / Arrows to fly\nSpace / click / touch to fire\nBreak asteroids, dodge aliens, defeat bosses", {
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
    this.bossPhaseStarted = false;
    this.bossActive = false;
    this.currentBoss = null;
    this.clearBossDamageMarks();
    this.hideBossHud();
    this.waveRemaining = 7 + this.level * 3;
    this.enemyRemaining = 2 + Math.floor(this.level * 1.05);
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
        const asteroidSize = this.level >= 2 && Phaser.Math.Between(0, 100) < 18 ? "giant" : "large";
        this.spawnAsteroid(asteroidSize);
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
      giant: { display: Phaser.Math.Between(148, 188), hp: 5, score: 130, next: "large", damage: 42 },
      large: { display: Phaser.Math.Between(92, 124), hp: 3, score: 80, next: "medium", damage: 30 },
      medium: { display: Phaser.Math.Between(60, 82), hp: 2, score: 45, next: "small", damage: 22 },
      small: { display: Phaser.Math.Between(34, 50), hp: 1, score: 25, next: null, damage: 14 },
    };
    const config = sizes[sizeKey];
    const asteroid = this.asteroids.create(x, y, "asteroid-large");
    asteroid.setDepth(14);
    asteroid.setScale(config.display / Math.max(asteroid.width, asteroid.height));
    asteroid.setData("sizeKey", sizeKey);
    asteroid.setData("hp", config.hp);
    asteroid.setData("score", config.score);
    asteroid.setData("next", config.next);
    asteroid.setData("damage", config.damage);
    asteroid.setData("impactScale", config.display / 170);
    asteroid.setData("spin", Phaser.Math.FloatBetween(-1.8, 1.8));
    const radius = Math.min(asteroid.width, asteroid.height) * 0.35;
    asteroid.body.setCircle(radius, (asteroid.width - radius * 2) / 2, (asteroid.height - radius * 2) / 2);

    const speedY = Phaser.Math.Between(92, 140) + this.level * 8;
    const speedX = Phaser.Math.Between(-70, 70);
    asteroid.body.setVelocity(velocityOverride?.x ?? speedX, velocityOverride?.y ?? speedY);
    asteroid.body.setAngularVelocity(Phaser.Math.Between(-80, 80));
    return asteroid;
  }

  chooseEnemyType() {
    const available = ENEMY_TYPES.filter((type) => this.level >= type.unlockLevel);
    const weighted = available.flatMap((type) => Array(type.weight).fill(type));
    return Phaser.Utils.Array.GetRandom(weighted);
  }

  spawnEnemy(type = this.chooseEnemyType()) {
    const margin = Math.max(74, type.display / 2 + 18);
    const enemy = this.enemies.create(Phaser.Math.Between(margin, GAME_WIDTH - margin), -type.display, type.texture);
    enemy.setDepth(18);
    enemy.setScale(type.display / Math.max(enemy.width, enemy.height));
    enemy.setData("type", type.key);
    enemy.setData("weapon", type.weapon);
    enemy.setData("movement", type.movement);
    enemy.setData("hp", type.hp + Math.floor(this.level / 2));
    enemy.setData("score", type.score + this.level * 18);
    enemy.setData("damage", type.key === "cruiser" ? 42 : 28);
    enemy.setData("impactScale", type.key === "cruiser" ? 0.82 : 0.6);
    enemy.setData("baseX", enemy.x);
    enemy.setData("phase", Phaser.Math.FloatBetween(0, Math.PI * 2));
    enemy.setData("shotDelay", type.shotDelay);
    enemy.setData("nextShot", this.time.now + Phaser.Math.Between(type.shotDelay[0], type.shotDelay[1]));
    const radius = Math.min(enemy.width, enemy.height) * 0.34;
    enemy.body.setCircle(radius, (enemy.width - radius * 2) / 2, (enemy.height - radius * 2) / 2);
    enemy.body.setVelocityY(type.speed + this.level * 4);
  }

  update(time, delta) {
    this.scrollBackground(delta);
    this.syncShield();

    if (!this.gameStarted || this.gameOver || this.physics.world.isPaused) {
      return;
    }

    if (this.player.visible) {
      this.handlePlayerMovement(time);
      this.handlePlayerShooting(time);
    }
    this.updateEnemies(time);
    this.updateBoss(time);
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
    this.shotCounter += 1;
    const heavyShot = time < this.rapidUntil && this.shotCounter % 4 === 0;

    if (time < this.doubleUntil) {
      this.spawnPlayerBullet(this.player.x - 25, this.player.y - 42, -40, heavyShot ? 72 : 58, heavyShot ? 2 : 1);
      this.spawnPlayerBullet(this.player.x + 25, this.player.y - 42, 40, heavyShot ? 72 : 58, heavyShot ? 2 : 1);
    } else {
      this.spawnPlayerBullet(this.player.x, this.player.y - 50, 0, heavyShot ? 84 : 58, heavyShot ? 2 : 1);
    }

    this.sfx.shoot();
  }

  spawnPlayerBullet(x, y, vx, displayHeight = 58, damage = 1) {
    const bullet = this.bullets.create(x, y, "laser-bolt");
    bullet.setDepth(16);
    bullet.setScale(displayHeight / bullet.height);
    bullet.setData("damage", damage);
    bullet.body.setSize(bullet.width * 0.52, bullet.height * 0.82, true);
    bullet.body.setVelocity(vx, -690);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    if (damage > 1) {
      bullet.setTint(0xb6f7ff);
    }
  }

  updateEnemies(time) {
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active) return;

      const phase = enemy.getData("phase");
      const baseX = enemy.getData("baseX");
      const movement = enemy.getData("movement");
      const horizontalRanges = {
        sine: 74,
        zigzag: 118,
        drift: 52,
        cruiser: 92,
      };
      const horizontalSpeeds = {
        sine: 520,
        zigzag: 310,
        drift: 780,
        cruiser: 980,
      };
      enemy.x = Phaser.Math.Clamp(
        baseX + Math.sin(time / horizontalSpeeds[movement] + phase) * horizontalRanges[movement],
        42,
        GAME_WIDTH - 42,
      );

      if (movement === "zigzag") {
        enemy.setAngle(Math.sin(time / 180 + phase) * 8);
      } else if (movement === "drift") {
        enemy.setAngle(Math.sin(time / 480 + phase) * 5);
      }

      if (time > enemy.getData("nextShot") && enemy.y > 70) {
        this.fireEnemyBullet(enemy);
        const delay = enemy.getData("shotDelay");
        enemy.setData("nextShot", time + Phaser.Math.Between(delay[0], delay[1]) - this.level * 24);
      }
    });
  }

  fireEnemyBullet(enemy) {
    const weapon = enemy.getData("weapon");
    const speed = 245 + this.level * 10;

    if (weapon === "shard") {
      this.spawnEnemyProjectile(enemy.x, enemy.y + 40, 1, 0, speed + 70, 34, 18);
    } else if (weapon === "spray") {
      [-95, 0, 95].forEach((vx) => this.spawnEnemyProjectile(enemy.x, enemy.y + 36, 3, vx, speed, 31, 16));
    } else if (weapon === "heavy") {
      this.spawnEnemyProjectile(enemy.x - 48, enemy.y + 62, 0, -45, speed + 5, 30, 18);
      this.spawnEnemyProjectile(enemy.x + 48, enemy.y + 62, 0, 45, speed + 5, 30, 18);
      this.time.delayedCall(160, () => {
        if (enemy.active) {
          this.spawnEnemyProjectile(enemy.x, enemy.y + 72, 2, 0, speed + 92, 46, 28);
        }
      });
    } else {
      this.spawnEnemyProjectile(enemy.x, enemy.y + 38, 0, Phaser.Math.Between(-28, 28), speed, 30, 16);
    }

    this.sfx.enemyShoot();
  }

  spawnEnemyProjectile(x, y, frame, vx, vy, displaySize, damage = 16) {
    const bullet = this.enemyBullets.create(x, y, "enemy-projectiles", frame);
    bullet.setDepth(15);
    bullet.setScale(displaySize / bullet.width);
    bullet.setData("damage", damage);
    bullet.setData("impactScale", Phaser.Math.Clamp(displaySize / 70, 0.36, 0.86));
    const radius = bullet.width * 0.36;
    bullet.body.setCircle(radius, (bullet.width - radius * 2) / 2, (bullet.height - radius * 2) / 2);
    bullet.body.setVelocity(vx, vy);
    bullet.setBlendMode(Phaser.BlendModes.ADD);

    if (frame === 1 || frame === 2) {
      const angle = Phaser.Math.Angle.Between(0, 0, vx, vy);
      bullet.setAngle(Phaser.Math.RadToDeg(angle - Math.PI / 2));
    }
    return bullet;
  }

  getBossTypeForLevel() {
    return BOSS_TYPES.find((boss) => boss.level === this.level);
  }

  startBossPhase() {
    const bossType = this.getBossTypeForLevel();
    if (!bossType || this.bossPhaseStarted) return;

    this.bossPhaseStarted = true;
    this.levelTransitioning = true;
    this.asteroids.clear(true, true);
    this.enemies.clear(true, true);
    this.enemyBullets.clear(true, true);
    this.powerups.clear(true, true);

    const banner = this.add
      .text(GAME_WIDTH / 2, 158, `BOSS: ${bossType.name.toUpperCase()}`, {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "32px",
        fontStyle: "900",
        color: "#fff8ec",
        stroke: "#120816",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(82);

    this.tweens.add({
      targets: banner,
      scale: 1.08,
      alpha: 0,
      duration: 1300,
      ease: "Cubic.easeOut",
      onComplete: () => banner.destroy(),
    });

    this.cameras.main.shake(240, 0.005);
    this.sfx.level();
    this.time.delayedCall(760, () => {
      if (this.gameOver || !this.gameStarted) return;
      this.spawnBoss(bossType);
      this.levelTransitioning = false;
    });
  }

  spawnBoss(bossType) {
    const boss = this.bosses.create(GAME_WIDTH / 2, -220, bossType.texture);
    boss.setDepth(32);
    boss.setScale(bossType.displayWidth / boss.width);
    boss.setData("config", bossType);
    boss.setData("hp", bossType.hp);
    boss.setData("maxHp", bossType.hp);
    boss.setData("phase", Phaser.Math.FloatBetween(0, Math.PI * 2));
    boss.setData("nextShot", this.time.now + 850);
    boss.setData("patternIndex", 0);
    boss.setData("damageStage", 0);
    boss.setData("damage", 40);
    boss.setImmovable(true);
    boss.body.setSize(boss.width * 0.62, boss.height * 0.54, true);
    boss.body.setVelocity(0, 0);

    this.currentBoss = boss;
    this.bossActive = true;
    this.showBossHud(bossType);
    this.updateBossHud(boss);

    this.tweens.add({
      targets: boss,
      y: bossType.y,
      duration: 950,
      ease: "Cubic.easeOut",
    });
  }

  updateBoss(time) {
    const boss = this.currentBoss;
    if (!boss?.active || !this.bossActive) return;

    const config = boss.getData("config");
    const phase = boss.getData("phase");
    boss.x = Phaser.Math.Clamp(
      GAME_WIDTH / 2 + Math.sin(time / config.moveSpeed + phase) * config.moveRange,
      config.displayWidth / 2 + 34,
      GAME_WIDTH - config.displayWidth / 2 - 34,
    );
    boss.setAngle(Math.sin(time / (config.moveSpeed * 1.2) + phase) * 2.4);
    this.syncBossDamageMarks(boss);

    if (boss.y < config.y - 18 || time < boss.getData("nextShot")) return;

    this.fireBossWeapon(boss);
    boss.setData("nextShot", time + config.fireDelay);
  }

  fireBossWeapon(boss) {
    const config = boss.getData("config");
    const patternIndex = boss.getData("patternIndex");
    const speed = 260 + this.level * 12;
    const centerAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
    const down = Math.PI / 2;

    boss.setData("patternIndex", patternIndex + 1);

    if (config.level === 1) {
      [-92, 92].forEach((offset) => this.spawnEnemyProjectile(boss.x + offset, boss.y + 84, 0, offset * 0.18, speed, 34, 18));
      this.spawnBossProjectileFromAngle(boss.x, boss.y + 110, 1, centerAngle, speed + 90, 38, 22);
    } else if (config.level === 2) {
      [-0.5, -0.25, 0, 0.25, 0.5].forEach((spread) => {
        this.spawnBossProjectileFromAngle(boss.x, boss.y + 108, 3, down + spread, speed + 30, 34, 18);
      });
      if (patternIndex % 2 === 0) {
        this.spawnBossProjectileFromAngle(boss.x - 122, boss.y + 72, 3, centerAngle - 0.1, speed + 60, 38, 20);
        this.spawnBossProjectileFromAngle(boss.x + 122, boss.y + 72, 3, centerAngle + 0.1, speed + 60, 38, 20);
      }
    } else if (config.level === 3) {
      [-0.62, -0.38, -0.14, 0.14, 0.38, 0.62].forEach((spread) => {
        this.spawnBossProjectileFromAngle(boss.x, boss.y + 120, 1, down + spread, speed + 55, 36, 20);
      });
      this.spawnBossProjectileFromAngle(boss.x, boss.y + 92, 2, centerAngle, speed + 115, 44, 28);
    } else if (config.level === 4) {
      [-176, -92, 92, 176].forEach((offset) => {
        this.spawnEnemyProjectile(boss.x + offset, boss.y + 96, 2, offset * 0.14, speed + 110, 48, 30);
      });
      if (patternIndex % 2 === 1) {
        [-0.28, 0, 0.28].forEach((spread) => {
          this.spawnBossProjectileFromAngle(boss.x, boss.y + 130, 0, centerAngle + spread, speed + 45, 36, 20);
        });
      }
    } else {
      const wideFan = patternIndex % 2 === 0;
      const spreads = wideFan ? [-0.78, -0.52, -0.26, 0, 0.26, 0.52, 0.78] : [-0.34, -0.16, 0.16, 0.34];
      spreads.forEach((spread, index) => {
        this.spawnBossProjectileFromAngle(boss.x, boss.y + 96, index % 2 ? 1 : 0, down + spread, speed + 50, 36, 22);
      });
      this.spawnBossProjectileFromAngle(boss.x - 170, boss.y + 62, 3, centerAngle - 0.06, speed + 75, 38, 22);
      this.spawnBossProjectileFromAngle(boss.x + 170, boss.y + 62, 3, centerAngle + 0.06, speed + 75, 38, 22);
    }

    this.sfx.enemyShoot();
  }

  spawnBossProjectileFromAngle(x, y, frame, angle, speed, displaySize, damage) {
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    return this.spawnEnemyProjectile(x, y, frame, vx, vy, displaySize, damage);
  }

  bulletHitsAsteroid(bullet, asteroid) {
    const damage = bullet.getData("damage") || 1;
    bullet.destroy();
    this.damageAsteroid(asteroid, damage);
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

    if (nextSize && (nextSize !== "small" || Phaser.Math.Between(0, 100) < 72)) {
      const splitCount = nextSize === "small" ? 1 : 2;
      for (let i = 0; i < splitCount; i += 1) {
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
    const damage = bullet.getData("damage") || 1;
    bullet.destroy();
    const hp = enemy.getData("hp") - damage;
    enemy.setData("hp", hp);
    this.flashSprite(enemy, 0xffffff);

    if (hp > 0) {
      this.sfx.hit();
      return;
    }

    this.score += enemy.getData("score");
    this.createExplosion(enemy.x, enemy.y, enemy.getData("type") === "cruiser" ? 1.08 : 0.78);
    if (Phaser.Math.Between(0, 100) < 36) {
      this.spawnPowerup(enemy.x, enemy.y);
    }
    enemy.destroy();
  }

  bulletHitsBoss(bullet, boss) {
    if (!boss.active || boss.getData("defeated")) return;

    const damage = bullet.getData("damage") || 1;
    const hitX = bullet.x;
    const hitY = bullet.y;
    bullet.destroy();

    const hp = Math.max(0, boss.getData("hp") - damage);
    boss.setData("hp", hp);
    this.flashSprite(boss, boss.getData("config").damageTint);
    this.createBossHitSparks(hitX, hitY, damage > 1 ? 18 : 10);
    this.refreshBossDamage(boss);
    this.updateBossHud(boss);

    if (hp <= 0) {
      this.defeatBoss(boss);
    } else {
      this.sfx.hit();
    }
  }

  createBossHitSparks(x, y, count) {
    const sparks = this.add.particles(x, y, "spark", {
      lifespan: { min: 160, max: 330 },
      speed: { min: 55, max: 190 },
      scale: { start: 0.28, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0x8fffea, 0xffd166, 0xff6848],
      blendMode: "ADD",
      emitting: false,
    });
    sparks.explode(count);
    this.time.delayedCall(420, () => sparks.destroy());
  }

  refreshBossDamage(boss) {
    const hp = boss.getData("hp");
    const maxHp = boss.getData("maxHp");
    const config = boss.getData("config");
    const ratio = hp / maxHp;
    const targetStage = Math.min(config.damageSpots.length, Math.floor((1 - ratio) * (config.damageSpots.length + 1)));
    const currentStage = boss.getData("damageStage");

    for (let stage = currentStage + 1; stage <= targetStage; stage += 1) {
      this.addBossDamageMark(boss, stage);
    }

    boss.setData("damageStage", Math.max(currentStage, targetStage));
  }

  addBossDamageMark(boss, stage) {
    const config = boss.getData("config");
    const spot = config.damageSpots[(stage - 1) % config.damageSpots.length];
    const mark = this.add.container(boss.x + spot.x, boss.y + spot.y).setDepth(36);
    const scorch = this.add.ellipse(0, 0, spot.size * 1.38, spot.size, 0x08090d, 0.78);
    scorch.setStrokeStyle(2, 0xff642e, 0.62);
    const ember = this.add.circle(spot.size * 0.18, -spot.size * 0.08, spot.size * 0.22, 0xff7a1d, 0.78);
    const crackA = this.add.line(0, 0, -spot.size * 0.34, -spot.size * 0.16, spot.size * 0.26, spot.size * 0.2, 0xffe29a, 0.7);
    const crackB = this.add.line(0, 0, -spot.size * 0.18, spot.size * 0.22, spot.size * 0.18, -spot.size * 0.24, 0xff5b38, 0.72);
    mark.add([scorch, ember, crackA, crackB]);
    mark.setRotation(Phaser.Math.FloatBetween(-0.4, 0.4));
    mark.setScale(0.2);

    this.tweens.add({
      targets: mark,
      scale: 1,
      duration: 220,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: ember,
      alpha: { from: 0.38, to: 0.92 },
      scale: { from: 0.72, to: 1.18 },
      duration: Phaser.Math.Between(260, 420),
      repeat: -1,
      yoyo: true,
      ease: "Sine.easeInOut",
    });

    this.createBossHitSparks(boss.x + spot.x, boss.y + spot.y, 28);
    this.bossDamageMarks.push({ mark, offsetX: spot.x, offsetY: spot.y });
    this.cameras.main.shake(180, 0.006);
  }

  syncBossDamageMarks(boss) {
    this.bossDamageMarks.forEach(({ mark, offsetX, offsetY }) => {
      if (!mark.active) return;
      mark.setPosition(boss.x + offsetX, boss.y + offsetY);
      mark.setAngle(boss.angle);
    });
  }

  clearBossDamageMarks() {
    this.bossDamageMarks.forEach(({ mark }) => mark.destroy());
    this.bossDamageMarks = [];
  }

  defeatBoss(boss) {
    if (!boss.active || boss.getData("defeated")) return;

    boss.setData("defeated", true);
    this.bossActive = false;
    this.levelTransitioning = true;
    this.enemyBullets.clear(true, true);
    this.score += boss.getData("config").score;
    this.updateHud();

    const blastPoints = [
      { x: 0, y: 0, scale: 1.12 },
      { x: -120, y: -24, scale: 0.84 },
      { x: 126, y: -18, scale: 0.84 },
      { x: -64, y: 82, scale: 0.72 },
      { x: 72, y: 76, scale: 0.72 },
    ];

    blastPoints.forEach((point, index) => {
      this.time.delayedCall(index * 130, () => {
        if (!boss.active && index > 0) return;
        this.createExplosion(boss.x + point.x, boss.y + point.y, point.scale);
      });
    });

    this.cameras.main.flash(260, 255, 232, 180, false);
    this.cameras.main.shake(860, 0.016);

    this.time.delayedCall(680, () => {
      this.clearBossDamageMarks();
      boss.destroy();
      this.hideBossHud();
      this.currentBoss = null;
      this.showBossDownBanner();
    });

    this.time.delayedCall(1780, () => this.advanceLevel(420));
  }

  showBossDownBanner() {
    const banner = this.add
      .text(GAME_WIDTH / 2, 150, "BOSS DESTROYED", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "30px",
        fontStyle: "900",
        color: "#fff5ec",
        stroke: "#120816",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(82);

    this.tweens.add({
      targets: banner,
      y: 118,
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => banner.destroy(),
    });
  }

  playerHitsHazard(player, hazard) {
    if (!hazard.active || !player.visible || this.time.now < this.invulnerableUntil) return;

    if (this.time.now < this.shieldUntil) {
      this.score += 20;
      this.createExplosion(hazard.x, hazard.y, 0.54);
      hazard.destroy();
      this.cameras.main.shake(90, 0.003);
      return;
    }

    const damage = hazard.getData("damage") || 24;
    const impactScale = hazard.getData("impactScale") || 0.52;
    const impactX = hazard.x;
    const impactY = hazard.y;
    hazard.destroy();
    this.damagePlayer(damage, impactX, impactY, impactScale);
  }

  playerHitsBoss(player, boss) {
    if (!boss.active || !player.visible || this.time.now < this.invulnerableUntil) return;
    this.damagePlayer(boss.getData("damage") || 40, player.x, player.y - 24, 0.86);
    this.cameras.main.shake(220, 0.01);
  }

  damagePlayer(amount, impactX, impactY, impactScale = 0.52) {
    if (this.time.now < this.invulnerableUntil || this.gameOver || !this.player.visible) return;

    this.hull = Math.max(0, this.hull - amount);
    this.updateHud();

    if (this.hull > 0) {
      this.invulnerableUntil = this.time.now + 760;
      this.createPlayerImpact(impactX, impactY, amount, impactScale);
      return;
    }

    this.lives -= 1;
    this.updateHud();
    this.createShipExplosion(this.player.x, this.player.y);

    if (this.lives <= 0) {
      this.endGame();
      return;
    }

    this.player.setVisible(false);
    this.player.body.enable = false;
    this.engineTrail.stop();
    this.invulnerableUntil = this.time.now + 2200;
    this.cameras.main.shake(420, 0.012);

    this.time.delayedCall(950, () => {
      if (this.gameOver) return;
      this.hull = this.maxHull;
      this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 92);
      this.player.body.reset(this.player.x, this.player.y);
      this.player.body.enable = true;
      this.player.setVisible(true);
      this.player.setAlpha(1);
      this.engineTrail.start();
      this.updateHud();
    });
  }

  createPlayerImpact(x, y, amount, scale) {
    const sparks = this.add.particles(x, y, "spark", {
      lifespan: { min: 180, max: 420 },
      speed: { min: 80, max: 240 },
      scale: { start: 0.36, end: 0 },
      alpha: { start: 0.94, end: 0 },
      tint: [0x7df4ff, 0xffd166, 0xff5b38],
      blendMode: "ADD",
      emitting: false,
    });
    sparks.explode(Math.round(18 + amount * 0.35));
    this.time.delayedCall(520, () => sparks.destroy());
    this.cameras.main.flash(90, 255, 82, 72, false);
    this.cameras.main.shake(120, Phaser.Math.Clamp(scale * 0.006, 0.003, 0.009));
    this.sfx.hit();
  }

  collectPowerup(player, powerup) {
    if (!powerup.active) return;

    const type = powerup.getData("type");
    powerup.destroy();

    if (type === "shield") this.shieldUntil = this.time.now + 7200;
    if (type === "rapid") this.rapidUntil = this.time.now + 7200;
    if (type === "double") this.doubleUntil = this.time.now + 8400;
    if (type === "repair") {
      if (this.hull < this.maxHull) {
        this.hull = Math.min(this.maxHull, this.hull + 35);
      } else {
        this.lives = Math.min(5, this.lives + 1);
      }
    }

    this.score += 90;
    this.updateHud();
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
      if (bullet?.active && (bullet.y > killBelow || bullet.x < -140 || bullet.x > GAME_WIDTH + 140)) bullet.destroy();
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
    if (this.asteroids.countActive(true) > 0 || this.enemies.countActive(true) > 0 || this.bosses.countActive(true) > 0) {
      return;
    }

    if (this.getBossTypeForLevel() && !this.bossPhaseStarted) {
      this.startBossPhase();
      return;
    }

    this.advanceLevel(900);
  }

  advanceLevel(delay = 900) {
    this.level += 1;
    this.levelTransitioning = true;
    this.time.delayedCall(delay, () => this.startLevel());
  }

  updateHud() {
    this.scoreText.setText(`SCORE ${this.score}`);
    this.levelText.setText(`LEVEL ${this.level}`);
    this.livesText.setText(`LIVES ${this.lives}`);
    this.hullText.setText(`HULL ${Math.ceil(this.hull)}%`);
    this.hullText.setColor(this.hull <= 32 ? "#ff8a6d" : this.hull <= 62 ? "#ffd166" : "#8fffea");

    const active = [];
    if (this.time.now < this.shieldUntil) active.push("SHIELD");
    if (this.time.now < this.rapidUntil) active.push("RAPID");
    if (this.time.now < this.doubleUntil) active.push("DOUBLE");
    this.powerText.setText(active.join("  "));
  }

  showBossHud(bossType) {
    this.bossNameText.setText(bossType.name.toUpperCase());
    this.levelText.setVisible(false);
    this.bossHud.setVisible(true);
    this.bossHud.setAlpha(0);
    this.tweens.add({
      targets: this.bossHud,
      alpha: 1,
      duration: 240,
      ease: "Sine.easeOut",
    });
  }

  updateBossHud(boss) {
    if (!boss?.active) return;
    const hp = boss.getData("hp");
    const maxHp = boss.getData("maxHp");
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    const color = ratio <= 0.28 ? 0xff5a4a : ratio <= 0.55 ? 0xffb347 : 0x58f4ff;
    this.bossBarFill.setScale(ratio, 1);
    this.bossBarFill.setFillStyle(color, 0.96);
    this.bossHpText.setText(`BOSS HULL ${Math.ceil(ratio * 100)}%`);
  }

  hideBossHud() {
    if (!this.bossHud) return;
    this.bossHud.setVisible(false);
    this.levelText?.setVisible(true);
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

if (import.meta.hot && window.__spaceBlasterGame) {
  window.__spaceBlasterGame.destroy(true);
}

const game = new Phaser.Game(config);

if (import.meta.hot) {
  window.__spaceBlasterGame = game;
  import.meta.hot.dispose(() => {
    game.destroy(true);
    if (window.__spaceBlasterGame === game) {
      delete window.__spaceBlasterGame;
    }
  });
}
