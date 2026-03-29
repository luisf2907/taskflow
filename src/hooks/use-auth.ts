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

  const { data: perfil } = useSWR(
    user ? `perfil-${user.id}` : null,
    async () => {
      const { data } = await supabase
        .from("perfis")
        .select("*")
        .eq("id", user!.id)
        .single();
      return data as Perfil | null;
    }
  );

  const { data: temGithub, mutate: mutateGithub } = useSWR(
    user ? `has-github-${user.id}` : null,
    async () => {
      // Check OAuth identity
      const identities = user?.identities ?? [];
      const hasOAuth = identities.some((i) => i.provider === "github");
      if (hasOAuth) return true;

      // Check PAT via API
      try {
        const res = await fetch("/api/github-token");
        if (!res.ok) return false;
        const data = await res.json();
        return data.connected === true;
      } catch {
        return false;
      }
    }
  );

  async function logout() {
    await supabase.auth.signOut();
    mutate(null);
    window.location.href = "/login";
  }

  return {
    user,
    perfil,
    carregando,
    temGithub: temGithub ?? false,
    logout,
    refresh: mutate,
    refreshGithub: mutateGithub,
  };
}
