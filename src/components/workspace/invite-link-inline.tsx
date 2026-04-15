"use client";

import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface InviteLinkInlineProps {
  workspaceId: string;
}

export function InviteLinkInline({ workspaceId }: InviteLinkInlineProps) {
  const [link, setLink] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function gerarLink() {
    setGerando(true);
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 12; i++)
      code += chars[Math.floor(Math.random() * chars.length)];

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setGerando(false);
      return;
    }

    const { error } = await supabase.from("invite_links").insert({
      code,
      workspace_id: workspaceId,
      criado_por: user.id,
    });

    if (!error) setLink(`${window.location.origin}/convite/${code}`);
    setGerando(false);
  }

  async function copiar() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div
      className="mb-4 pb-4"
      style={{ borderBottom: "1px solid var(--tf-border-subtle)" }}
    >
      <p
        className="text-[11px] font-semibold mb-2 flex items-center gap-1.5"
        style={{ color: "var(--tf-text-tertiary)" }}
      >
        <Link2 size={11} /> Ou compartilhe um link de convite
      </p>
      {link ? (
        <div className="flex gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 px-2.5 py-1.5 rounded-[6px] text-[11px] font-mono outline-none min-w-0"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text-secondary)",
            }}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copiar}
            className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold shrink-0"
            style={{
              background: copiado
                ? "var(--tf-success-bg)"
                : "var(--tf-accent)",
              color: copiado ? "var(--tf-success)" : "#fff",
            }}
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
      ) : (
        <button
          onClick={gerarLink}
          disabled={gerando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--tf-radius-xs)] text-[11px] font-semibold border transition-all"
          style={{
            borderColor: "var(--tf-border)",
            color: "var(--tf-text-secondary)",
          }}
        >
          {gerando ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Link2 size={12} />
          )}
          Gerar link (expira em 7 dias)
        </button>
      )}
    </div>
  );
}
