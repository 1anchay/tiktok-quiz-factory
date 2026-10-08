#!/usr/bin/env python3
import base64
import json
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
    {"slug": "tolik-ebolik", "video_id": "qXo1P6QwiI0"},
    {"slug": "lev-rychit", "video_id": "qoeHhTwjkBk"},
    {"slug": "povar", "video_id": "JyD13ifbAN4"},
    {"slug": "tolik", "video_id": "8yvgLoGqDBw"},
    {"slug": "russkie-domoy", "video_id": "lTsxYV54S00"},
]

DIRECT_AUDIO = {
    "tolik": "https://www.myinstants.com/media/sounds/tolik-eto-podezd.mp3",
    "tolik-ebolik": "https://www.myinstants.com/media/sounds/tolik-ebolik.mp3",
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


def download_lion_audio() -> bool:
    slug = "lev-rychit"
    out = ROOT / "assets" / "audio" / "memes" / f"{slug}.mp3"
    if have_file(out, 5000):
        print(f"lion audio already present: {out.relative_to(ROOT)}")
        return True

    # Public Coub API exposes standalone audio versions; try them before video extractors.
    try:
        data = json.loads(fetch("https://coub.com/api/v2/coubs/17179o").decode("utf-8"))
        candidates = []
        def collect(obj, path=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    collect(value, path + "/" + key)
            elif isinstance(obj, list):
                for value in obj:
                    collect(value, path)
            elif isinstance(obj, str) and obj.startswith("http") and (
                ".mp3" in obj or ("/audio" in path.lower() and any(ext in obj.lower() for ext in (".m4a", ".aac", ".ogg")))
            ):
                candidates.append(obj)
        collect(data)
        for url in candidates:
            try:
                raw = fetch(url)
                normalize_audio(raw, out)
                if have_file(out, 5000):
                    print("original lion meme audio extracted from Coub API")
                    return True
            except Exception as exc:
                print("Coub audio candidate failed:", exc)
    except Exception as exc:
        print("Coub API unavailable:", exc)

    # Coub or RuTube downloads are less likely to require a YouTube login.
    source_urls = [
        "https://coub.com/view/17179o",
        "https://coub.com/view/jgr4e",
        "https://rutube.ru/video/8c5194bacc06fbb1c3649b7300a500c8/",
    ]
    with tempfile.TemporaryDirectory() as td:
        for url in source_urls:
            try:
                template = str(Path(td) / "lion.%(ext)s")
                subprocess.run(
                    ["python", "-m", "yt_dlp", "--no-playlist", "--retries", "2",
                     "-f", "bestaudio/best", "-o", template, url],
                    check=True, timeout=75
                )
                found = sorted(Path(td).glob("lion.*"))
                if found:
                    subprocess.run(
                        ["ffmpeg", "-y", "-i", str(found[0]), "-t", "3.0", "-vn",
                         "-af", "loudnorm=I=-15:TP=-1.5:LRA=7",
                         "-ar", "44100", "-ac", "2", "-b:a", "160k", str(out)],
                        check=True,
                    )
                    if have_file(out, 5000):
                        print("original lion meme audio extracted from", url)
                        return True
            except Exception as exc:
                print("Lion source failed", url, exc)

    # Make the meme audible, but explicitly flag synthetic fallback.
    print("WARNING: original lion clip not available; using narrated fallback")
    with tempfile.TemporaryDirectory() as td:
        voice = Path(td) / "lion-voice.wav"
        subprocess.run([
            "espeak-ng", "-v", "uk", "-s", "185", "-a", "180",
            "-w", str(voice), "Хочете я вам зараз розкажу, як лев ричить? А-а-а!"
        ], check=True)
        normalize_audio(voice.read_bytes(), out)
    return have_file(out, 5000)


def download_music() -> None:
    out = ROOT / "assets" / "music" / "monkeys-spinning-monkeys.mp3"
    if have_file(out, 100000):
        print("new background music already present")
        return
    url = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Monkeys%20Spinning%20Monkeys.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(fetch(url))
    if not have_file(out, 100000):
        raise RuntimeError("Music download was empty or truncated")
    print("Downloaded Monkeys Spinning Monkeys (CC BY 4.0)")


def main() -> None:
    approved = ROOT / "assets" / "images" / "hooks" / "episode-004-approved.webp"
    if not have_file(approved, 2000):
        raise RuntimeError("Approved user intro artwork not checked in")
    for meme in MEMES:
        prepare_real_frames(meme["slug"], meme["video_id"])
    for slug in ["tolik-ebolik", "povar", "tolik", "russkie-domoy"]:
        if not prepare_audio(slug):
            raise RuntimeError("Required meme audio missing: " + slug)
    if not download_lion_audio():
        raise RuntimeError("Second meme audio still missing")
    download_music()


if __name__ == "__main__":
    main()
