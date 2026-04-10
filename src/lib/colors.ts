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
