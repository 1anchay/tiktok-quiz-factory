import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, pop, pulse, SPRINGS } from "../animations";
import { AnswerBanner } from "../components/AnswerBanner";
import { CLUE_STAGGER, ClueGrid } from "../components/ClueGrid";
import { Countdown } from "../components/Countdown";
import { GlitchText } from "../components/GlitchText";
import { LevelHeader } from "../components/LevelHeader";
import { SceneFrame } from "../components/SceneFrame";
import { LAYOUT } from "../engine/layout";
import type { Segment } from "../engine/timeline";
import type { Episode } from "../schema/episode";
import type { Theme } from "../themes";
import { FONTS } from "../themes/fonts";
import { fitFontSize, glow, rgba } from "../utils/style";

interface Props {
  episode: Episode;
  theme: Theme;
  segment: Segment;
}

const COUNTDOWN_SIZE = 270;

export const BossScene: React.FC<Props> = ({ episode, theme, segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { boss } = episode;
  const red = theme.boss.primary;
  const ember = theme.boss.secondary;

  const introEnd = segment.cluesStart;
  const inIntro = frame < introEnd;
  const introShake = interpolate(frame, [0, introEnd], [26, 6], clamp);
  const lastSecond = frame >= segment.revealStart - fps && frame < segment.revealStart;
  const shakeIntensity = inIntro ? introShake : lastSecond ? 7 : frame >= segment.revealStart && frame < segment.revealStart + 10 ? 14 : 2;

  return (
    <SceneFrame duration={segment.duration} shakeIntensity={shakeIntensity}>
      {/* Pulsing red vignette — makes the whole boss scene feel dangerous */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 40%, ${rgba(red, 0.25 + pulse(frame, 24) * 0.25)} 100%)`,
        }}
      />

      {!inIntro && (
        <>
          <LevelHeader
            title={boss.title}
            question={boss.question ?? episode.question}
            chipLabel="ФИНАЛ"
            chipColor={red}
            glowColor={red}
            delay={introEnd}
          />
          <ClueGrid
            clues={boss.clues}
            cluesStart={segment.cluesStart + 2}
            stagger={CLUE_STAGGER - 1}
            dimAt={segment.revealStart}
            borderColor={red}
            glowColor={ember}
            boss
          />
          <div style={{ position: "absolute", left: (1080 - COUNTDOWN_SIZE) / 2, top: LAYOUT.gridCenterY - COUNTDOWN_SIZE / 2 }}>
            <Countdown start={segment.countdownStart} seconds={segment.countdownSeconds} size={COUNTDOWN_SIZE} colors={[ember, red, red]} />
          </div>
          {boss.revealAnswer ? (
            <AnswerBanner
              start={segment.revealStart}
              label="ОТВЕТ"
              text={boss.answer}
              background={red}
              textColor="#ffffff"
              burstColors={[red, ember, theme.boss.ember, "#ffffff"]}
            />
          ) : (
            <AnswerBanner
              start={segment.revealStart}
              label={boss.commentPrompt}
              text="???"
              background={red}
              textColor="#ffffff"
              burstColors={[red, ember, theme.boss.ember, "#ffffff"]}
            />
          )}
        </>
      )}

      {frame < introEnd + 10 && <BossIntro theme={theme} title={boss.title} subtitle={boss.subtitle} end={introEnd} fps={fps} />}
    </SceneFrame>
  );
};

const BossIntro: React.FC<{ theme: Theme; title: string; subtitle: string; end: number; fps: number }> = ({ theme, title, subtitle, end, fps }) => {
  const frame = useCurrentFrame();
  const red = theme.boss.primary;
  const slam = pop(frame, fps, 2, SPRINGS.heavy);
  const sub = pop(frame, fps, 10, SPRINGS.snappy);
  const flash = interpolate(frame, [0, 8], [1, 0], clamp);
  const out = interpolate(frame, [end - 4, end + 6], [1, 0], clamp);
  const stripeShift = (frame * 12) % 120;

  const stripe = (top: number, dir: 1 | -1, enterDelay: number) => {
    const enter = pop(frame, fps, enterDelay, SPRINGS.snappy);
    return (
      <div
        style={{
          position: "absolute",
          left: -100,
          right: -100,
          top,
          height: 110,
          transform: `translateX(${(1 - enter) * dir * 1400}px) rotate(${dir * -3}deg)`,
          backgroundImage: `repeating-linear-gradient(-45deg, ${theme.boss.ember} 0 50px, #0a0a0a 50px 100px)`,
          backgroundPosition: `${stripeShift * dir}px 0`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 60px ${rgba(red, 0.7)}`,
          borderTop: "6px solid #0a0a0a",
          borderBottom: "6px solid #0a0a0a",
        }}
      >
        <div
          style={{
            background: "#0a0a0a",
            padding: "8px 34px",
            fontFamily: FONTS.display,
            fontWeight: 900,
            fontSize: 48,
            letterSpacing: 10,
            color: theme.boss.ember,
          }}
        >
          WARNING
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill style={{ background: rgba("#000000", 0.55) }} />
      {stripe(330, 1, 0)}
      {stripe(1400, -1, 3)}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
        <div style={{ transform: `scale(${interpolate(slam, [0, 1], [3.2, 1])})`, textShadow: glow(red, 1.4) }}>
          <GlitchText text={title} fontFamily={FONTS.display} fontSize={fitFontSize(title, { maxWidth: 900, maxSize: 300, minSize: 120 })} intensity={1.2} />
        </div>
        <div
          style={{
            transform: `scale(${sub})`,
            padding: "16px 36px",
            background: red,
            fontFamily: FONTS.display,
            fontWeight: 900,
            fontSize: 50,
            color: "#fff",
            boxShadow: `0 10px 0 rgba(0,0,0,0.5), ${glow(red, 0.9)}`,
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: red, opacity: flash, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};
