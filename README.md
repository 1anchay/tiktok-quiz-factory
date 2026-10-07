# TikTok Quiz Factory

Automated factory for vertical (9:16) gaming-quiz TikTok videos, built with **Remotion + React + TypeScript**.
A new video is created by adding a JSON file to `episodes/` — no React code changes needed.

First format: **«Сможешь пройти 5 уровней?»** — `HOOK → LEVEL 1–4 → BOSS → CTA`,
content type «Угадай игру по четырём предметам».

| Output | Value |
| --- | --- |
| Resolution | 1080 × 1920 (9:16) |
| Frame rate | 30 fps |
| Codec | MP4 / H.264 (yuv420p, CRF 18) + AAC 192k |
| Duration | ~33 s with default timing |

## Quick start (Windows / macOS / Linux)

Requires **Node.js 20+**. FFmpeg and Chrome Headless Shell are bundled/downloaded by Remotion automatically.

```bash
npm install
npm run typecheck
npm run make -- episode-001        # → output/episode-001.mp4
npm run screenshot -- episode-001  # → output/screenshots/episode-001/*.png
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run studio` | Opens Remotion Studio. Every episode JSON appears as its own composition. |
| `npm run make -- <id>` | Validates and renders `output/<id>.mp4`. Skips if unchanged; add `--force` to re-render. |
| `npm run screenshot -- <id>` | Renders control frames: `hook`, `level-1`, `level-1-reveal`, `boss-intro`, `boss`, `boss-reveal`, `ending`. |
| `npm run batch` | Renders all **new or changed** episodes (content hashing). `--force` renders all, `--dry` only lists. |
| `npm run validate [-- <id>]` | Validates schema + assets without rendering. |
| `npm run sync` | Regenerates the Studio registry and `episodes/episode.schema.json`. Runs automatically before studio/typecheck/renders. |
| `npm run assets:audio` | Re-synthesises the placeholder music/SFX (procedural, royalty-free). |
| `npm run typecheck` | TypeScript check. |

Set `RENDER_CONCURRENCY=4` to override render parallelism.

## Project structure

```
episodes/                 Episode JSON files (one video each) + generated JSON Schema
assets/                   Remotion public dir — every asset path in JSON is relative to here
  images/                 Clue images (AI-generated originals for the demo)
  music/                  Music beds (procedurally synthesised)
  sounds/                 SFX pack (procedurally synthesised)
  backgrounds/            Reserved for background plates
output/                   Rendered MP4s, screenshots, .render-manifest.json (git-ignored)
scripts/
  make.ts / screenshot.ts / batch.ts / validate.ts / sync-episodes.ts
  generate-audio.ts       WAV synthesiser for placeholder audio
  lib/                    paths, episode loading/validation, hashing, rendering, CLI helpers
src/
  index.ts / Root.tsx     Remotion entry + composition registry
  schema/episode.ts       Zod schema = single source of truth for episode JSON
  engine/                 timeline (frame math), layout + TikTok safe zones, types
  compositions/           QuizEpisode (assembles background, scenes, progress, transitions, audio)
  scenes/                 HookScene, LevelScene, BossScene, CtaScene
  components/             ClueCard, ClueGrid, Countdown, AnswerBanner, ProgressTrack, Background,
                          Particles, Burst, GlitchText, SwipeTransition, SceneFrame, ErrorScreen
  animations/             springs, shake, pulse, enter/exit helpers
  audio/                  sound pack, timeline-driven SFX cues, music/SFX layer
  themes/                 color themes (neon-arcade, cyber-sunset) + fonts (Unbounded, Rubik)
  integrations/           Contracts for future AI / assets / TTS / subtitles / publishing / analytics / A/B / LIVE
  generated/              Auto-generated registry (git-ignored)
```

## Episode JSON

```jsonc
{
  "$schema": "./episode.schema.json",      // editor autocomplete + validation
  "id": "episode-002",                      // must match the file name
  "series": "Сможешь пройти 5 уровней?",
  "hook": { "title": "СМОЖЕШЬ ПРОЙТИ 5 УРОВНЕЙ?", "subtitle": "УГАДАЙ ИГРУ ПО 4 ПРЕДМЕТАМ" },
  "theme": "neon-arcade",                   // or "cyber-sunset"
  "question": "УГАДАЙ ИГРУ",
  "levels": [                               // exactly 4
    {
      "answer": "MINECRAFT",
      "difficulty": "easy",                 // easy | medium | hard | expert
      "clues": [                            // exactly 4; each needs image or emoji (+ optional label)
        { "image": "images/minecraft/pickaxe.jpg" },
        { "emoji": "💣", "label": "TNT" }
      ]
    }
  ],
  "boss": {
    "answer": "DARK SOULS",
    "revealAnswer": false,                  // default false → "???" + comment prompt
    "commentPrompt": "ПИШИ ОТВЕТ В КОММЕНТАХ",
    "clues": [ /* 4 clues */ ]
  },
  "music": { "track": "music/arcade-drive.wav", "bossTrack": "music/boss-rumble.wav", "volume": 0.4, "sfxVolume": 0.85 },
  "cta": {
    "headline": "ЗНАЕШЬ BOSS? ПИШИ ОТВЕТ",
    "question": "СКОЛЬКО У ТЕБЯ ИЗ 5?",
    "subscribe": "ПОДПИШИСЬ — ПРОДОЛЖЕНИЕ В СЛЕДУЮЩЕМ ВЫПУСКЕ"
  },
  "timing": { "countdown": 3 },             // optional overrides (seconds)
  "meta": { "tags": ["games"] }             // free-form, reserved for pipeline stages
}
```

Validation errors are precise, e.g.:

```
✗ Episode "episode-002" is invalid:
  • levels.1.clues: Each level needs exactly 4 clues
  • Missing asset: C:\dev\tiktok-quiz-factory\assets\images\gta\money.jpg
```

In Studio an invalid episode renders an error screen listing the same problems.

## How it works

- **Timeline-driven**: `src/engine/timeline.ts` turns an episode into frame-exact segments. Scenes,
  progress indicator, transitions, SFX cues and screenshot frames are all derived from it — change
  timing in one place and everything follows.
- **Safe zones**: key text stays inside `SAFE` (`src/engine/layout.ts`), clear of TikTok's top tabs,
  bottom caption and right action column.
- **Responsive typography**: `fitFontSize` scales titles/answers to their box, so long answers never overflow.
- **Audio**: music bed ducks out for a dedicated boss track; whoosh / pop / tick / reveal / boss-impact /
  riser / glitch / chime cues are placed automatically from the timeline.
- **Incremental batch**: the render hash = engine source + Remotion version + normalized episode JSON +
  bytes of every referenced asset. Stored in `output/.render-manifest.json`; unchanged episodes are skipped.

## Asset licensing

All demo assets are original: clue images were AI-generated for this project (generic items, no logos,
no game screenshots), and all audio is synthesised from code by `scripts/generate-audio.ts`.
Game names are used only as quiz answers.

## Roadmap (architecture already prepared in `src/integrations/`)

- AI episode generation (`ContentGenerator`)
- Automatic asset search/generation with license tracking (`AssetProvider`)
- TTS voice-over + subtitles (`TTSProvider`, `SubtitleProvider`)
- TikTok publishing + scheduling (`Publisher`)
- Analytics ingestion (`AnalyticsProvider`) and A/B variants (`ExperimentRunner`, local expander included)
- TikTok LIVE integration (`LiveConnector`)

No paid APIs are connected yet.
