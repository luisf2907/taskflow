"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion/presets";

type RevealProps = HTMLMotionProps<"div"> & {
  /** Atraso extra antes do fade-up (s). */
  delay?: number;
  /** Anima ao entrar no viewport ao invés de no mount. */
  onView?: boolean;
};

/**
 * Reveal — container que faz fade+slide-up dos filhos.
 *
 * Uso:
 *   <Reveal>
 *     <h1>Título</h1>
 *   </Reveal>
 *
 * Para uma lista com stagger, use <RevealList> como pai e <Reveal> nos filhos.
 * Ou passe `onView` pra animar só quando entrar no viewport (seções de landing).
 */
export function Reveal({ children, delay = 0, onView = false, ...rest }: RevealProps) {
  const animProps = onView
    ? { initial: "hidden", whileInView: "visible", viewport: { once: true, amount: 0.3 } }
    : { initial: "hidden", animate: "visible" };

  return (
    <motion.div
      {...animProps}
      variants={fadeUp}
      transition={delay ? { delay } : undefined}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * RevealList — container que orquestra stagger nos filhos (que devem ser <Reveal>).
 */
export function RevealList({ children, onView = false, ...rest }: RevealProps) {
  const animProps = onView
    ? { initial: "hidden", whileInView: "visible", viewport: { once: true, amount: 0.2 } }
    : { initial: "hidden", animate: "visible" };

  return (
    <motion.div {...animProps} variants={staggerContainer} {...rest}>
      {children}
    </motion.div>
  );
}
