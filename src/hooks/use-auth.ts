"use client";

import { supabase } from "@/lib/supabase/client";
import { Perfil } from "@/types";
import useSWR from "swr";

export function useAuth() {
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
        // Fetch perfil
        supabase
          .from("perfis")
          .select("*")
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

  return {
    user,
    perfil: perfilEGithub?.perfil ?? null,
    carregando,
    temGithub: perfilEGithub?.temGithub ?? false,
    logout,
    refresh: mutate,
    refreshGithub: () => mutate(),
  };
}
