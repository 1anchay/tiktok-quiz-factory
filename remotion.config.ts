import { Config } from "@remotion/cli/config";

// Applies to `npx remotion ...` / Remotion Studio only.
// Programmatic renders (scripts/*) pass the same options explicitly.
Config.setPublicDir("./assets");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
