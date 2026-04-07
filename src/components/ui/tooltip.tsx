"use client";

import { useState, useRef } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ content, children, position = "top", delay = 400 }: TooltipProps) {
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

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
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
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-[200] pointer-events-none whitespace-nowrap text-[11px] font-semibold px-2.5 py-1.5 rounded-[8px] ${positionClasses[position]}`}
          style={{
            background: "var(--tf-text)",
            color: "var(--tf-bg)",
            boxShadow: "var(--tf-shadow-md)",
            animation: "tooltipFadeIn 150ms ease-out forwards",
          }}
        >
          {content}
          <style>{`
            @keyframes tooltipFadeIn {
              from { opacity: 0; transform: translate(-50%, ${position === "top" ? "4px" : position === "bottom" ? "-4px" : "0"}); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </span>
      )}
    </span>
  );
}
