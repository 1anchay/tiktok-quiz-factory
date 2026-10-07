/**
 * Procedurally synthesises royalty-free placeholder music and SFX into assets/.
 * Everything is generated from math — no third-party audio — so it is safe to commit and publish.
 *
 *   npm run assets:audio
 */
import fs from "node:fs";
import path from "node:path";
import { ASSETS_DIR } from "./lib/paths";

type Buffer32 = Float32Array;

const TAU = Math.PI * 2;

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function writeWav(file: string, data: Buffer32, sampleRate: number) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const out = Buffer.alloc(44 + data.length * 2);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + data.length * 2, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i] * gain));
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
  console.log(`  ✓ ${path.relative(ASSETS_DIR, file)}  (${(out.length / 1024).toFixed(0)} KB)`);
}

/** Chamberlin state-variable filter. Returns lowpass/bandpass/highpass per sample. */
function svf() {
  let low = 0;
  let band = 0;
  return (input: number, cutoff: number, sampleRate: number, q = 0.7) => {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff, sampleRate / 6)) / sampleRate);
    const damp = 1 / q;
    low += f * band;
    const high = input - low - damp * band;
    band += f * high;
    return { low, band, high };
  };
}

const noteHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const saw = (phase: number) => 2 * (phase - Math.floor(phase + 0.5));
const square = (phase: number, pw = 0.5) => (phase % 1 < pw ? 1 : -1);
const tri = (phase: number) => 1 - 4 * Math.abs((phase % 1) - 0.5);

/* ------------------------------------------------------------------ */
/* Music                                                               */
/* ------------------------------------------------------------------ */

interface TrackSpec {
  bpm: number;
  seconds: number;
  progression: number[][]; // chords as MIDI notes, one per bar
  seed: number;
  dark?: boolean;
  soft?: boolean;
}

function renderTrack(spec: TrackSpec, sr: number): Buffer32 {
  const n = Math.floor(spec.seconds * sr);
  const out = new Float32Array(n);
  const rng = makeRng(spec.seed);
  const beat = 60 / spec.bpm;
  const bar = beat * 4;
  const sixteenth = beat / 4;

  const bassFilter = svf();
  const padFilter = svf();
  const hatFilter = svf();
  const snareFilter = svf();
  const arpFilter = svf();

  let bassPhase = 0;
  let arpPhase = 0;
  const padPhases = [0, 0, 0, 0, 0, 0];

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const barIdx = Math.floor(t / bar);
    const chord = spec.progression[barIdx % spec.progression.length];
    const tInBeat = t % beat;
    const beatIdx = Math.floor(t / beat) % 4;
    const tIn16 = t % sixteenth;
    const idx16 = Math.floor(t / sixteenth);
    const introFade = Math.min(1, t / 0.6);
    const sidechain = 1 - 0.6 * Math.exp(-tInBeat * 9);

    let s = 0;

    // Kick: pitch-swept sine.
    {
      const kt = tInBeat;
      const freq = 45 + 120 * Math.exp(-kt * 28);
      const phase = (45 * kt + (120 / 28) * (1 - Math.exp(-kt * 28))) * TAU;
      s += Math.sin(phase) * Math.exp(-kt * (spec.dark ? 6 : 8)) * (spec.soft ? 0.52 : 0.95);
      if (kt < 0.004) s += 0.25 * (1 - kt / 0.004) * (freq > 0 ? 1 : 0);
    }

    // Snare / clap on 2 and 4.
    if (beatIdx === 1 || beatIdx === 3) {
      const st = tInBeat;
      const noise = rng() * 2 - 1;
      const f = snareFilter(noise, 2200, sr, 0.9);
      s += (f.band * 0.9 + noise * 0.15) * Math.exp(-st * 18) * (spec.soft ? 0.3 : 0.55);
      s += Math.sin(TAU * 190 * st) * Math.exp(-st * 30) * (spec.soft ? 0.12 : 0.25);
    }

    // Hats on off-beat 8ths, ghost 16ths.
    {
      const isOff = idx16 % 2 === 1;
      const noise = rng() * 2 - 1;
      const f = hatFilter(noise, 9000, sr, 0.6);
      const amp = isOff ? (spec.soft ? 0.11 : 0.22) : spec.soft ? 0.035 : 0.07;
      s += f.high * Math.exp(-tIn16 * (isOff ? 55 : 90)) * amp;
    }

    // Bass: root on 8ths, saw through lowpass, sidechained.
    {
      const root = chord[0] - 12;
      const hz = noteHz(root) * (spec.dark && idx16 % 4 === 3 ? Math.pow(2, 1 / 12) : 1);
      bassPhase += hz / sr;
      const eighthT = t % (beat / 2);
      const env = Math.exp(-eighthT * 6) * 0.8 + 0.2;
      const raw = saw(bassPhase) * 0.7 + square(bassPhase * 0.5) * 0.3;
      const f = bassFilter(raw, 380 + 900 * Math.exp(-eighthT * 10), sr, 1.1);
      let b = f.low * env * (spec.soft ? 0.36 : 0.55) * sidechain;
      if (spec.dark) b = Math.tanh(b * 2.2) * 0.45;
      s += b;
    }

    // Pad: detuned saws, filtered, sidechained.
    {
      let pad = 0;
      chord.forEach((note, k) => {
        for (let d = 0; d < 2; d++) {
          const idx = k * 2 + d;
          if (idx >= padPhases.length) return;
          padPhases[idx] += (noteHz(note) * (d ? 1.006 : 0.994)) / sr;
          pad += saw(padPhases[idx]);
        }
      });
      const f = padFilter(pad / 6, spec.dark ? 700 : 1500, sr, 0.7);
      s += f.low * (spec.soft ? 0.3 : 0.22) * sidechain;
    }

    // Arp: 16th notes up the chord, square wave pluck.
    {
      const arpNotes = [...chord, chord[0] + 12];
      const note = arpNotes[idx16 % arpNotes.length] + (spec.dark ? 0 : 12);
      arpPhase += noteHz(note) / sr;
      const env = Math.exp(-tIn16 * (spec.dark ? 14 : 22));
      const raw = spec.dark ? square(arpPhase, 0.3) : square(arpPhase, 0.25) * 0.6 + tri(arpPhase) * 0.4;
      const f = arpFilter(raw, 1800 + 2400 * env, sr, 0.9);
      s += f.low * env * (spec.dark ? 0.14 : spec.soft ? 0.1 : 0.17);
    }

    // Boss: low drone + periodic tom hits.
    if (spec.dark) {
      s += Math.sin(TAU * noteHz(chord[0] - 24) * t) * 0.18;
      if (idx16 % 8 === 6) s += Math.sin(TAU * (90 + 60 * Math.exp(-tIn16 * 20)) * tIn16) * Math.exp(-tIn16 * 10) * 0.4;
    }

    out[i] = s * introFade;
  }

  // Short tail fade so loops/cuts never click.
  const tail = Math.floor(sr * 0.5);
  for (let i = 0; i < tail; i++) out[n - 1 - i] *= i / tail;
  return out;
}

/* ------------------------------------------------------------------ */
/* SFX                                                                 */
/* ------------------------------------------------------------------ */

function sfx(seconds: number, sr: number, fn: (t: number, i: number) => number): Buffer32 {
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / sr, i);
  return out;
}

function buildSfx(sr: number) {
  const rng = makeRng(1337);
  const noise = () => rng() * 2 - 1;

  const whoosh = (() => {
    const f = svf();
    const dur = 0.5;
    return sfx(dur, sr, (t) => {
      const p = t / dur;
      const env = Math.sin(Math.PI * Math.pow(p, 0.7)) ** 2;
      const cutoff = 400 + 5000 * Math.sin(Math.PI * p);
      return f(noise(), cutoff, sr, 1.4).band * env;
    });
  })();

  const pop = sfx(0.2, sr, (t) => {
    const hz = 300 + 900 * Math.exp(-t * 40);
    const phase = TAU * (300 * t + (900 / 40) * (1 - Math.exp(-t * 40)));
    return Math.sin(phase) * Math.exp(-t * 22) + (t < 0.003 ? noise() * 0.3 : 0) + 0 * hz;
  });

  const tick = sfx(0.14, sr, (t) =>
    (Math.sin(TAU * 1650 * t) * 0.8 + Math.sin(TAU * 3300 * t) * 0.3) * Math.exp(-t * 45),
  );

  const tickFinal = sfx(0.35, sr, (t) =>
    (Math.sin(TAU * 1100 * t) * 0.8 + Math.sin(TAU * 2200 * t) * 0.35 + Math.sin(TAU * 550 * t) * 0.4) *
    Math.exp(-t * 12),
  );

  const reveal = (() => {
    const notes = [72, 76, 79, 84, 88];
    return sfx(1.2, sr, (t) => {
      let s = 0;
      notes.forEach((note, k) => {
        const start = k * 0.055;
        if (t < start) return;
        const lt = t - start;
        const hz = noteHz(note);
        s += (tri(hz * lt) * 0.6 + Math.sin(TAU * hz * 2 * lt) * 0.25) * Math.exp(-lt * 4.5) * 0.5;
      });
      s += noise() * 0.05 * Math.exp(-t * 6) * (Math.sin(TAU * 30 * t) > 0 ? 1 : 0.3);
      return s;
    });
  })();

  const bossImpact = (() => {
    const f = svf();
    return sfx(2.0, sr, (t) => {
      const sub = Math.sin(TAU * (28 * t + (60 / 3) * (1 - Math.exp(-t * 3)))) * Math.exp(-t * 1.6);
      const crack = f(noise(), 900 + 3000 * Math.exp(-t * 8), sr, 0.8).low * Math.exp(-t * 5) * 0.9;
      const dist = Math.tanh((sub + crack) * 3) * 0.8;
      const rumble = noise() * 0.06 * Math.exp(-t * 1.2);
      return dist + rumble;
    });
  })();

  const riser = (() => {
    const f = svf();
    let phase = 0;
    const dur = 1.3;
    return sfx(dur, sr, (t) => {
      const p = t / dur;
      phase += (180 + 1400 * p * p) / sr;
      const tone = saw(phase) * 0.25;
      const n = f(noise(), 600 + 7000 * p * p, sr, 2).band * 0.8;
      return (tone + n) * Math.pow(p, 1.6) * (p > 0.96 ? (1 - p) / 0.04 : 1);
    });
  })();

  const glitch = (() => {
    let held = 0;
    return sfx(0.35, sr, (t, i) => {
      if (i % 220 === 0) held = noise();
      return square(t * (200 + Math.abs(held) * 1600)) * held * 0.5 * Math.exp(-t * 6);
    });
  })();

  const ctaChime = sfx(1.4, sr, (t) => {
    const a = t;
    const b = t - 0.14;
    const bell = (lt: number, hz: number) =>
      lt < 0
        ? 0
        : (Math.sin(TAU * hz * lt) + Math.sin(TAU * hz * 2.76 * lt) * 0.3 + Math.sin(TAU * hz * 5.4 * lt) * 0.1) *
          Math.exp(-lt * 3.2);
    return bell(a, noteHz(79)) * 0.5 + bell(b, noteHz(84)) * 0.55;
  });

  return { whoosh, pop, tick, tickFinal, reveal, bossImpact, riser, glitch, ctaChime };
}

function main() {
  console.log("Synthesising placeholder audio into assets/ ...");
  const musicSr = 32000;
  const sfxSr = 44100;

  writeWav(
    path.join(ASSETS_DIR, "music", "arcade-drive.wav"),
    renderTrack(
      {
        bpm: 132,
        seconds: 40,
        seed: 7,
        progression: [
          [57, 60, 64], // Am
          [53, 57, 60], // F
          [48, 52, 55], // C
          [55, 59, 62], // G
        ],
      },
      musicSr,
    ),
    musicSr,
  );

  writeWav(
    path.join(ASSETS_DIR, "music", "shorts-chill.wav"),
    renderTrack(
      {
        bpm: 108,
        seconds: 48,
        seed: 21,
        soft: true,
        progression: [
          [57, 60, 64],
          [55, 59, 62],
          [53, 57, 60],
          [48, 52, 55],
        ],
      },
      musicSr,
    ),
    musicSr,
  );

  writeWav(
    path.join(ASSETS_DIR, "music", "boss-rumble.wav"),
    renderTrack(
      {
        bpm: 140,
        seconds: 14,
        seed: 13,
        dark: true,
        progression: [
          [50, 53, 57], // Dm
          [50, 53, 57],
          [51, 55, 58], // Eb
          [49, 53, 56], // C#dim-ish
        ],
      },
      musicSr,
    ),
    musicSr,
  );

  const s = buildSfx(sfxSr);
  const files: Record<string, Buffer32> = {
    "whoosh.wav": s.whoosh,
    "pop.wav": s.pop,
    "tick.wav": s.tick,
    "tick-final.wav": s.tickFinal,
    "reveal.wav": s.reveal,
    "boss-impact.wav": s.bossImpact,
    "riser.wav": s.riser,
    "glitch.wav": s.glitch,
    "cta-chime.wav": s.ctaChime,
  };
  for (const [name, data] of Object.entries(files)) {
    writeWav(path.join(ASSETS_DIR, "sounds", name), data, sfxSr);
  }
  console.log("Done.");
}

main();
