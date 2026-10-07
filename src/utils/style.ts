/**
 * Heuristic responsive font sizing. Unbounded is a wide display face, so the
 * average glyph width ratio is high. Keeps long answers/titles inside their box.
 */
export function fitFontSize(
  text: string,
  { maxWidth, maxSize, minSize = 28, ratio = 0.8, maxLines = 1 }: {
    maxWidth: number;
    maxSize: number;
    minSize?: number;
    ratio?: number;
    maxLines?: number;
  },
) {
  const words = text.trim().split(/\s+/);
  const longestWord = Math.max(...words.map((w) => w.length));
  const perLine = Math.max(longestWord, Math.ceil(text.length / maxLines));
  const size = maxWidth / (perLine * ratio);
  return Math.round(Math.max(minSize, Math.min(maxSize, size)));
}

export function rgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function glow(color: string, strength = 1) {
  return [
    `0 0 ${12 * strength}px ${rgba(color, 0.9)}`,
    `0 0 ${32 * strength}px ${rgba(color, 0.6)}`,
    `0 0 ${72 * strength}px ${rgba(color, 0.35)}`,
  ].join(", ");
}

/** Hard drop shadow + glow — the "sticker" look common in gaming TikToks. */
export function punchyTextShadow(color: string, depth = 8) {
  return [`0 ${depth}px 0 rgba(0,0,0,0.55)`, `0 0 28px ${rgba(color, 0.65)}`, `0 0 64px ${rgba(color, 0.35)}`].join(", ");
}
