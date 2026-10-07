#!/usr/bin/env python3
import io
import json
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

GAMES = [
    {"app_id": 220, "folder": "half-life-2", "indices": [0, 1, 3, 5]},
    {"app_id": 292030, "folder": "witcher-3", "indices": [0, 2, 4, 6]},
    {"app_id": 424840, "folder": "little-nightmares", "indices": [0, 1, 3, 5]},
    {"app_id": 1190460, "folder": "death-stranding", "indices": [0, 2, 4, 6]},
    {"app_id": 1643320, "folder": "stalker-2", "indices": [0, 2, 4, 6]},
]

HOOK_IMAGE_URL = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Peach%20close-up2.jpg"


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 TikTokQuizFactory/1.0",
        "Accept": "*/*",
    })
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.read()


def save_square(raw: bytes, out: Path, size: int = 720) -> None:
    with Image.open(io.BytesIO(raw)) as im:
        im = im.convert("RGB")
        w, h = im.size
        side = min(w, h)
        left = max(0, (w - side) // 2)
        top = max(0, (h - side) // 2)
        im = im.crop((left, top, left + side, top + side))
        im = im.resize((size, size), Image.Resampling.LANCZOS)
        im = ImageEnhance.Contrast(im).enhance(1.04)
        im = ImageEnhance.Color(im).enhance(1.04)
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, "JPEG", quality=92, optimize=True, progressive=True)


def steam_screenshots(app_id: int):
    url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&l=english&cc=us"
    data = json.loads(fetch(url).decode("utf-8"))
    block = data[str(app_id)]
    if not block.get("success"):
        raise RuntimeError(f"Steam appdetails failed for {app_id}")
    shots = block["data"].get("screenshots", [])
    if len(shots) < 4:
        raise RuntimeError(f"Not enough Steam screenshots for {app_id}")
    return [s.get("path_full") or s.get("path_thumbnail") for s in shots]


def download_game_assets():
    for game in GAMES:
        planned = [
            (n, index, ROOT / "assets" / "images" / game["folder"] / f"clue-{n}.jpg")
            for n, index in enumerate(game["indices"], start=1)
        ]
        missing = [(n, index, out) for n, index, out in planned if not out.exists() or out.stat().st_size < 10000]

        if not missing:
            print(f"all Steam clues already present: {game['folder']}")
            continue

        shots = steam_screenshots(game["app_id"])
        for n, index, out in missing:
            raw = fetch(shots[index % len(shots)])
            save_square(raw, out)
            print(f"saved {out.relative_to(ROOT)} <- Steam screenshot #{index + 1}")


def download_hook_image():
    out = ROOT / "assets" / "images" / "hooks" / "episode-003-bait.jpg"
    if out.exists() and out.stat().st_size >= 10000:
        print(f"hook image already present: {out.relative_to(ROOT)}")
        return

    raw = fetch(HOOK_IMAGE_URL)
    with Image.open(io.BytesIO(raw)) as im:
        im = im.convert("RGB")
        w, h = im.size
        target_ratio = 1080 / 1920
        current_ratio = w / h

        if current_ratio > target_ratio:
            crop_w = int(h * target_ratio)
            left = max(0, (w - crop_w) // 2)
            im = im.crop((left, 0, left + crop_w, h))
        else:
            crop_h = int(w / target_ratio)
            top = max(0, (h - crop_h) // 2)
            im = im.crop((0, top, w, top + crop_h))

        im = im.resize((1080, 1920), Image.Resampling.LANCZOS)
        im = im.filter(ImageFilter.GaussianBlur(radius=34))
        im = ImageEnhance.Color(im).enhance(1.18)
        im = ImageEnhance.Contrast(im).enhance(1.06)
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"saved {out.relative_to(ROOT)} <- Wikimedia Commons peach photo, blurred derivative")


if __name__ == "__main__":
    download_game_assets()
    download_hook_image()
