"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect } from "react";
import { mutate } from "swr";

export function AuthListener() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Revalidar cache de auth quando estado muda
      mutate("auth-user", session?.user ?? null);

      // Token expirado ou sessao removida — redireciona pro login
      if (event === "TOKEN_REFRESHED" && !session) {
        window.location.href = "/login";
      }
      if (event === "SIGNED_OUT") {
        window.location.href = "/login";
      }
    });

    // Verificar periodicamente se a sessao ainda e valida
    const interval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        window.location.href = "/login";
      }
    }, 5 * 60 * 1000); // Verificar a cada 5 minutos

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return null;
}
