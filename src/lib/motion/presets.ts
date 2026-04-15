/**
 * Motion presets — springs, easings e variants reutilizáveis.
 *
 * Convenção:
 * - Springs discretos (damping alto) pra manter sensação "tech sóbrio"
 * - Durations curtas (140-280ms) na maioria dos casos
 * - Sempre usar via hooks/wrappers que respeitam prefers-reduced-motion
 */

import type { Transition, Variants } from "motion/react";

// ── SPRINGS ────────────────────────────────────────────

/** Spring rápido, pouco overshoot — padrão pra UI response (buttons, toggles). */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 32,
  mass: 0.9,
};

/** Spring suave — ideal pra modais, drawers, sidebars. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};

/** Spring com leve bounce — pra drag-drop de cards (sensação física). */
export const springBouncy: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 22,
  mass: 1,
};

// ── EASINGS ────────────────────────────────────────────

/** Curva "expo-out" — acelera cedo e desacelera longo, boa pra entrances. */
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

/** Curva Linear-style — balanceada, pro dia-a-dia. */
export const easeOutQuart = [0.32, 0.72, 0, 1] as const;

// ── DURATIONS ──────────────────────────────────────────

export const duration = {
  instant: 0.08,
  fast: 0.14,
  normal: 0.2,
  slow: 0.3,
  slower: 0.45,
} as const;

// ── VARIANTS ───────────────────────────────────────────

/** Fade + slide up — entrance padrão de items em listas, cards, seções. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easeOutExpo },
  },
};

/** Fade puro — pra overlays, backdrops. */
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.fast, ease: easeOutExpo },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast },
  },
};

/** Scale + fade — pra modais central (command palette, dialogs). */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: duration.fast },
  },
};

/** Slide da direita — pra drawers laterais (detalhe-cartao). */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springSoft,
  },
  exit: {
    opacity: 0,
    x: 32,
    transition: { duration: duration.normal, ease: easeOutQuart },
  },
};

/** Container com stagger — usar com fadeUp nos filhos. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

/** Stagger mais dramático pra hero/landing. */
export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.1,
    },
  },
};

/** Expand vertical — pra accordions, collapsibles. */
export const expandVertical: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: { duration: duration.normal, ease: easeOutQuart },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: duration.fast, ease: easeOutQuart },
  },
};

// ── LAYOUT TRANSITIONS ─────────────────────────────────

/** Spring pra props de layout (usado em <motion.div layout transition={layoutSpring}>). */
export const layoutSpring: Transition = springSnappy;
