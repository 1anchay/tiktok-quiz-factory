#!/usr/bin/env python3
import base64
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFile

ROOT = Path(__file__).resolve().parents[1]
ImageFile.LOAD_TRUNCATED_IMAGES = True

SOURCES = [
    {
        "slug": "million-dvesti",
        "url": "https://www.youtube.com/watch?v=xYTFYYmUnAc",
        "audio_start": 0.0,
        "window_start": 0.0,
        "window_len": 12.0,
    },
    {
        "slug": "lev-rychit",
        "url": "https://www.youtube.com/watch?v=qoeHhTwjkBk",
        "audio_start": 0.0,
        "window_start": 0.0,
        "window_len": 9.0,
    },
    {
        "slug": "povar",
        "url": "https://www.youtube.com/watch?v=JyD13ifbAN4",
        "audio_start": 0.0,
        "window_start": 0.0,
        "window_len": 12.0,
    },
    {
        "slug": "tolik",
        "url": "https://www.youtube.com/watch?v=8yvgLoGqDBw",
        "audio_start": 2.0,
        "window_start": 0.0,
        "window_len": 8.0,
    },
    {
        "slug": "russkie-domoy",
        "url": "https://www.youtube.com/watch?v=lTsxYV54S00",
        "audio_start": 0.0,
        "window_start": 0.0,
        "window_len": 12.0,
    },
]

AUDIO_DURATION = 2.9


def run(cmd, check=True):
    print("+", " ".join(str(x) for x in cmd))
    return subprocess.run(cmd, check=check, text=True)


def have_file(path: Path, min_size: int = 10000):
    return path.exists() and path.stat().st_size >= min_size


def prepare_bait():
    out = ROOT / "assets" / "images" / "hooks" / "episode-004-bait.jpg"
    if have_file(out):
        print("bait image already present")
        return

    source = ROOT / "content" / "episode-004-bait.b64"
    raw = base64.b64decode(source.read_text(encoding="utf-8").strip())
    tmp = ROOT / ".tmp-episode-004-bait.jpg"
    tmp.write_bytes(raw)

    with Image.open(tmp) as im:
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
        im = ImageEnhance.Contrast(im).enhance(1.05)
        im = ImageEnhance.Color(im).enhance(1.05)
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, "JPEG", quality=91, optimize=True, progressive=True)

    tmp.unlink(missing_ok=True)
    print("saved", out.relative_to(ROOT))


def duration_seconds(video: Path) -> float:
    p = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(video),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(p.stdout.strip())


def download_video(url: str, out: Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    commands = [
        [
            sys.executable, "-m", "yt_dlp",
            "--no-playlist",
            "--force-overwrites",
            "--retries", "4",
            "--fragment-retries", "4",
            "--extractor-args", "youtube:player_client=android,web",
            "-f", "18/best[height<=480]/worst",
            "-o", str(out),
            url,
        ],
        [
            sys.executable, "-m", "yt_dlp",
            "--no-playlist",
            "--force-overwrites",
            "--retries", "4",
            "-f", "best[height<=480]/worst",
            "-o", str(out),
            url,
        ],
    ]
    last = None
    for command in commands:
        try:
            run(command)
            if have_file(out, 50000):
                return
        except subprocess.CalledProcessError as exc:
            last = exc
    raise RuntimeError(f"Could not download meme source: {url}") from last


def extract_assets(item):
    slug = item["slug"]
    image_dir = ROOT / "assets" / "images" / "memes" / slug
    audio = ROOT / "assets" / "audio" / "memes" / f"{slug}.mp3"

    frames_ready = all(have_file(image_dir / f"clue-{i}.jpg") for i in range(1, 5))
    if frames_ready and have_file(audio, 5000):
        print(f"all assets already present: {slug}")
        return

    with tempfile.TemporaryDirectory() as td:
        video = Path(td) / f"{slug}.mp4"
        download_video(item["url"], video)
        dur = duration_seconds(video)

        if not frames_ready:
            window_start = min(float(item["window_start"]), max(0.0, dur - 0.2))
            max_window = max(0.8, dur - window_start - 0.1)
            window_len = min(float(item["window_len"]), max_window)
            fractions = [0.12, 0.36, 0.62, 0.86]
            image_dir.mkdir(parents=True, exist_ok=True)

            for i, frac in enumerate(fractions, start=1):
                t = window_start + window_len * frac
                out = image_dir / f"clue-{i}.jpg"
                run([
                    "ffmpeg", "-y", "-ss", f"{t:.3f}", "-i", str(video),
                    "-frames:v", "1",
                    "-vf", "scale=760:760:force_original_aspect_ratio=increase,crop=720:720,eq=contrast=1.04:saturation=1.05",
                    "-q:v", "2", str(out),
                ])

        if not have_file(audio, 5000):
            audio.parent.mkdir(parents=True, exist_ok=True)
            start = min(float(item["audio_start"]), max(0.0, dur - 0.3))
            clip_len = min(AUDIO_DURATION, max(0.3, dur - start))
            run([
                "ffmpeg", "-y", "-ss", f"{start:.3f}", "-t", f"{clip_len:.3f}",
                "-i", str(video), "-vn",
                "-af", f"loudnorm=I=-15:TP=-1.5:LRA=7,afade=t=out:st={max(0.1, clip_len-0.18):.3f}:d=0.18",
                "-ar", "44100", "-ac", "2", "-b:a", "160k", str(audio),
            ])

    print(f"prepared meme assets: {slug}")


def main():
    prepare_bait()
    for source in SOURCES:
        extract_assets(source)


if __name__ == "__main__":
    main()
