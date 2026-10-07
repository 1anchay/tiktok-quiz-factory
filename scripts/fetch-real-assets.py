#!/usr/bin/env python3
import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]

GAMES = [
    {
        "app_id": 620,
        "folder": "portal-2",
        "files": ["portal-gun.jpg", "companion-cube.jpg", "test-chamber.jpg", "turret.jpg"],
        "indices": [0, 1, 2, 3],
    },
    {
        "app_id": 264710,
        "folder": "subnautica",
        "files": ["seamoth.jpg", "oxygen-tank.jpg", "glowing-coral.jpg", "deep-creature.jpg"],
        "indices": [0, 2, 4, 6],
    },
    {
        "app_id": 409710,
        "folder": "bioshock",
        "files": ["lighthouse.jpg", "diving-helmet.jpg", "plasmid-hand.jpg", "rapture-corridor.jpg"],
        "indices": [0, 1, 2, 3],
    },
    {
        "app_id": 418370,
        "folder": "resident-evil-7",
        "files": ["cassette-recorder.jpg", "mold-corridor.jpg", "first-aid-bottle.jpg", "old-kitchen.jpg"],
        "indices": [0, 2, 4, 6],
    },
    {
        "app_id": 870780,
        "folder": "control",
        "files": ["red-phone.jpg", "brutalist-corridor.jpg", "levitating-chair.jpg", "black-pyramid.jpg"],
        "indices": [0, 1, 3, 5],
    },
]

MUSIC_CATALOG = "https://incompetech.com/music/royalty-free/pieces.json"
MUSIC_BASE = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/"
MUSIC_TITLE = "Digital Lemonade"


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
        # Use a mild center crop while preserving more scene context.
        side = min(w, h)
        left = max(0, (w - side) // 2)
        top = max(0, (h - side) // 2)
        im = im.crop((left, top, left + side, top + side))
        im = im.resize((size, size), Image.Resampling.LANCZOS)
        im = ImageEnhance.Contrast(im).enhance(1.05)
        im = ImageEnhance.Color(im).enhance(1.05)
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
        shots = steam_screenshots(game["app_id"])
        for filename, index in zip(game["files"], game["indices"]):
            chosen = shots[index % len(shots)]
            raw = fetch(chosen)
            out = ROOT / "assets" / "images" / game["folder"] / filename
            save_square(raw, out)
            print(f"saved {out.relative_to(ROOT)} <- Steam screenshot #{index + 1}")


def download_music():
    catalog = json.loads(fetch(MUSIC_CATALOG).decode("utf-8"))
    pieces = catalog if isinstance(catalog, list) else catalog.get("pieces", [])
    piece = next((p for p in pieces if p.get("title") == MUSIC_TITLE), None)
    if not piece:
        raise RuntimeError(f"Track not found in Incompetech catalog: {MUSIC_TITLE}")
    filename = piece["filename"]
    url = MUSIC_BASE + urllib.parse.quote(filename)
    out = ROOT / "assets" / "music" / "digital-lemonade.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(fetch(url))
    print(f"saved {out.relative_to(ROOT)} <- {MUSIC_TITLE} / Kevin MacLeod / Incompetech")


if __name__ == "__main__":
    download_game_assets()
    download_music()
