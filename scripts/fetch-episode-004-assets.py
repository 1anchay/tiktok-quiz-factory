#!/usr/bin/env python3
import base64
import html
import re
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFile

ROOT = Path(__file__).resolve().parents[1]
ImageFile.LOAD_TRUNCATED_IMAGES = True

MEMES = [
    {"slug": "million-dvesti", "video_id": "xYTFYYmUnAc"},
    {"slug": "lev-rychit", "video_id": "qoeHhTwjkBk"},
    {"slug": "povar", "video_id": "JyD13ifbAN4"},
    {"slug": "tolik", "video_id": "8yvgLoGqDBw"},
    {"slug": "russkie-domoy", "video_id": "lTsxYV54S00"},
]

DIRECT_AUDIO = {
    "tolik": "https://www.myinstants.com/media/sounds/tolik-eto-podezd.mp3",
}

VOICEBOT_CATEGORY = "https://voicebot.su/ru/category/populyarnye-memy/"
VOICEBOT_TITLES = {
    "povar": "Повар (Повар спрашивает повара)",
    "russkie-domoy": "Русские идут домой (Всего хоро-шего)",
}

AUDIO_DURATION = 3.0


def fetch(url: str, referer: str | None = None) -> bytes:
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/152 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "ru,en;q=0.8",
    }
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=90) as res:
        return res.read()


def have_file(path: Path, min_size: int = 5000) -> bool:
    return path.exists() and path.stat().st_size >= min_size


def prepare_bait() -> None:
    out = ROOT / "assets" / "images" / "hooks" / "episode-004-bait.jpg"
    if have_file(out, 10000):
        print(f"bait already present: {out.relative_to(ROOT)}")
        return

    source = ROOT / "content" / "episode-004-bait.b64"
    raw = base64.b64decode(source.read_text(encoding="utf-8").strip())
    with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
        tmp.write(raw)
        tmp.flush()
        with Image.open(tmp.name) as im:
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
    print(f"saved bait: {out.relative_to(ROOT)}")


def save_square(raw: bytes, out: Path, size: int = 720) -> None:
    with Image.open(tempfile.SpooledTemporaryFile()) as _:
        pass


def image_from_bytes(raw: bytes, out: Path, size: int = 720) -> None:
    import io
    with Image.open(io.BytesIO(raw)) as im:
        im = im.convert("RGB")
        w, h = im.size
        side = min(w, h)
        left = max(0, (w - side) // 2)
        top = max(0, (h - side) // 2)
        im = im.crop((left, top, left + side, top + side))
        im = im.resize((size, size), Image.Resampling.LANCZOS)
        im = ImageEnhance.Contrast(im).enhance(1.06)
        im = ImageEnhance.Color(im).enhance(1.08)
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, "JPEG", quality=92, optimize=True, progressive=True)


def prepare_real_frames(slug: str, video_id: str) -> None:
    out_dir = ROOT / "assets" / "images" / "memes" / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    # YouTube publishes 0.jpg plus 1/2/3.jpg storyboard thumbnails without video authentication.
    thumb_ids = [1, 2, 3, 0]
    for n, thumb_id in enumerate(thumb_ids, start=1):
        out = out_dir / f"clue-{n}.jpg"
        if have_file(out, 8000):
            print(f"frame already present: {out.relative_to(ROOT)}")
            continue

        candidates = [
            f"https://i.ytimg.com/vi/{video_id}/{thumb_id}.jpg",
            f"https://img.youtube.com/vi/{video_id}/{thumb_id}.jpg",
        ]
        last = None
        for url in candidates:
            try:
                raw = fetch(url)
                image_from_bytes(raw, out)
                print(f"saved real frame: {out.relative_to(ROOT)} <- {url}")
                break
            except Exception as exc:
                last = exc
        else:
            raise RuntimeError(f"Could not fetch thumbnails for {video_id}") from last


def find_voicebot_page(title: str) -> str | None:
    try:
        raw = fetch(VOICEBOT_CATEGORY)
        page = raw.decode("utf-8", errors="ignore")
        target = html.escape(title)
        # Find the nearest /ru/sound/... href around the visible title.
        idx = page.lower().find(title.lower())
        if idx < 0:
            idx = page.lower().find(target.lower())
        if idx < 0:
            return None
        area = page[max(0, idx - 1200): idx + 1200]
        matches = re.findall(r'href=["\']([^"\']*/ru/sound/[^"\']+/?)["\']', area, flags=re.I)
        if not matches:
            return None
        href = html.unescape(matches[-1])
        return urllib.parse.urljoin(VOICEBOT_CATEGORY, href)
    except Exception as exc:
        print(f"voicebot search failed for {title}: {exc}")
        return None


def scrape_audio_url(page_url: str) -> str | None:
    try:
        raw = fetch(page_url)
        page = raw.decode("utf-8", errors="ignore")

        patterns = [
            r'(https?://[^"\'<> ]+\.mp3(?:\?[^"\'<> ]*)?)',
            r'["\']([^"\']+\.mp3(?:\?[^"\']*)?)["\']',
            r'data-(?:src|url)=["\']([^"\']+)["\']',
        ]
        for pattern in patterns:
            for value in re.findall(pattern, page, flags=re.I):
                value = html.unescape(value).replace("\\/", "/")
                if ".mp3" not in value.lower():
                    continue
                return urllib.parse.urljoin(page_url, value)
    except Exception as exc:
        print(f"audio scrape failed: {page_url}: {exc}")
    return None


def fetch_audio_source(slug: str) -> tuple[str, str | None] | None:
    if slug in DIRECT_AUDIO:
        return DIRECT_AUDIO[slug], "https://www.myinstants.com/"

    title = VOICEBOT_TITLES.get(slug)
    if title:
        page = find_voicebot_page(title)
        if page:
            url = scrape_audio_url(page)
            if url:
                return url, page
            print(f"no direct mp3 found on {page}")

    return None


def normalize_audio(raw: bytes, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        src = Path(td) / "source.mp3"
        src.write_bytes(raw)
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(src), "-t", str(AUDIO_DURATION), "-vn",
                "-af", "loudnorm=I=-15:TP=-1.5:LRA=7,afade=t=out:st=2.82:d=0.18",
                "-ar", "44100", "-ac", "2", "-b:a", "160k", str(out),
            ],
            check=True,
        )


def prepare_audio(slug: str) -> bool:
    out = ROOT / "assets" / "audio" / "memes" / f"{slug}.mp3"
    if have_file(out, 5000):
        print(f"audio already present: {out.relative_to(ROOT)}")
        return True

    source = fetch_audio_source(slug)
    if not source:
        print(f"no reliable direct audio source found: {slug}; leaving reveal audio disabled")
        return False

    url, referer = source
    try:
        raw = fetch(url, referer=referer)
        normalize_audio(raw, out)
        print(f"saved meme audio: {out.relative_to(ROOT)} <- {url}")
        return True
    except Exception as exc:
        print(f"audio download failed for {slug}: {exc}; continuing without it")
        return False


def main() -> None:
    prepare_bait()
    for meme in MEMES:
        prepare_real_frames(meme["slug"], meme["video_id"])

    # Optional original meme snippets. Failures do NOT fail the video build.
    for slug in ["povar", "tolik", "russkie-domoy"]:
        prepare_audio(slug)


if __name__ == "__main__":
    main()
