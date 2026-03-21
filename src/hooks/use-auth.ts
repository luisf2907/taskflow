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

  const { data: temGithub } = useSWR(
    user ? `has-github-${user.id}` : null,
    async () => {
      const identities = user?.identities ?? [];
      return identities.some((i) => i.provider === "github");
    }
  );

  async function logout() {
    await supabase.auth.signOut();
    mutate(null);
    window.location.href = "/login";
  }

  return { user, perfil, carregando, temGithub: temGithub ?? false, logout, refresh: mutate };
}
