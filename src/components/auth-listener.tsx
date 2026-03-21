"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect } from "react";
import { mutate } from "swr";

export function AuthListener() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Revalidar cache de auth quando estado muda
      mutate("auth-user", session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
