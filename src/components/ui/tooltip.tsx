"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useRef } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ content, children, position = "top", delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }

  // Posicionamento via classes pra centralizar; animação interna via motion.
  const wrapperClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  };

  const enterOffset = {
    top: { y: 4 },
    bottom: { y: -4 },
    left: { x: 4 },
    right: { x: -4 },
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <span
            className={`absolute z-[200] pointer-events-none ${wrapperClasses[position]}`}
          >
            <motion.span
              role="tooltip"
              initial={{ opacity: 0, ...enterOffset[position] }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, ...enterOffset[position] }}
              transition={{ duration: 0.12, ease: [0.32, 0.72, 0, 1] }}
              className="block whitespace-nowrap"
              style={{
                background: "var(--tf-surface-raised)",
                color: "var(--tf-text)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
                padding: "4px 8px",
                fontSize: "0.6875rem",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
                fontWeight: 500,
                boxShadow: "var(--tf-shadow-md)",
              }}
            >
              {content}
            </motion.span>
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}
