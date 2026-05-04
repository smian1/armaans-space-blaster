from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets"
OUT_DIR = ASSET_DIR / "animated"

BOSS_FRAME = 384
BOSS_COLS = 6
BOSS_ROWS = 6
BOSS_DEATH_COLS = 5
BOSS_DEATH_ROWS = 4
BOSS_DEATH_FRAMES = BOSS_DEATH_COLS * BOSS_DEATH_ROWS

ASTEROID_FRAME = 256
ASTEROID_COLS = 8
ASTEROID_VARIANTS = 4

SHIP_FRAME = 256
SHIP_COLS = 8

DEBRIS_FRAME = 96
DEBRIS_COLS = 8
DEBRIS_ROWS = 2

random.seed(8612)


BOSSES = [
    {
        "key": "crimson-command",
        "source": "boss-crimson-command.png",
        "display_width": 460,
        "glow": (67, 232, 255),
        "fire": (255, 92, 42),
        "spots": [(-132, -18, 38), (126, -22, 38), (0, 60, 44)],
    },
    {
        "key": "hive-queen",
        "source": "boss-hive-queen.png",
        "display_width": 390,
        "glow": (204, 255, 109),
        "fire": (176, 255, 72),
        "spots": [(-92, -44, 36), (100, 24, 38), (-18, 92, 42)],
    },
    {
        "key": "crystal-warden",
        "source": "boss-crystal-warden.png",
        "display_width": 430,
        "glow": (255, 131, 255),
        "fire": (104, 234, 255),
        "spots": [(-120, 18, 36), (116, 12, 36), (0, -62, 44), (0, 108, 42)],
    },
    {
        "key": "iron-dreadnought",
        "source": "boss-iron-dreadnought.png",
        "display_width": 430,
        "glow": (255, 152, 82),
        "fire": (255, 111, 42),
        "spots": [(-126, -10, 40), (136, -14, 40), (-58, 86, 42), (62, 74, 42)],
    },
    {
        "key": "void-mothership",
        "source": "boss-void-mothership.png",
        "display_width": 640,
        "glow": (180, 130, 255),
        "fire": (113, 234, 255),
        "spots": [(-190, -28, 42), (188, -30, 42), (-78, 54, 38), (92, 58, 38), (0, -10, 50)],
    },
]


ENEMIES = [
    {"key": "ufo", "source": "enemy-ufo.png", "glow": (255, 72, 72), "engine": (255, 116, 24)},
    {"key": "raider", "source": "enemy-raider.png", "glow": (82, 235, 255), "engine": (255, 83, 44)},
    {"key": "alien", "source": "enemy-alien.png", "glow": (171, 255, 82), "engine": (111, 255, 111)},
    {"key": "cruiser", "source": "enemy-cruiser.png", "glow": (255, 197, 78), "engine": (255, 116, 42)},
]


def load_rgba(name: str) -> Image.Image:
    return Image.open(ASSET_DIR / name).convert("RGBA")


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return (0, 0, image.width, image.height)
    return bbox


def trim_alpha(image: Image.Image, pad: int = 8) -> Image.Image:
    left, top, right, bottom = alpha_bbox(image)
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(image.width, right + pad)
    bottom = min(image.height, bottom + pad)
    return image.crop((left, top, right, bottom))


def fit_to_frame(
    image: Image.Image,
    frame_size: int,
    scale: float = 0.86,
    offset: tuple[int, int] = (0, 0),
) -> tuple[Image.Image, tuple[int, int, int, int]]:
    source = trim_alpha(image)
    max_w = int(frame_size * scale)
    max_h = int(frame_size * scale)
    ratio = min(max_w / source.width, max_h / source.height)
    size = (max(1, int(source.width * ratio)), max(1, int(source.height * ratio)))
    resized = source.resize(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
    x = (frame_size - resized.width) // 2 + offset[0]
    y = (frame_size - resized.height) // 2 + offset[1]
    frame.alpha_composite(resized, (x, y))
    return frame, (x, y, resized.width, resized.height)


def composite_under_glow(frame: Image.Image, color: tuple[int, int, int], blur: int, opacity: float) -> Image.Image:
    alpha = frame.getchannel("A").filter(ImageFilter.GaussianBlur(blur))
    glow_alpha = alpha.point(lambda a: int(a * opacity))
    glow = Image.new("RGBA", frame.size, (*color, 0))
    glow.putalpha(glow_alpha)
    glow.alpha_composite(frame)
    return glow


def pulse_frame(frame: Image.Image, frame_index: int, amount: float = 0.05) -> Image.Image:
    pulse = 1 + math.sin((frame_index / SHIP_COLS) * math.tau) * amount
    bright = ImageEnhance.Brightness(frame).enhance(1 + amount * 0.4)
    color = ImageEnhance.Color(bright).enhance(1 + abs(pulse - 1) * 1.6)
    return ImageEnhance.Contrast(color).enhance(1 + amount * 0.7)


def add_thrusters(
    frame: Image.Image,
    meta: tuple[int, int, int, int],
    frame_index: int,
    color: tuple[int, int, int],
    top: bool = False,
    count: int = 3,
) -> None:
    draw = ImageDraw.Draw(frame, "RGBA")
    x, y, width, height = meta
    pulse = 0.62 + math.sin((frame_index / SHIP_COLS) * math.tau) * 0.14
    anchors = []
    if count == 1:
        anchors = [0]
    elif count == 2:
        anchors = [-0.24, 0.24]
    else:
        anchors = [-0.25, 0, 0.25]

    base_y = y + 8 if top else y + height - 8
    direction = -1 if top else 1
    for anchor in anchors:
        cx = x + width / 2 + width * anchor
        length = max(12, height * 0.09 * pulse)
        width_flame = max(7, width * 0.026)
        draw.polygon(
            [
                (cx - width_flame, base_y),
                (cx + width_flame, base_y),
                (cx, base_y + direction * length),
            ],
            fill=(*color, 88),
        )
        draw.ellipse(
            (cx - width_flame * 1.6, base_y - width_flame, cx + width_flame * 1.6, base_y + width_flame),
            fill=(255, 240, 126, 86),
        )


def spot_to_frame(
    spot: tuple[int, int, int],
    display_width: int,
    frame_size: int,
    meta: tuple[int, int, int, int],
) -> tuple[float, float, float]:
    _, _, resized_width, _ = meta
    x, y, size = spot
    return (
        frame_size / 2 + (x / display_width) * resized_width,
        frame_size / 2 + (y / display_width) * resized_width,
        max(12, (size / display_width) * resized_width),
    )


def draw_damage_mark(
    frame: Image.Image,
    cx: float,
    cy: float,
    size: float,
    frame_index: int,
    glow: tuple[int, int, int],
    fire: tuple[int, int, int],
) -> None:
    draw = ImageDraw.Draw(frame, "RGBA")
    wobble = math.sin(frame_index * 0.9) * size * 0.08
    draw.ellipse((cx - size * 0.82, cy - size * 0.52, cx + size * 0.82, cy + size * 0.52), fill=(4, 5, 8, 205))
    draw.ellipse((cx - size * 0.42, cy - size * 0.28, cx + size * 0.42, cy + size * 0.28), fill=(*fire, 88))
    draw.ellipse((cx - size * 0.18 + wobble, cy - size * 0.18, cx + size * 0.18 + wobble, cy + size * 0.18), fill=(255, 224, 122, 112))
    for line_index in range(5):
        angle = frame_index * 0.35 + line_index * 1.17
        x1 = cx + math.cos(angle) * size * 0.18
        y1 = cy + math.sin(angle) * size * 0.12
        x2 = cx + math.cos(angle) * size * random.uniform(0.58, 1.05)
        y2 = cy + math.sin(angle) * size * random.uniform(0.38, 0.74)
        draw.line((x1, y1, x2, y2), fill=(*glow, 130), width=max(1, int(size / 12)))


def make_boss_sheets() -> None:
    for boss in BOSSES:
        source = load_rgba(boss["source"])
        sheet = Image.new("RGBA", (BOSS_COLS * BOSS_FRAME, BOSS_ROWS * BOSS_FRAME), (0, 0, 0, 0))
        for stage in range(BOSS_ROWS):
            for col in range(BOSS_COLS):
                offset_y = int(math.sin((col / BOSS_COLS) * math.tau) * 3)
                frame, meta = fit_to_frame(source, BOSS_FRAME, 0.9, (0, offset_y))
                frame = composite_under_glow(frame, boss["glow"], 10 + stage, 0.055 + stage * 0.012)
                frame = pulse_frame(frame, col, 0.045 + stage * 0.012)
                mark_count = min(stage, len(boss["spots"]))
                for index, spot in enumerate(boss["spots"][:mark_count]):
                    cx, cy, size = spot_to_frame(spot, boss["display_width"], BOSS_FRAME, meta)
                    draw_damage_mark(frame, cx, cy, size * (1 + index * 0.05), col, boss["glow"], boss["fire"])
                if stage >= len(boss["spots"]):
                    draw = ImageDraw.Draw(frame, "RGBA")
                    for smoke_index in range(7):
                        sx = BOSS_FRAME / 2 + random.uniform(-0.34, 0.34) * meta[2]
                        sy = BOSS_FRAME / 2 + random.uniform(-0.22, 0.28) * meta[2]
                        radius = random.uniform(8, 22) * (1 + math.sin(col + smoke_index) * 0.12)
                        draw.ellipse((sx - radius, sy - radius, sx + radius, sy + radius), fill=(64, 69, 76, 30))
                sheet.alpha_composite(frame, (col * BOSS_FRAME, stage * BOSS_FRAME))
        sheet.save(OUT_DIR / f"boss-{boss['key']}-sheet.png", optimize=True)


def draw_debris_sparks(frame: Image.Image, progress: float, colors: list[tuple[int, int, int]], seed: int) -> None:
    rng = random.Random(seed)
    draw = ImageDraw.Draw(frame, "RGBA")
    center = BOSS_FRAME / 2
    for index in range(24):
        angle = rng.random() * math.tau
        distance = rng.uniform(28, 180) * (0.34 + progress)
        x = center + math.cos(angle) * distance
        y = center + math.sin(angle) * distance
        size = rng.uniform(3, 12) * (1.1 - progress * 0.45)
        color = colors[index % len(colors)]
        draw.polygon(
            [
                (x, y - size),
                (x + size * 0.75, y + size * 0.35),
                (x - size * 0.55, y + size * 0.62),
            ],
            fill=(*color, int(210 * (1 - progress * 0.38))),
        )


def sheet_frame(source: Image.Image, index: int, frame_size: int = 256, cols: int = 4) -> Image.Image:
    x = (index % cols) * frame_size
    y = (index // cols) * frame_size
    return source.crop((x, y, x + frame_size, y + frame_size))


def make_boss_death_sheets() -> None:
    ship_explosions = load_rgba("ship-explosion-sheet.png")
    small_explosions = load_rgba("explosion-sheet.png")

    for boss in BOSSES:
        source = load_rgba(boss["source"])
        sheet = Image.new("RGBA", (BOSS_DEATH_COLS * BOSS_FRAME, BOSS_DEATH_ROWS * BOSS_FRAME), (0, 0, 0, 0))
        for frame_index in range(BOSS_DEATH_FRAMES):
            progress = frame_index / (BOSS_DEATH_FRAMES - 1)
            frame = Image.new("RGBA", (BOSS_FRAME, BOSS_FRAME), (0, 0, 0, 0))
            if progress < 0.68:
                base, meta = fit_to_frame(source, BOSS_FRAME, 0.9 + progress * 0.06)
                base = composite_under_glow(base, boss["glow"], 12, 0.08 + progress * 0.08)
                for spot in boss["spots"]:
                    cx, cy, size = spot_to_frame(spot, boss["display_width"], BOSS_FRAME, meta)
                    draw_damage_mark(base, cx, cy, size * (1 + progress * 0.55), frame_index, boss["glow"], boss["fire"])
                alpha = base.getchannel("A").point(lambda a: int(a * max(0.06, 1 - progress * 1.18)))
                base.putalpha(alpha)
                frame.alpha_composite(base)

            main_effect = sheet_frame(ship_explosions, min(15, int(progress * 15)))
            main_effect, _ = fit_to_frame(main_effect, BOSS_FRAME, 0.76 + progress * 0.33)
            frame.alpha_composite(main_effect)

            if 0.18 < progress < 0.82:
                side_index = min(15, max(0, int(progress * 17) - 1))
                offsets = [(-58, 20), (64, -12)] if frame_index % 2 == 0 else [(-44, -20), (52, 34)]
                for offset_index, offset in enumerate(offsets):
                    side = sheet_frame(small_explosions, side_index if offset_index == 0 else min(15, side_index + 2))
                    side, _ = fit_to_frame(side, BOSS_FRAME, 0.34 + progress * 0.18, offset)
                    alpha = side.getchannel("A").point(lambda a: int(a * 0.72))
                    side.putalpha(alpha)
                    frame.alpha_composite(side)

            draw_debris_sparks(frame, progress, [boss["glow"], boss["fire"], (210, 218, 228), (46, 52, 61)], frame_index * 33)
            sheet.alpha_composite(frame, ((frame_index % BOSS_DEATH_COLS) * BOSS_FRAME, (frame_index // BOSS_DEATH_COLS) * BOSS_FRAME))
        sheet.save(OUT_DIR / f"boss-{boss['key']}-death-sheet.png", optimize=True)


def tint_image(frame: Image.Image, color: tuple[int, int, int], amount: float) -> Image.Image:
    overlay = Image.new("RGBA", frame.size, (*color, 0))
    overlay.putalpha(frame.getchannel("A").point(lambda a: int(a * amount)))
    result = Image.alpha_composite(frame, overlay)
    return result


def make_asteroid_sheet() -> None:
    source = load_rgba("asteroid-large.png")
    variants = [
        ((232, 226, 210), 0.0, 1.0),
        ((255, 143, 65), 0.18, 1.08),
        ((96, 221, 255), 0.18, 1.04),
        ((165, 118, 255), 0.14, 0.78),
    ]
    sheet = Image.new("RGBA", (ASTEROID_COLS * ASTEROID_FRAME, ASTEROID_VARIANTS * ASTEROID_FRAME), (0, 0, 0, 0))
    for row, (color, tint, brightness) in enumerate(variants):
        for col in range(ASTEROID_COLS):
            angle = col * (360 / ASTEROID_COLS) + row * 17
            rotated = source.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
            frame, meta = fit_to_frame(rotated, ASTEROID_FRAME, 0.88)
            frame = ImageEnhance.Brightness(frame).enhance(brightness)
            if tint:
                frame = tint_image(frame, color, tint)
            if row == 1:
                frame = composite_under_glow(frame, (255, 103, 36), 8, 0.055)
            if row == 2:
                frame = composite_under_glow(frame, (80, 232, 255), 8, 0.06)
            if row == 3:
                frame = composite_under_glow(frame, (158, 94, 255), 8, 0.045)
            draw = ImageDraw.Draw(frame, "RGBA")
            if col % 2 == 0:
                x, y, w, h = meta
                crack_x = x + w * (0.38 + 0.16 * math.sin(col))
                crack_y = y + h * (0.34 + 0.16 * math.cos(col))
                draw.line((crack_x, crack_y, crack_x + 32, crack_y + 20, crack_x + 8, crack_y + 48), fill=(255, 236, 190, 82), width=2)
            sheet.alpha_composite(frame, (col * ASTEROID_FRAME, row * ASTEROID_FRAME))
    sheet.save(OUT_DIR / "asteroids-animated-sheet.png", optimize=True)


def make_ship_sheets() -> None:
    all_ships = ENEMIES + [{"key": "player", "source": "player-ship.png", "glow": (93, 234, 255), "engine": (70, 214, 255)}]
    for ship in all_ships:
        source = load_rgba(ship["source"])
        sheet = Image.new("RGBA", (SHIP_COLS * SHIP_FRAME, SHIP_FRAME), (0, 0, 0, 0))
        for col in range(SHIP_COLS):
            offset_x = int(math.sin(col / SHIP_COLS * math.tau) * (1 if ship["key"] == "player" else 2))
            offset_y = int(math.cos(col / SHIP_COLS * math.tau) * 2)
            frame, meta = fit_to_frame(source, SHIP_FRAME, 0.88, (offset_x, offset_y))
            frame = composite_under_glow(frame, ship["glow"], 12, 0.13 + abs(math.sin(col / SHIP_COLS * math.tau)) * 0.05)
            frame = pulse_frame(frame, col, 0.04)
            add_thrusters(frame, meta, col, ship["engine"], top=False, count=1 if ship["key"] == "ufo" else 2)
            draw = ImageDraw.Draw(frame, "RGBA")
            x, y, w, h = meta
            light_alpha = int(72 + 54 * (1 + math.sin(col / SHIP_COLS * math.tau)) / 2)
            draw.ellipse((x + w * 0.47, y + h * 0.42, x + w * 0.53, y + h * 0.48), fill=(*ship["glow"], light_alpha))
            sheet.alpha_composite(frame, (col * SHIP_FRAME, 0))
        sheet.save(OUT_DIR / f"{ship['key']}-sheet.png", optimize=True)


def make_debris_sheet() -> None:
    source_images = [load_rgba(boss["source"]) for boss in BOSSES]
    sheet = Image.new("RGBA", (DEBRIS_COLS * DEBRIS_FRAME, DEBRIS_ROWS * DEBRIS_FRAME), (0, 0, 0, 0))
    for index in range(DEBRIS_COLS * DEBRIS_ROWS):
        source = trim_alpha(source_images[index % len(source_images)])
        rng = random.Random(index * 93)
        crop_size = rng.randint(160, 280)
        left = rng.randint(0, max(1, source.width - crop_size))
        top = rng.randint(0, max(1, source.height - crop_size))
        crop = source.crop((left, top, min(source.width, left + crop_size), min(source.height, top + crop_size)))
        crop = crop.resize((DEBRIS_FRAME, DEBRIS_FRAME), Image.Resampling.LANCZOS)
        mask = Image.new("L", (DEBRIS_FRAME, DEBRIS_FRAME), 0)
        draw_mask = ImageDraw.Draw(mask)
        points = [
            (rng.randint(12, 42), rng.randint(5, 22)),
            (rng.randint(56, 91), rng.randint(10, 36)),
            (rng.randint(62, 91), rng.randint(52, 91)),
            (rng.randint(10, 44), rng.randint(58, 91)),
        ]
        draw_mask.polygon(points, fill=255)
        alpha = ImageChops.multiply(crop.getchannel("A"), mask)
        crop.putalpha(alpha)
        draw = ImageDraw.Draw(crop, "RGBA")
        draw.line(points + [points[0]], fill=(238, 246, 255, 120), width=2)
        sheet.alpha_composite(crop, ((index % DEBRIS_COLS) * DEBRIS_FRAME, (index // DEBRIS_COLS) * DEBRIS_FRAME))
    sheet.save(OUT_DIR / "ship-debris-sheet.png", optimize=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    make_boss_sheets()
    make_boss_death_sheets()
    make_asteroid_sheet()
    make_ship_sheets()
    make_debris_sheet()


if __name__ == "__main__":
    main()
