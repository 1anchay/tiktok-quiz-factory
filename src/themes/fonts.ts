import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadRubik } from "@remotion/google-fonts/Rubik";

const display = loadUnbounded("normal", {
  weights: ["700", "800", "900"],
  subsets: ["latin", "cyrillic"],
});

const body = loadRubik("normal", {
  weights: ["600", "800"],
  subsets: ["latin", "cyrillic"],
});

export const FONTS = {
  display: display.fontFamily,
  body: body.fontFamily,
};
