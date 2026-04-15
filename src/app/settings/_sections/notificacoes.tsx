"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import type { NotifPreferences } from "@/types";

const DEFAULT_PREFS: NotifPreferences = {
  email_convite: true,
  email_card_atribuido: true,
  email_digest_semanal: false,
  inapp_todas: true,
};

const NOTIF_OPTIONS: {
  key: keyof NotifPreferences;
  label: string;
  desc: string;
}[] = [
  {
    key: "email_convite",
    label: "Convite de workspace",
    desc: "Receber email ao ser convidado para um workspace",
  },
  {
    key: "email_card_atribuido",
    label: "Card atribuido",
    desc: "Receber email quando um card for atribuido a voce",
  },
  {
    key: "email_digest_semanal",
    label: "Resumo semanal",
    desc: "Receber um resumo por email toda semana",
  },
  {
    key: "inapp_todas",
    label: "Notificacoes in-app",
    desc: "Mostrar notificacoes dentro da plataforma",
  },
];

interface NotifSectionProps {
  userId?: string;
  perfilPrefs?: NotifPreferences | null;
}

export function NotifSection({ userId, perfilPrefs }: NotifSectionProps) {
  const [prefs, setPrefs] = useState<NotifPreferences>(
    perfilPrefs || DEFAULT_PREFS
  );

  useEffect(() => {
    if (perfilPrefs) setPrefs(perfilPrefs);
  }, [perfilPrefs]);

  async function togglePref(key: keyof NotifPreferences) {
    if (!userId) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated); // Optimistic

    const { supabase } = await import("@/lib/supabase/client");
    const { error } = await supabase
      .from("perfis")
      .update({ notif_preferences: updated })
      .eq("id", userId);

    if (error) setPrefs(prefs); // Rollback
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell size={14} style={{ color: "var(--tf-accent)" }} />
        <h2
          className="label-mono"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Notificacoes
        </h2>
      </div>

      <div
        className="rounded-[var(--tf-radius-md)] p-6 space-y-1"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        {NOTIF_OPTIONS.map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between py-3"
            style={{ borderBottom: "1px solid var(--tf-border-subtle)" }}
          >
            <div>
              <p
                className="text-[13px] font-semibold"
                style={{ color: "var(--tf-text)" }}
              >
                {label}
              </p>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                {desc}
              </p>
            </div>
            <button
              onClick={() => togglePref(key)}
              className="relative w-[40px] h-[24px] rounded-full transition-colors duration-200 shrink-0"
              style={{
                background: prefs[key] ? "var(--tf-accent)" : "var(--tf-border)",
              }}
              aria-label={`${label}: ${prefs[key] ? "ativado" : "desativado"}`}
            >
              <span
                className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform duration-200"
                style={{ left: prefs[key] ? "19px" : "3px" }}
              />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
