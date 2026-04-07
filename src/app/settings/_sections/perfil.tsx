"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import type { Perfil } from "@/types";

interface ProfileSectionProps {
  perfil: Perfil | null;
  userEmail?: string;
  onUpdate: () => void;
}

export function ProfileSection({ perfil, userEmail, onUpdate }: ProfileSectionProps) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(perfil?.nome || "");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (perfil?.nome) setNome(perfil.nome);
  }, [perfil?.nome]);

  const dirty = nome.trim() !== (perfil?.nome || "");

  async function handleSalvar() {
    if (!perfil || !dirty) return;
    setSalvando(true);
    const { supabase } = await import("@/lib/supabase/client");
    await supabase.from("perfis").update({ nome: nome.trim() }).eq("id", perfil.id);
    setSalvando(false);
    setEditando(false);
    onUpdate();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <User size={14} style={{ color: "var(--tf-accent)" }} />
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Perfil
        </h2>
      </div>

      <div
        className="rounded-[20px] p-6"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        <div className="flex items-start gap-5">
          {perfil?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={perfil.avatar_url}
              alt=""
              className="w-16 h-16 rounded-full shrink-0"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{
                background: "var(--tf-accent-light)",
                color: "var(--tf-accent)",
              }}
            >
              {(perfil?.nome ?? "?")[0].toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-3">
            {editando ? (
              <>
                <div>
                  <label
                    className="text-[11px] font-bold uppercase tracking-wide mb-1 block"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Nome
                  </label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3 py-2 rounded-[10px] text-[14px] font-medium outline-none"
                    style={{
                      background: "var(--tf-surface)",
                      border: "2px solid var(--tf-accent)",
                      color: "var(--tf-text)",
                    }}
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    className="text-[11px] font-bold uppercase tracking-wide mb-1 block"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Email
                  </label>
                  <p
                    className="text-[13px] px-3 py-2 rounded-[10px]"
                    style={{
                      background: "var(--tf-surface)",
                      color: "var(--tf-text-tertiary)",
                    }}
                  >
                    {userEmail}{" "}
                    <span className="text-[10px]">(nao editavel)</span>
                  </p>
                </div>
                {perfil?.github_username && (
                  <p
                    className="text-[12px]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    GitHub: @{perfil.github_username}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSalvar}
                    disabled={!dirty || salvando}
                    className="px-4 py-2 rounded-[10px] text-[12px] font-bold text-white disabled:opacity-40"
                    style={{ background: "var(--tf-accent)" }}
                  >
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={() => {
                      setEditando(false);
                      setNome(perfil?.nome || "");
                    }}
                    className="px-4 py-2 rounded-[10px] text-[12px] font-semibold"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p
                  className="text-lg font-bold truncate"
                  style={{ color: "var(--tf-text)" }}
                >
                  {perfil?.nome ?? "Sem nome"}
                </p>
                <p
                  className="text-[13px] truncate"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  {userEmail}
                </p>
                {perfil?.github_username && (
                  <p
                    className="text-[13px] font-medium"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    @{perfil.github_username}
                  </p>
                )}
                <button
                  onClick={() => setEditando(true)}
                  className="text-[12px] font-bold mt-1"
                  style={{ color: "var(--tf-accent)" }}
                >
                  Editar perfil
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
