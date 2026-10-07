import { VIDEO } from "./timeline";

/**
 * TikTok safe zones for 1080×1920. The top strip holds the "Following / For You" tabs,
 * the bottom strip holds caption + music ticker, the right column holds like/comment/share.
 * Key text stays inside the safe rectangle; decorative elements may bleed out.
 */
export const SAFE = {
  top: 170,
  bottom: 400,
  left: 90,
  right: 130,
} as const;

export const LAYOUT = {
  progressTop: 180,
  headerTop: 300,
  questionTop: 448,
  gridTop: 570,
  gridWidth: 880,
  gridGap: 28,
  get cardSize() {
    return (this.gridWidth - this.gridGap) / 2;
  },
  get gridLeft() {
    return (VIDEO.width - this.gridWidth) / 2;
  },
  get gridCenterY() {
    return this.gridTop + this.gridWidth / 2;
  },
  contentWidth: VIDEO.width - SAFE.left * 2,
} as const;
