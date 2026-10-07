#!/usr/bin/env python3
import argparse
import io
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
API = "https://vexa-ai.pages.dev/image"
MODELS = ["seedream", "flux", "hd"]


def request_json(url: str, payload: dict, timeout: int = 150) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "TikTokQuizFactory/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def download(url: str, timeout: int = 150) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "TikTokQuizFactory/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()


def generate(prompt: str) -> tuple[bytes, str, str]:
    errors = []
    for model in MODELS:
        for attempt in range(1, 4):
            try:
                payload = {"prompt": prompt, "model": model}
                if model == "hd":
                    payload["preference"] = "quality"
                data = request_json(API, payload)
                if not data.get("success") or not data.get("proxy_url"):
                    raise RuntimeError(data.get("error") or "generation returned no image")
                raw = download(data["proxy_url"])
                return raw, str(data.get("model", model)), str(data.get("source", "unknown"))
            except Exception as exc:
                errors.append(f"{model} attempt {attempt}: {exc}")
                time.sleep(2.5 * attempt)
    raise RuntimeError("All image models failed:\n" + "\n".join(errors[-9:]))


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
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    manifest_path = ROOT / args.manifest
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    size = int(manifest.get("size", 720))
    records = []

    for index, item in enumerate(manifest["images"], start=1):
        rel = item["path"]
        out = ROOT / "assets" / rel
        if out.exists() and not args.force:
            print(f"[{index:02d}/{len(manifest['images'])}] skip {rel}")
            records.append({"path": rel, "status": "existing"})
            continue

        print(f"[{index:02d}/{len(manifest['images'])}] generate {rel}")
        raw, model, source = generate(item["prompt"])
        normalize_jpeg(raw, out, size)
        print(f"  -> {out.relative_to(ROOT)} ({model}, {source})")
        records.append({"path": rel, "status": "generated", "model": model, "source": source, "prompt": item["prompt"]})
        time.sleep(1.0)

    meta = ROOT / "assets" / "images" / "episode-002-generation.json"
    meta.parent.mkdir(parents=True, exist_ok=True)
    meta.write_text(json.dumps({
        "episode": manifest.get("episode"),
        "generated_at_unix": int(time.time()),
        "generator": "vexa-ai.pages.dev",
        "records": records,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Done. Metadata: {meta.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
