"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

/**
 * Aplica variantes visuais especiais no <html> com base no email do usuário
 * logado. Por enquanto, só a variante "rounded" que deixa os cantos
 * arredondados (estética da v0 pré-redesign) — easter egg para contas
 * específicas que preferem esse visual.
 *
 * Se quiser adicionar outras variantes no futuro, é só expandir o mapa
 * VARIANTS_POR_EMAIL abaixo.
 */
const VARIANTS_POR_EMAIL: Record<string, string> = {
  "thalitarbullos@gmail.com": "variant-rounded",
};

const ALL_VARIANTS = Object.values(VARIANTS_POR_EMAIL);

export function UserVariantInjector() {
  const { user } = useAuth();

  useEffect(() => {
    const html = document.documentElement;
    // Remove todas as variantes primeiro
    for (const v of ALL_VARIANTS) html.classList.remove(v);

    if (user?.email) {
      const variant = VARIANTS_POR_EMAIL[user.email.toLowerCase()];
      if (variant) html.classList.add(variant);
    }
  }, [user?.email]);

  return null;
}
