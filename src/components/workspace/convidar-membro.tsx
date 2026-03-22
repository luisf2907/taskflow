"use client";

import { useWorkspaceUsuarios } from "@/hooks/use-workspace-usuarios";
import {
  Crown,
  Loader2,
  Mail,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

interface ConvidarMembroProps {
  workspaceId: string;
  aberto: boolean;
  onFechar: () => void;
}

export function ConvidarMembro({
  workspaceId,
  aberto,
  onFechar,
}: ConvidarMembroProps) {
  const { usuarios, convidar, remover, alterarPapel } =
    useWorkspaceUsuarios(workspaceId);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  if (!aberto) return null;

  async function handleConvidar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const result = await convidar(email.trim());
    if (result.error) {
      setErro(result.error);
    } else {
      setEmail("");
    }
    setCarregando(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onFechar} />
      <div
        className="fixed right-4 top-16 w-80 max-h-[70vh] rounded-[14px] z-50 overflow-hidden flex flex-col"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--tf-border)" }}
        >
          <div className="flex items-center gap-2">
            <Users size={15} style={{ color: "var(--tf-accent)" }} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--tf-text)" }}
            >
              Equipe
            </span>
          </div>
          <button
            onClick={onFechar}
            className="p-1 rounded-[8px] transition-smooth"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Invite form */}
        <form
          onSubmit={handleConvidar}
          className="p-3 shrink-0"
          style={{ borderBottom: "1px solid var(--tf-border)" }}
        >
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email do membro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-3 py-2 rounded-[8px] text-xs outline-none transition-smooth"
              style={{
                background: "var(--tf-bg)",
                border: "1px solid var(--tf-border)",
                color: "var(--tf-text)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--tf-accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--tf-border)")
              }
            />
            <button
              type="submit"
              disabled={carregando}
              className="px-3 py-2 rounded-[8px] text-xs font-medium text-white transition-smooth"
              style={{ background: "var(--tf-accent)" }}
            >
              {carregando ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <UserPlus size={13} />
              )}
            </button>
          </div>
          {erro && (
            <p
              className="text-[11px] mt-1.5 px-1"
              style={{ color: "var(--tf-danger)" }}
            >
              {erro}
            </p>
          )}
        </form>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto p-2">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-2.5 px-2 py-2 rounded-[8px] transition-smooth"
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--tf-surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {u.perfis?.avatar_url ? (
                <img
                  src={u.perfis.avatar_url}
                  alt=""
                  className="w-7 h-7 rounded-full shrink-0"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{
                    background: "var(--tf-accent-light)",
                    color: "var(--tf-accent)",
                  }}
                >
                  {(u.perfis?.nome ?? "?")[0].toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--tf-text)" }}
                >
                  {u.perfis?.nome ?? "Sem nome"}
                </p>
                <p
                  className="text-[10px] truncate flex items-center gap-1"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  <Mail size={9} />
                  {u.perfis?.email}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {u.papel === "admin" && (
                  <span title="Admin">
                    <Crown
                      size={12}
                      style={{ color: "var(--tf-warning)" }}
                    />
                  </span>
                )}
                <button
                  onClick={() =>
                    alterarPapel(
                      u.id,
                      u.papel === "admin" ? "membro" : "admin"
                    )
                  }
                  className="p-1 rounded text-[10px] transition-smooth"
                  style={{ color: "var(--tf-text-tertiary)" }}
                  title={
                    u.papel === "admin" ? "Tornar membro" : "Tornar admin"
                  }
                >
                  {u.papel === "admin" ? "Admin" : "Membro"}
                </button>
                <button
                  onClick={() => remover(u.id)}
                  className="p-1 rounded transition-smooth"
                  style={{ color: "var(--tf-text-tertiary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--tf-danger)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--tf-text-tertiary)")
                  }
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
