export interface Theme {
  id: string;
  name: string;
  colors: {
    bgTop: string;
    bgBottom: string;
    grid: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textMuted: string;
    card: string;
    success: string;
  };
  boss: {
    bgTop: string;
    bgBottom: string;
    grid: string;
    primary: string;
    secondary: string;
    ember: string;
  };
  difficultyColors: Record<"easy" | "medium" | "hard" | "expert" | "boss", string>;
}

const neonArcade: Theme = {
  id: "neon-arcade",
  name: "Neon Arcade",
  colors: {
    bgTop: "#050816",
    bgBottom: "#1b0f4a",
    grid: "#22d3ee",
    primary: "#22d3ee",
    secondary: "#f43f9e",
    accent: "#facc15",
    text: "#ffffff",
    textMuted: "#a5b4fc",
    card: "#0d1330",
    success: "#4ade80",
  },
  boss: {
    bgTop: "#0a0103",
    bgBottom: "#3d0610",
    grid: "#ff1f3d",
    primary: "#ff1f3d",
    secondary: "#ff7a1a",
    ember: "#ffb020",
  },
  difficultyColors: {
    easy: "#4ade80",
    medium: "#22d3ee",
    hard: "#facc15",
    expert: "#f43f9e",
    boss: "#ff1f3d",
  },
};

const cyberSunset: Theme = {
  id: "cyber-sunset",
  name: "Cyber Sunset",
  colors: {
    bgTop: "#12021f",
    bgBottom: "#4a0d3a",
    grid: "#ff7ac6",
    primary: "#ff7ac6",
    secondary: "#ffb347",
    accent: "#7cf7ff",
    text: "#ffffff",
    textMuted: "#f5c2e7",
    card: "#1d0a2e",
    success: "#7cf7a0",
  },
  boss: neonArcade.boss,
  difficultyColors: neonArcade.difficultyColors,
};

export const THEMES: Record<string, Theme> = {
  [neonArcade.id]: neonArcade,
  [cyberSunset.id]: cyberSunset,
};

export function getTheme(id: string): Theme {
  return THEMES[id] ?? neonArcade;
}

export const DIFFICULTY_LABELS: Record<keyof Theme["difficultyColors"], string> = {
  easy: "ЛЕГКО",
  medium: "СРЕДНЕ",
  hard: "СЛОЖНО",
  expert: "ЭКСПЕРТ",
  boss: "BOSS",
};
