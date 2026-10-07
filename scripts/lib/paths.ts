import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(here, "..", "..");
export const ASSETS_DIR = path.join(ROOT, "assets");
export const EPISODES_DIR = path.join(ROOT, "episodes");
export const OUTPUT_DIR = path.join(ROOT, "output");
export const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, "screenshots");
export const SRC_DIR = path.join(ROOT, "src");
export const GENERATED_DIR = path.join(SRC_DIR, "generated");
export const ENTRY_POINT = path.join(SRC_DIR, "index.ts");
export const MANIFEST_FILE = path.join(OUTPUT_DIR, ".render-manifest.json");
