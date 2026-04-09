"use client";

import { supabase } from "@/lib/supabase/client";
import { Perfil } from "@/types";
import useSWR, { useSWRConfig } from "swr";

export function useAuth() {
  const { mutate: globalMutate } = useSWRConfig();

  const {
    data: user,
    isLoading: carregando,
    mutate,
  } = useSWR("auth-user", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  });

  // Perfil e temGithub dependem de user, mas rodam em PARALELO entre si
  const { data: perfilEGithub } = useSWR(
    user ? `auth-extras-${user.id}` : null,
    async () => {
      const [perfilRes, githubRes] = await Promise.all([
        // Fetch perfil — NAO inclui voice_embedding (dado biometrico,
        // fica server-side). Lista explicita evita shippar 2KB de
        // embedding pro browser em cada reload.
        supabase
          .from("perfis")
          .select(
            "id, nome, email, avatar_url, github_username, notif_preferences, onboarding_done, onboarding_step, criado_em, atualizado_em, voice_enrolled_at, voice_consent_at",
          )
          .eq("id", user!.id)
          .single()
          .then(({ data }) => data as Perfil | null),

        // Check GitHub connection
        (async () => {
          const identities = user?.identities ?? [];
          const hasOAuth = identities.some((i) => i.provider === "github");
          if (hasOAuth) return true;

          try {
            const res = await fetch("/api/github-token");
            if (!res.ok) return false;
            const data = await res.json();
            return data.connected === true;
          } catch {
            return false;
          }
        })(),
      ]);

      return { perfil: perfilRes, temGithub: githubRes };
    }
  );

  async function logout() {
    await supabase.auth.signOut();
    mutate(null);
    window.location.href = "/login";
  }

  const refresh = () => {
    mutate();
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("auth-extras-"),
      undefined,
      { revalidate: true },
    );
  };

  return {
    user,
    perfil: perfilEGithub?.perfil ?? null,
    carregando,
    temGithub: perfilEGithub?.temGithub ?? false,
    logout,
    refresh,
    refreshGithub: refresh,
  };
}
