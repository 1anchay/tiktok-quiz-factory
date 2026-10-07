/** Default sound pack. Paths are relative to assets/. Swap files here to re-skin the whole factory. */
export const SOUND_PACK = {
  whoosh: "sounds/whoosh.wav",
  pop: "sounds/pop.wav",
  tick: "sounds/tick.wav",
  tickFinal: "sounds/tick-final.wav",
  reveal: "sounds/reveal.wav",
  bossImpact: "sounds/boss-impact.wav",
  riser: "sounds/riser.wav",
  glitch: "sounds/glitch.wav",
  ctaChime: "sounds/cta-chime.wav",
} as const;

export type SoundName = keyof typeof SOUND_PACK;
