"use client";

import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Perfil } from "@/types";

interface FotoGithubBannerProps {
  user: User | null | undefined;
  temGithub: boolean;
  perfil: Perfil | null;
  onUpdate: () => void;
}

/**
 * Banner que sugere usar a foto do GitHub como avatar, caso o usuario
 * tenha conectado GitHub mas ainda nao tenha avatar_url no perfil.
 */
export function FotoGithubBanner({
  user,
  temGithub,
  perfil,
  onUpdate,
}: FotoGithubBannerProps) {
  const [fotoGithub, setFotoGithub] = useState<string | null>(null);
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  // Detectar foto do GitHub após conexão
  useEffect(() => {
    if (!user || !temGithub || perfil?.avatar_url) return;
    const githubIdentity = user.identities?.find((i) => i.provider === "github");
    const avatarUrl = githubIdentity?.identity_data?.avatar_url as
      | string
      | undefined;
    if (avatarUrl) setFotoGithub(avatarUrl);
  }, [user, temGithub, perfil]);

  async function usarFotoGithub() {
    if (!user || !fotoGithub) return;
    setSalvandoFoto(true);
    const { error } = await supabase
      .from("perfis")
      .update({ avatar_url: fotoGithub })
      .eq("id", user.id);
    if (error) {
      toast.error("Não foi possível atualizar a foto.");
    } else {
      toast.success("Foto de perfil atualizada!");
      onUpdate();
    }
    setSalvandoFoto(false);
    setFotoGithub(null);
  }

  if (!fotoGithub) return null;

  return (
    <section>
      <div
        className="rounded-[20px] p-6 flex items-center gap-5"
        style={{
          background: "var(--tf-accent-light)",
          border: "1px solid var(--tf-accent)",
        }}
      >
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoGithub}
            alt="Foto do GitHub"
            className="w-14 h-14 rounded-full object-cover"
            style={{ border: "2px solid var(--tf-accent)" }}
          />
          <div
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "var(--tf-accent)" }}
          >
            <Camera size={11} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-bold"
            style={{ color: "var(--tf-accent-text)" }}
          >
            Usar foto do GitHub?
          </p>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Encontramos sua foto de perfil do GitHub.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={usarFotoGithub}
            disabled={salvandoFoto}
            className="px-4 py-2 rounded-[14px] text-[12px] font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--tf-accent)" }}
          >
            {salvandoFoto ? "Salvando..." : "Usar"}
          </button>
          <button
            onClick={() => setFotoGithub(null)}
            className="p-1.5 rounded-[8px] hover:bg-[var(--tf-surface-hover)]"
            style={{
              color: "var(--tf-text-tertiary)",
              transition: "background 0.15s ease",
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
