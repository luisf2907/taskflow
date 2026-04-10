export const TASKFLOW_PALETTE = [
  "#00857A", // Accent primary
  "#006D63", // Accent hover
  "#2E8B57", // Success
  "#8DA03B", // Warning
  "#D84D4D", // Danger
  "#4A6560", // Tertiary
  "#FBD051", // Yellow
  "#3B82F6", // Blue standard
  "#8B5CF6", // Purple
  "#EC4899", // Pink
];

/**
 * Retorna uma cor aleatória harmonizada com o design system do Taskflow.
 */
export function getRandomProjectColor(): string {
  const randomIndex = Math.floor(Math.random() * TASKFLOW_PALETTE.length);
  return TASKFLOW_PALETTE[randomIndex];
}

/**
 * Retorna "white" ou um tom escuro baseado na luminância relativa do fundo.
 * Garante contraste WCAG AA (4.5:1) em badges/tags.
 */
export function getContrastTextColor(hexBg: string): string {
  const hex = hexBg.replace("#", "");
  if (hex.length < 6) return "#fff";
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  // Relative luminance (WCAG formula)
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.36 ? "#1C2B29" : "#ffffff";
}
