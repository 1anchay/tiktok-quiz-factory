import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, pulse, SPRINGS } from "../animations";
import { ProgressTrack } from "../components/ProgressTrack";
import { SceneFrame } from "../components/SceneFrame";
import type { Segment } from "../engine/timeline";
import type { Episode } from "../schema/episode";
import type { Theme } from "../themes";
import { FONTS } from "../themes/fonts";
import { fitFontSize, punchyTextShadow, rgba } from "../utils/style";

interface Props {
  episode: Episode;
  theme: Theme;
  segment: Segment;
}

const DECOR = [
  { left: -70, top: 250, rot: -14, size: 330 },
  { left: 800, top: 300, rot: 12, size: 320 },
  { left: -90, top: 1460, rot: 10, size: 300 },
  { left: 840, top: 1430, rot: -10, size: 310 },
];

const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 137) % 980,
  y: (i * 211) % 1680,
  size: 8 + (i % 5) * 5,
  drift: 10 + (i % 4) * 7,
}));

export const HookScene: React.FC<Props> = ({ episode, theme, segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const baitFrames = episode.hook.bait ? Math.round(fps * (episode.hook.baitDuration ?? 2.0)) : 0;
  const revealFrames = episode.hook.baitReveal ? Math.round(fps * (episode.hook.baitRevealDuration ?? 1.0)) : 0;

  const showBait = Boolean(episode.hook.bait) && frame < baitFrames;
  const showReveal =
    Boolean(episode.hook.baitReveal) &&
    frame >= baitFrames &&
    frame < baitFrames + revealFrames;
  const showMain = !showBait && !showReveal;
  const mainFrame = Math.max(0, frame - baitFrames - revealFrames);

  const words = episode.hook.title.split(/\s+/);
  const issue = episode.id.match(/\d+/)?.[0];

  const decorImages = [...episode.levels.map((l) => l.clues[0]), episode.boss.clues[0]]
    .map((c) => c.image)
    .filter((x): x is string => Boolean(x))
    .slice(0, 4);

  const subEnter = pop(mainFrame, fps, 4 + words.length * 3, SPRINGS.snappy);
  const chipEnter = pop(mainFrame, fps, 0, SPRINGS.snappy);

  const revealBoundary = baitFrames;
  const mainBoundary = baitFrames + revealFrames;
  const flashAtReveal = Math.max(0, 1 - Math.abs(frame - revealBoundary) / 5);
  const flashAtMain = Math.max(0, 1 - Math.abs(frame - mainBoundary) / 5);
  const flash = Math.max(flashAtReveal, flashAtMain);
  const baitPulse = 1 + Math.sin(frame / 4) * 0.035;
  const baitZoom = 1.08 + Math.min(1, frame / Math.max(1, baitFrames)) * 0.07;
  const revealFrame = Math.max(0, frame - baitFrames);

  return (
    <SceneFrame duration={segment.duration}>
      {showMain &&
        decorImages.map((src, i) => {
          const d = DECOR[i];
          const enter = pop(mainFrame, fps, i * 3, SPRINGS.soft);
          return (
            <div
              key={src}
              style={{
                position: "absolute",
                left: d.left,
                top: d.top + Math.sin((mainFrame + i * 20) / 20) * 14,
                width: d.size,
                height: d.size,
                borderRadius: 40,
                overflow: "hidden",
                transform: `rotate(${d.rot + Math.sin(mainFrame / 30 + i) * 3}deg) scale(${enter})`,
                opacity: 0.55,
                border: `5px solid ${rgba(i % 2 ? theme.colors.secondary : theme.colors.primary, 0.9)}`,
                boxShadow: `0 0 50px ${rgba(i % 2 ? theme.colors.secondary : theme.colors.primary, 0.5)}`,
              }}
            >
              <Img
                src={staticFile(src)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "blur(1.5px) brightness(0.7)",
                }}
              />
            </div>
          );
        })}

      {showBait && episode.hook.bait && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            background: "#13040e",
            zIndex: 20,
          }}
        >
          {episode.hook.baitImage && (
            <Img
              src={staticFile(episode.hook.baitImage)}
              style={{
                position: "absolute",
                inset: -90,
                width: 1260,
                height: 2100,
                objectFit: "cover",
                transform: `scale(${baitZoom})`,
                filter: `blur(${episode.hook.baitBlur ?? 38}px) brightness(0.68) saturate(1.5) contrast(1.08)`,
              }}
            />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(255,0,110,0.36), rgba(255,179,0,0.16) 32%, rgba(0,238,255,0.24) 68%, rgba(87,0,255,0.32))",
              mixBlendMode: "screen",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 34,
              borderRadius: 46,
              border: `7px solid ${frame % 12 < 6 ? "#ffef3a" : "#ff2f7d"}`,
              boxShadow:
                "0 0 34px rgba(255,239,58,0.75), inset 0 0 60px rgba(255,47,125,0.34), 0 0 90px rgba(0,238,255,0.2)",
            }}
          />

          {[0, 1].map((row) => (
            <div
              key={row}
              style={{
                position: "absolute",
                left: -120 + ((frame * 12) % 160),
                right: -120,
                [row === 0 ? "top" : "bottom"]: 94,
                height: 42,
                transform: `rotate(${row === 0 ? -2 : 2}deg)`,
                background:
                  "repeating-linear-gradient(135deg, #ffe928 0 34px, #111 34px 68px)",
                boxShadow: "0 0 24px rgba(255,233,40,0.55)",
                opacity: 0.92,
              }}
            />
          ))}

          {SPARKS.map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: s.x + Math.sin((frame + i * 9) / 8) * s.drift,
                top: s.y + Math.cos((frame + i * 5) / 10) * s.drift,
                width: s.size,
                height: s.size,
                borderRadius: 999,
                background: i % 3 === 0 ? "#00f0ff" : i % 3 === 1 ? "#ff2f7d" : "#ffe928",
                boxShadow: "0 0 24px currentColor",
                opacity: 0.45 + (i % 4) * 0.1,
              }}
            />
          ))}

          <div
            style={{
              position: "absolute",
              top: 228,
              left: 74,
              right: 74,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                padding: "22px 44px",
                borderRadius: 28,
                background: "linear-gradient(135deg, #e80036, #ff2f7d)",
                border: "5px solid #ffffff",
                boxShadow:
                  "0 12px 0 rgba(0,0,0,0.42), 0 0 50px rgba(255,47,125,0.9), 0 0 90px rgba(0,238,255,0.35)",
                fontFamily: FONTS.display,
                fontWeight: 900,
                fontSize: 62,
                color: "#ffffff",
                letterSpacing: 2,
                textShadow: "0 5px 0 rgba(0,0,0,0.36)",
                transform: `scale(${(0.92 + pop(frame, fps, 0, SPRINGS.heavy) * 0.08) * baitPulse}) rotate(-1deg)`,
              }}
            >
              ⚠ {episode.hook.bait} ⚠
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 242,
              left: 70,
              right: 70,
              textAlign: "center",
              fontFamily: FONTS.display,
              fontWeight: 900,
              fontSize: 50,
              color: "#ffffff",
              letterSpacing: 2,
              textShadow:
                "5px 0 0 rgba(255,47,125,0.65), -5px 0 0 rgba(0,238,255,0.55), 0 6px 18px rgba(0,0,0,0.8)",
              transform: `scale(${1 + Math.sin(frame / 5) * 0.03})`,
            }}
          >
            НЕ ЛИСТАЙ...
          </div>
        </div>
      )}

      {showReveal && episode.hook.baitReveal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 21,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 72px",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #ff2f7d 0%, #ff7a00 30%, #7017ff 62%, #00c8ff 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -280,
              background:
                "conic-gradient(from 0deg, rgba(255,255,255,0.04), rgba(255,255,255,0.32), rgba(255,255,255,0.03), rgba(255,255,255,0.24), rgba(255,255,255,0.04))",
              transform: `rotate(${revealFrame * 5}deg) scale(1.15)`,
              opacity: 0.65,
            }}
          />

          {SPARKS.slice(0, 12).map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: (s.x + revealFrame * (i % 2 ? 8 : -6) + 1200) % 1080,
                top: s.y,
                width: s.size + 5,
                height: s.size + 5,
                transform: `rotate(${revealFrame * (8 + i)}deg)`,
                background: i % 2 ? "#ffffff" : "#ffe928",
                borderRadius: i % 3 ? 999 : 4,
                boxShadow: "0 0 26px rgba(255,255,255,0.8)",
                opacity: 0.7,
              }}
            />
          ))}

          <div
            style={{
              position: "absolute",
              transform: "translateX(-7px)",
              fontFamily: FONTS.display,
              fontWeight: 900,
              fontSize: fitFontSize(episode.hook.baitReveal, {
                maxWidth: 900,
                maxSize: 108,
                minSize: 56,
                ratio: 1.04,
              }),
              lineHeight: 1.08,
              color: "#00efff",
              textAlign: "center",
              whiteSpace: "pre-line",
              opacity: 0.65,
            }}
          >
            {episode.hook.baitReveal}
          </div>

          <div
            style={{
              position: "absolute",
              transform: "translateX(7px)",
              fontFamily: FONTS.display,
              fontWeight: 900,
              fontSize: fitFontSize(episode.hook.baitReveal, {
                maxWidth: 900,
                maxSize: 108,
                minSize: 56,
                ratio: 1.04,
              }),
              lineHeight: 1.08,
              color: "#ff2f7d",
              textAlign: "center",
              whiteSpace: "pre-line",
              opacity: 0.65,
            }}
          >
            {episode.hook.baitReveal}
          </div>

          <div
            style={{
              position: "relative",
              fontFamily: FONTS.display,
              fontWeight: 900,
              fontSize: fitFontSize(episode.hook.baitReveal, {
                maxWidth: 900,
                maxSize: 108,
                minSize: 56,
                ratio: 1.04,
              }),
              lineHeight: 1.08,
              color: "#ffffff",
              textAlign: "center",
              whiteSpace: "pre-line",
              textShadow: "0 7px 0 rgba(0,0,0,0.28), 0 0 36px rgba(255,255,255,0.55)",
              transform: `scale(${pop(revealFrame, fps, 0, SPRINGS.heavy)}) rotate(-1deg)`,
            }}
          >
            {episode.hook.baitReveal}
          </div>
        </div>
      )}

      {showMain && (
        <div
          style={{
            position: "absolute",
            top: 230,
            bottom: 420,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 54,
            transform: `scale(${1 + Math.max(0, 1 - mainFrame / 8) * 0.08})`,
          }}
        >
          {issue && (
            <div
              style={{
                transform: `scale(${chipEnter})`,
                padding: "12px 30px",
                borderRadius: 999,
                border: `4px solid ${theme.colors.primary}`,
                background: rgba("#000000", 0.45),
                fontFamily: FONTS.display,
                fontWeight: 800,
                fontSize: 32,
                color: theme.colors.primary,
                letterSpacing: 4,
                boxShadow: `0 0 30px ${rgba(theme.colors.primary, 0.5)}`,
              }}
            >
              {`ВЫПУСК #${issue}`}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {words.map((word, i) => {
              const enter = pop(mainFrame, fps, 2 + i * 3, SPRINGS.heavy);
              const hasDigit = /\d/.test(word);
              const size = hasDigit
                ? 210
                : fitFontSize(word, { maxWidth: 860, maxSize: 138, minSize: 64, ratio: 1.08 });
              const wobble = hasDigit ? 1 + pulse(mainFrame, 16) * 0.06 : 1;
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: FONTS.display,
                    fontWeight: 900,
                    fontSize: size,
                    lineHeight: 1.02,
                    color: hasDigit ? theme.colors.accent : "#ffffff",
                    textShadow: punchyTextShadow(
                      hasDigit ? theme.colors.accent : theme.colors.primary,
                      hasDigit ? 12 : 9,
                    ),
                    transform: `scale(${interpolate(enter, [0, 1], [2.2, 1]) * wobble}) rotate(${(i % 2 ? 1 : -1) * 2}deg)`,
                    opacity: Math.min(1, enter * 2),
                    whiteSpace: "nowrap",
                  }}
                >
                  {word}
                </div>
              );
            })}
          </div>

          {episode.hook.subtitle && (
            <div
              style={{
                transform: `translateY(${(1 - subEnter) * 60}px) rotate(-2deg) scale(${subEnter})`,
                padding: "20px 38px",
                borderRadius: 24,
                background: theme.colors.secondary,
                fontFamily: FONTS.display,
                fontWeight: 900,
                fontSize: fitFontSize(episode.hook.subtitle, { maxWidth: 780, maxSize: 46, minSize: 30 }),
                color: "#ffffff",
                textAlign: "center",
                boxShadow: `0 10px 0 rgba(0,0,0,0.45), 0 0 50px ${rgba(theme.colors.secondary, 0.6)}`,
                textShadow: "0 4px 0 rgba(0,0,0,0.35)",
                whiteSpace: "nowrap",
              }}
            >
              {episode.hook.subtitle}
            </div>
          )}

          <div style={{ transform: `scale(${pop(mainFrame, fps, 10, SPRINGS.soft)})` }}>
            <ProgressTrack theme={theme} current={-1} completed={0} width={820} nodeSize={88} animateIn />
          </div>
        </div>
      )}

      {flash > 0 && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 90,
              background: "#ffffff",
              opacity: flash * 0.82,
              mixBlendMode: "screen",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: -180,
              zIndex: 89,
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95), rgba(255,235,0,0.5) 22%, rgba(255,0,128,0.42) 48%, rgba(0,220,255,0) 72%)",
              transform: `scale(${0.65 + flash * 0.7})`,
              opacity: flash,
            }}
          />
        </>
      )}
    </SceneFrame>
  );
};
