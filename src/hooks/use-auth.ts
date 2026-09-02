"use client";

import { supabase } from "@/lib/supabase/client";
import { usuarioAtual } from "@/lib/supabase/usuario";
import { Perfil } from "@/types";
import useSWR, { useSWRConfig } from "swr";

export function useAuth() {
  const { mutate: globalMutate } = useSWRConfig();

  const {
    data: user,
    isLoading: carregando,
    mutate,
  } = useSWR("auth-user", usuarioAtual);

  // Perfil — NAO inclui voice_embedding (dado biometrico, fica
  // server-side). Lista explicita evita shippar 2KB de embedding pro
  // browser em cada reload.
  const { data: perfil = null } = useSWR(
    user ? `perfil-${user.id}` : null,
    async () => {
      const { data } = await supabase
        .from("perfis")
        .select(
          "id, nome, email, avatar_url, github_username, notif_preferences, onboarding_done, onboarding_step, criado_em, atualizado_em, voice_enrolled_at, voice_consent_at, theme_preferences, plano, ultima_versao_vista",
        )
        .eq("id", user!.id)
        .single();
      return data as Perfil | null;
    },
  );

  async function logout() {
    await supabase.auth.signOut();
    mutate(null);
    window.location.href = "/login";
  }

  const refresh = () => {
    mutate();
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("perfil-"),
      undefined,
      { revalidate: true },
    );
  };

  return {
    user,
    perfil,
    carregando,
    logout,
    refresh,
    /**
     * Se a conta tem PRO. Enquanto o perfil nao carregou vem `false`, entao a
     * UI mostra o estado bloqueado por um instante em vez de piscar o recurso
     * liberado — quem manda de verdade e a checagem nas rotas /api/ai/*.
     */
    ehPro: perfil?.plano === "pro",
  };
}

/**
 * Se a conta tem GitHub conectado.
 *
 * Hook separado de proposito: isso vivia dentro do `useAuth`, que roda em
 * toda pagina (o Header usa), entao `/api/github-token` era chamado a cada
 * page load. Essa rota custa 4 hops de servidor — proxy `getUser()`,
 * rate-limit, `getUser()` de novo no handler e query no banco — e mediu
 * 739 ms num build de producao, a request mais lenta da pagina.
 *
 * O dado so e consumido em /settings. Aqui ele e buscado por quem pede.
 */
export function useTemGithub() {
  const { user } = useAuth();

  const { data: temGithub = false, mutate } = useSWR(
    user ? `github-conectado-${user.id}` : null,
    async () => {
      // `identities` vem do user da sessao (getSession). Se por algum
      // motivo vier vazio/desatualizado, o caminho abaixo cai no
      // /api/github-token, que da a resposta autoritativa — entao o
      // pior caso e uma request a mais, nunca um resultado errado.
      const identities = user?.identities ?? [];
      if (identities.some((i) => i.provider === "github")) return true;

      try {
        const res = await fetch("/api/github-token");
        if (!res.ok) return false;
        const data = await res.json();
        return data.connected === true;
      } catch {
        return false;
      }
    },
  );

  return { temGithub, refreshGithub: () => mutate() };
}
