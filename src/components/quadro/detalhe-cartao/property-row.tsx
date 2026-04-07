"use client";

import React from "react";

interface PropertyRowProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  children?: React.ReactNode;
}

export function PropertyRow({
  icon,
  label,
  onClick,
  active,
  children,
}: PropertyRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-2.5 px-2 rounded-[8px] group hover:bg-[var(--tf-surface-hover)]"
      style={{ transition: "background 0.15s ease" }}
    >
      <div className="flex items-center gap-2.5">
        <span
          style={{
            color: active ? "var(--tf-accent)" : "var(--tf-text-tertiary)",
          }}
        >
          {icon}
        </span>
        <span
          className="text-[13px] font-medium"
          style={{
            color: active ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
          }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center">
        {children || (
          <span
            className="text-[11px] opacity-0 group-hover:opacity-100"
            style={{
              color: "var(--tf-text-tertiary)",
              transition: "opacity 0.15s ease",
            }}
          >
            Definir
          </span>
        )}
      </div>
    </button>
  );
}
