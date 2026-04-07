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
  return (
    <div
      className="rounded-[14px] border p-4"
      style={{
        background: "var(--tf-surface)",
        borderColor: "var(--tf-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-[8px] flex items-center justify-center"
          style={{
            background: cor ? `${cor}20` : "var(--tf-accent-light)",
          }}
        >
          <Icon size={14} style={{ color: cor || "var(--tf-accent)" }} />
        </div>
        <p
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--tf-text)" }}>
        {valor}
      </p>
      <p
        className="text-[12px] mt-0.5"
        style={{ color: "var(--tf-text-tertiary)" }}
      >
        {sub}
      </p>
    </div>
  );
}
