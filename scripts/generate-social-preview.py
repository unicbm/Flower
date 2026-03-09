from pathlib import Path
import math
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUTPUT = DOCS / "social-preview.png"

WIDTH = 1280
HEIGHT = 640


def load_font(size: int, bold: bool = False):
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/msyhbd.ttf" if bold else "C:/Windows/Fonts/msyh.ttf",
        "C:/Windows/Fonts/georgiab.ttf" if bold else "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/GARA.TTF",
        "C:/Windows/Fonts/timesbd.ttf" if bold else "C:/Windows/Fonts/times.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def hex_to_rgba(value: str, alpha: int = 255):
    value = value.lstrip("#")
    if len(value) == 3:
        value = "".join(part * 2 for part in value)
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def draw_gradient(image: Image.Image, top: str, middle: str, bottom: str):
    pixels = image.load()
    top_rgb = hex_to_rgba(top)
    middle_rgb = hex_to_rgba(middle)
    bottom_rgb = hex_to_rgba(bottom)
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        if t < 0.55:
            ratio = t / 0.55
            color = tuple(
                int(top_rgb[i] + (middle_rgb[i] - top_rgb[i]) * ratio) for i in range(3)
            ) + (255,)
        else:
            ratio = (t - 0.55) / 0.45
            color = tuple(
                int(middle_rgb[i] + (bottom_rgb[i] - middle_rgb[i]) * ratio) for i in range(3)
            ) + (255,)
        for x in range(WIDTH):
            pixels[x, y] = color


def paint_glow(layer: Image.Image, center, radius, color, opacity):
    draw = ImageDraw.Draw(layer, "RGBA")
    x, y = center
    for step in range(8):
        factor = 1 - step / 8
        current = int(radius * (1 + step * 0.22))
        alpha = int(opacity * factor * factor)
        draw.ellipse(
            (x - current, y - current, x + current, y + current),
            fill=hex_to_rgba(color, alpha),
        )


def draw_stem(draw: ImageDraw.ImageDraw, start, control, end, fill, width):
    draw.line([start, control, end], fill=fill, width=width, joint="curve")


def draw_leaf(draw: ImageDraw.ImageDraw, center, length, width, angle, fill, outline):
    cx, cy = center
    points = []
    for t in range(13):
        ratio = t / 12
        offset = math.sin(ratio * math.pi) * width
        px = -length / 2 + ratio * length
        py = -offset
        rx = px * math.cos(angle) - py * math.sin(angle)
        ry = px * math.sin(angle) + py * math.cos(angle)
        points.append((cx + rx, cy + ry))
    for t in range(13):
        ratio = 1 - t / 12
        offset = math.sin(ratio * math.pi) * width
        px = -length / 2 + ratio * length
        py = offset
        rx = px * math.cos(angle) - py * math.sin(angle)
        ry = px * math.sin(angle) + py * math.cos(angle)
        points.append((cx + rx, cy + ry))
    draw.polygon(points, fill=fill, outline=outline)


def draw_flower(draw: ImageDraw.ImageDraw, center, radius, petals, palette, angle_offset):
    cx, cy = center
    for i in range(petals):
        angle = angle_offset + (math.tau / petals) * i
        px = cx + math.cos(angle) * radius * 0.9
        py = cy + math.sin(angle) * radius * 0.9
        petal_w = radius * random.uniform(1.2, 1.6)
        petal_h = radius * random.uniform(1.7, 2.4)
        petal = Image.new("RGBA", (int(petal_w * 3), int(petal_h * 3)), (0, 0, 0, 0))
        pdraw = ImageDraw.Draw(petal, "RGBA")
        pdraw.ellipse(
            (
                petal.width / 2 - petal_w / 2,
                petal.height / 2 - petal_h / 2,
                petal.width / 2 + petal_w / 2,
                petal.height / 2 + petal_h / 2,
            ),
            fill=hex_to_rgba(random.choice(palette), random.randint(160, 225)),
        )
        rotated = petal.rotate(math.degrees(angle) + 90, resample=Image.Resampling.BICUBIC)
        draw.bitmap((px - rotated.width / 2, py - rotated.height / 2), rotated)

    draw.ellipse(
        (cx - radius * 0.68, cy - radius * 0.68, cx + radius * 0.68, cy + radius * 0.68),
        fill=hex_to_rgba("#f2ca74", 240),
        outline=hex_to_rgba("#d08a3c", 220),
    )
    for _ in range(18):
        dx = random.uniform(-radius * 0.35, radius * 0.35)
        dy = random.uniform(-radius * 0.35, radius * 0.35)
        r = random.uniform(radius * 0.04, radius * 0.1)
        draw.ellipse((cx + dx - r, cy + dy - r, cx + dx + r, cy + dy + r), fill="#8e5b2d")


def main():
    random.seed(42)
    DOCS.mkdir(exist_ok=True)

    base = Image.new("RGBA", (WIDTH, HEIGHT))
    draw_gradient(base, "#f8f0e7", "#efe3d5", "#e6d6c7")

    haze = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    paint_glow(haze, (260, 120), 170, "#fff7ef", 120)
    paint_glow(haze, (1060, 520), 220, "#ffd9cf", 90)
    paint_glow(haze, (980, 140), 150, "#f3c5b5", 70)
    haze = haze.filter(ImageFilter.GaussianBlur(28))
    base.alpha_composite(haze)

    bouquet = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(bouquet, "RGBA")

    draw.rounded_rectangle(
        (48, 40, WIDTH - 48, HEIGHT - 40),
        radius=38,
        outline=hex_to_rgba("#b88f5a", 120),
        width=2,
    )
    draw.rounded_rectangle(
        (72, 64, WIDTH - 72, HEIGHT - 64),
        radius=30,
        outline=hex_to_rgba("#ffffff", 120),
        width=2,
    )

    stems = [
        ((420, 560), (500, 450), (620, 270)),
        ((520, 560), (580, 430), (710, 230)),
        ((640, 560), (670, 420), (815, 290)),
        ((760, 560), (770, 430), (915, 250)),
        ((890, 560), (920, 430), (1030, 300)),
    ]
    for start, control, end in stems:
        draw_stem(draw, start, control, end, hex_to_rgba("#526c53", 180), 6)

    leaf_specs = [
        ((520, 430), 120, 28, -0.8),
        ((640, 400), 140, 32, -0.45),
        ((820, 410), 150, 34, 0.35),
        ((930, 430), 120, 28, 0.7),
        ((720, 500), 150, 36, 0.05),
    ]
    for center, length, width, angle in leaf_specs:
        draw_leaf(draw, center, length, width, angle, hex_to_rgba("#7f9b72", 165), "#607857")

    blossom_palettes = [
        ["#ee9a9a", "#d97f8d", "#f4c3c2"],
        ["#f2c079", "#f6d69d", "#d79957"],
        ["#caa6d9", "#e4c9ef", "#b685c8"],
        ["#e9b0c1", "#f5d2da", "#c77792"],
    ]
    flowers = [
        ((620, 255), 46, 9, blossom_palettes[0], 0.2),
        ((735, 210), 58, 11, blossom_palettes[1], -0.35),
        ((855, 260), 52, 10, blossom_palettes[2], 0.4),
        ((970, 230), 44, 9, blossom_palettes[3], -0.1),
        ((790, 325), 38, 8, blossom_palettes[0], 0.55),
    ]
    for center, radius, petals, palette, angle in flowers:
        draw_flower(draw, center, radius, petals, palette, angle)

    bouquet = bouquet.filter(ImageFilter.GaussianBlur(0.2))
    base.alpha_composite(bouquet)

    text_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(text_layer, "RGBA")
    title_font = load_font(82, bold=True)
    subtitle_font = load_font(32, bold=False)
    pill_font = load_font(24, bold=True)
    cn_font = load_font(48, bold=False)

    tdraw.rounded_rectangle(
        (94, 92, 386, 136),
        radius=22,
        fill=hex_to_rgba("#fbf4ee", 210),
        outline=hex_to_rgba("#c8a06e", 120),
    )
    tdraw.text((120, 101), "Flower Randomizer", font=pill_font, fill="#8c5e31")
    tdraw.text((94, 162), "Generative floral artwork", font=subtitle_font, fill="#6d5748")
    tdraw.text(
        (94, 208),
        "Random bouquets, shareable links,",
        font=subtitle_font,
        fill="#6d5748",
    )
    tdraw.text(
        (94, 248),
        "SVG and PNG export",
        font=subtitle_font,
        fill="#6d5748",
    )
    tdraw.text((92, 314), "Flower", font=title_font, fill="#2f2a25")
    tdraw.text((96, 404), "\u968f\u673a\u82b1\u675f\u751f\u6210\u5668", font=cn_font, fill="#5f4b43")

    base.alpha_composite(text_layer)
    final = base.convert("RGB")
    final.save(OUTPUT, quality=95)
    print(OUTPUT)


if __name__ == "__main__":
    main()
