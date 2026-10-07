#!/usr/bin/env python3
import argparse
import io
import json
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VEXA = "https://vexa-ai.pages.dev/image"
POLLINATIONS = "https://image.pollinations.ai/prompt"
VEXA_MODELS = ["seedream", "flux", "hd"]


def post_json(url: str, payload: dict, timeout: int = 120) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "TikTokQuizFactory/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def download(url: str, timeout: int = 180) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "TikTokQuizFactory/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()


def valid_image(raw: bytes) -> bool:
    try:
        with Image.open(io.BytesIO(raw)) as im:
            im.verify()
        return True
    except Exception:
        return False


def direct_pollinations(prompt: str, seed: int) -> tuple[bytes, str, str]:
    encoded = urllib.parse.quote(prompt, safe="")
    url = (
        f"{POLLINATIONS}/{encoded}"
        f"?model=flux&width=1024&height=1024&seed={seed}&nologo=true"
    )
    raw = download(url)
    if not valid_image(raw):
        raise RuntimeError("direct Flux endpoint returned non-image content")
    return raw, "flux", "image.pollinations.ai"


def via_vexa(prompt: str) -> tuple[bytes, str, str]:
    errors = []
    for model in VEXA_MODELS:
        try:
            payload = {"prompt": prompt, "model": model}
            if model == "hd":
                payload["preference"] = "quality"
            data = post_json(VEXA, payload)
            if not data.get("success") or not data.get("proxy_url"):
                raise RuntimeError(data.get("error") or "generation returned no proxy URL")
            raw = download(data["proxy_url"])
            if not valid_image(raw):
                raise RuntimeError("provider returned non-image content")
            return raw, str(data.get("model", model)), str(data.get("source", "unknown"))
        except Exception as exc:
            errors.append(f"{model}: {exc}")
    raise RuntimeError("; ".join(errors))


def generate(prompt: str, seed: int) -> tuple[bytes, str, str]:
    errors = []
    # One direct Flux request first: matrix jobs get independent runner egress.
    try:
        return direct_pollinations(prompt, seed)
    except Exception as exc:
        errors.append(f"direct Flux: {exc}")

    # Independent proxy fallback.
    for attempt in range(1, 3):
        try:
            return via_vexa(prompt)
        except Exception as exc:
            errors.append(f"Vexa attempt {attempt}: {exc}")
            time.sleep(2 * attempt)

    raise RuntimeError("All image routes failed: " + " | ".join(errors))


def normalize_jpeg(raw: bytes, out: Path, size: int) -> None:
    with Image.open(io.BytesIO(raw)) as im:
        im = im.convert("RGB")
        w, h = im.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        im = im.crop((left, top, left + side, top + side))
        im = im.resize((size, size), Image.Resampling.LANCZOS)
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, "JPEG", quality=91, optimize=True, progressive=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="content/episode-002-image-prompts.json")
    parser.add_argument("--index", type=int, help="Generate only one 1-based manifest image")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--artifact-dir", help="Also copy generated output here preserving assets/ path")
    args = parser.parse_args()

    manifest = json.loads((ROOT / args.manifest).read_text(encoding="utf-8"))
    size = int(manifest.get("size", 720))
    images = manifest["images"]

    selected = list(enumerate(images, start=1))
    if args.index is not None:
        if args.index < 1 or args.index > len(images):
            raise SystemExit(f"--index must be between 1 and {len(images)}")
        selected = [(args.index, images[args.index - 1])]

    for index, item in selected:
        rel = item["path"]
        out = ROOT / "assets" / rel
        if out.exists() and not args.force:
            print(f"[{index:02d}/{len(images)}] existing {rel}")
        else:
            print(f"[{index:02d}/{len(images)}] generating {rel}")
            raw, model, source = generate(item["prompt"], seed=20261007 + index * 97)
            normalize_jpeg(raw, out, size)
            print(f"  -> {out.relative_to(ROOT)} ({model}, {source})")

        if args.artifact_dir:
            target = ROOT / args.artifact_dir / "assets" / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(out, target)

    print("Done.")


if __name__ == "__main__":
    main()
