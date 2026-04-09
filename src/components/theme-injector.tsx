"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCustomPalette } from "@/hooks/use-custom-palette";

/**
 * Client component que injeta CSS variables customizadas do perfil.
 * Renderiza null — so um side-effect no DOM.
 */
export function ThemeInjector() {
  const { perfil } = useAuth();
  useCustomPalette(perfil?.theme_preferences);
  return null;
}
