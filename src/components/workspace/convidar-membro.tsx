"use client";

import { useWorkspaceUsuarios } from "@/hooks/use-workspace-usuarios";
import {
  Check,
  Crown,
  Link2,
  Loader2,
  Mail,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

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
  const [confirmRemoverId, setConfirmRemoverId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (!aberto) return null;

  async function handleConvidar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErro("Digite um email válido.");
      return;
    }

    setCarregando(true);
    const result = await convidar(trimmed);
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
              maxLength={100}
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

        {/* Invite link */}
        <InviteLinkSection workspaceId={workspaceId} />

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
                  onClick={() => setConfirmRemoverId(u.id)}
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

      {/* Confirm remove member */}
      {confirmRemoverId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmRemoverId(null)}>
          <div className="p-5 rounded-[16px] max-w-sm w-full mx-4" style={{ background: "var(--tf-surface)" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[14px] font-bold mb-2" style={{ color: "var(--tf-text)" }}>Remover membro</h3>
            <p className="text-[13px] mb-4" style={{ color: "var(--tf-text-secondary)" }}>
              Tem certeza que deseja remover este membro do workspace?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmRemoverId(null)}
                className="px-4 py-2 text-[12px] font-medium rounded-[10px]"
                style={{ color: "var(--tf-text-secondary)", background: "var(--tf-bg-secondary)" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { remover(confirmRemoverId); setConfirmRemoverId(null); }}
                className="px-4 py-2 text-[12px] font-bold text-white rounded-[10px]"
                style={{ background: "var(--tf-danger)" }}
              >
                Sim, remover
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================
// INVITE LINK SECTION
// =============================================

function generateCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function InviteLinkSection({ workspaceId }: { workspaceId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function gerarLink() {
    setGerando(true);
    const code = generateCode();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGerando(false); return; }

    const { error } = await supabase
      .from("invite_links")
      .insert({
        code,
        workspace_id: workspaceId,
        criado_por: user.id,
      });

    if (!error) {
      const url = `${window.location.origin}/convite/${code}`;
      setLink(url);
    }
    setGerando(false);
  }

  async function copiar() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--tf-border)" }}>
      <p className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--tf-text-tertiary)" }}>
        <Link2 size={11} /> Link de convite
      </p>
      {link ? (
        <div className="flex gap-1.5">
          <input
            readOnly
            value={link}
            className="flex-1 px-2 py-1.5 rounded-[6px] text-[10px] font-mono outline-none min-w-0"
            style={{ background: "var(--tf-bg)", border: "1px solid var(--tf-border)", color: "var(--tf-text-secondary)" }}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copiar}
            className="px-2 py-1.5 rounded-[6px] text-[10px] font-semibold shrink-0"
            style={{ background: copiado ? "var(--tf-success-bg)" : "var(--tf-accent)", color: copiado ? "var(--tf-success)" : "#fff" }}
          >
            {copiado ? <Check size={12} /> : "Copiar"}
          </button>
        </div>
      ) : (
        <button
          onClick={gerarLink}
          disabled={gerando}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] text-[11px] font-semibold border transition-all"
          style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-secondary)" }}
        >
          {gerando ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
          Gerar link de convite
        </button>
      )}
      <p className="text-[9px] mt-1.5" style={{ color: "var(--tf-text-tertiary)" }}>
        Expira em 7 dias. Qualquer pessoa com o link pode entrar.
      </p>
    </div>
  );
}
