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
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <User size={12} strokeWidth={1.75} style={{ color: "var(--tf-accent)" }} />
        <h2 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
          Perfil
        </h2>
      </div>

      <div
        className="p-5"
        style={{
          background: "var(--tf-bg-secondary)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        <div className="flex items-start gap-4">
          {perfil?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={perfil.avatar_url}
              alt=""
              className="w-14 h-14 shrink-0"
              style={{ borderRadius: "var(--tf-radius-sm)" }}
            />
          ) : (
            <div
              className="w-14 h-14 flex items-center justify-center text-[1.125rem] font-semibold shrink-0"
              style={{
                background: "var(--tf-accent-light)",
                color: "var(--tf-accent-text)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-sm)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              {(perfil?.nome ?? "?")[0].toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2.5">
            {editando ? (
              <>
                <div>
                  <label
                    className="label-mono mb-1 block"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Nome
                  </label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="settings-input w-full h-9 px-3 text-[0.8125rem] outline-none"
                    style={{
                      color: "var(--tf-text)",
                      borderRadius: "var(--tf-radius-xs)",
                      letterSpacing: "-0.005em",
                    }}
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    className="label-mono mb-1 block"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Email
                  </label>
                  <p
                    className="text-[0.75rem] px-3 h-9 inline-flex items-center w-full"
                    style={{
                      background: "var(--tf-surface)",
                      color: "var(--tf-text-tertiary)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-xs)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    {userEmail}
                  </p>
                </div>
                {perfil?.github_username && (
                  <p
                    className="text-[0.6875rem]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    github · @{perfil.github_username}
                  </p>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={handleSalvar}
                    disabled={!dirty || salvando}
                    className="h-8 px-3 text-[0.75rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40"
                    style={{
                      background: "var(--tf-accent)",
                      border: "1px solid var(--tf-accent)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    {salvando ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    onClick={() => {
                      setEditando(false);
                      setNome(perfil?.nome || "");
                    }}
                    className="h-8 px-3 text-[0.75rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)]"
                    style={{
                      color: "var(--tf-text-secondary)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p
                  className="text-[1rem] font-semibold truncate"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
                >
                  {perfil?.nome ?? "Sem nome"}
                </p>
                <p
                  className="text-[0.75rem] truncate"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                  }}
                >
                  {userEmail}
                </p>
                {perfil?.github_username && (
                  <p
                    className="text-[0.75rem]"
                    style={{
                      color: "var(--tf-text-secondary)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    @{perfil.github_username}
                  </p>
                )}
                <button
                  onClick={() => setEditando(true)}
                  className="text-[0.6875rem] font-medium mt-1 transition-colors hover:brightness-110"
                  style={{
                    color: "var(--tf-accent)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Editar perfil
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-input {
          background: var(--tf-surface);
          border: 1px solid var(--tf-border);
          transition: border-color 0.15s ease;
        }
        .settings-input:focus {
          border-color: var(--tf-accent);
        }
      `}</style>
    </section>
  );
}
