# Armaan's Space Blaster

A Phaser arcade space shooter with generated sprite art, asteroids, UFO enemies, powerups, explosions, screen shake, level progression, and browser-based synth sound effects.

![Armaan's Space Blaster gameplay concept](public/assets/concepts/gameplay-concept.png)

## Features

- Wide desktop arcade playfield built with Phaser
- Generated spaceship, asteroid, UFO, laser, powerup, and space background art
- New enemy variations: red raiders, organic aliens, large cruisers, and classic UFOs
- Multiple enemy weapon styles: plasma orbs, shards, missiles, and alien energy globs
- Big slow-motion spaceship death explosion with debris, shockwave, flash, and screen shake
- Asteroid waves that break into smaller rocks
- Giant asteroids and larger cruiser enemies appear as levels climb
- Shield, rapid-fire, double-shot, and repair powerups
- Score, lives, level progression, pause, game-over, and restart flow

## Sprite Pack

| Player Ship | Asteroid | Enemy UFO | Laser |
| --- | --- | --- | --- |
| <img src="public/assets/player-ship.png" width="180" alt="Player ship sprite"> | <img src="public/assets/asteroid-large.png" width="180" alt="Asteroid sprite"> | <img src="public/assets/enemy-ufo.png" width="180" alt="Enemy UFO sprite"> | <img src="public/assets/laser-bolt.png" width="90" alt="Laser bolt sprite"> |

## Enemy Variations

| Raider | Organic Alien | Cruiser | Enemy Weapons |
| --- | --- | --- | --- |
| <img src="public/assets/enemy-raider.png" width="180" alt="Red raider enemy sprite"> | <img src="public/assets/enemy-alien.png" width="180" alt="Organic alien enemy sprite"> | <img src="public/assets/enemy-cruiser.png" width="220" alt="Large cruiser enemy sprite"> | <img src="public/assets/enemy-projectiles.png" width="180" alt="Enemy projectile sprite sheet"> |

| Powerups | Asteroid Explosion | Ship Death Explosion |
| --- | --- | --- |
| <img src="public/assets/powerups-sheet.png" width="220" alt="Powerup sprite sheet"> | <img src="public/assets/explosion-sheet.png" width="220" alt="Asteroid explosion sprite sheet"> | <img src="public/assets/ship-explosion-sheet.png" width="220" alt="Ship explosion sprite sheet"> |

## Background Art

![Generated space background](public/assets/space-background.png)

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Controls

- `WASD` or arrow keys: fly
- `Space`, mouse, or touch: fire
- `P`: pause
- `R`: restart after game over
