"use client";

import React from "react";

interface StatCardProps {
  label: string;
  valor: string;
  sub: string;
  icone: React.ElementType;
  cor?: string;
}

export function StatCard({ label, valor, sub, icone: Icon, cor }: StatCardProps) {
  const iconColor = cor || "var(--tf-accent)";
  return (
    <div
      className="p-3.5"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-md)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 flex items-center justify-center"
          style={{
            background: "transparent",
            border: `1px solid ${iconColor}`,
            color: iconColor,
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Icon size={12} strokeWidth={1.75} />
        </div>
        <p
          className="label-mono"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          {label}
        </p>
      </div>
      <p
        className="text-[1.75rem] font-semibold leading-none"
        style={{
          color: "var(--tf-text)",
          fontFamily: "var(--tf-font-mono)",
          letterSpacing: "-0.02em",
        }}
      >
        {valor}
      </p>
      <p
        className="text-[0.6875rem] mt-2"
        style={{
          color: "var(--tf-text-tertiary)",
          fontFamily: "var(--tf-font-mono)",
          letterSpacing: "0.01em",
        }}
      >
        {sub}
      </p>
    </div>
  );
}
