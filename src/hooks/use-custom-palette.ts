"use client";

import { useEffect } from "react";

/**
 * Mapa de campos do theme_preferences → CSS variables.
 * Campos ausentes no JSON usam o default do globals.css.
 */
const PALETTE_MAP: Record<string, string> = {
  accent: "--tf-accent",
  accentHover: "--tf-accent-hover",
  accentLight: "--tf-accent-light",
  accentText: "--tf-accent-text",
  accentYellow: "--tf-accent-yellow",
  bg: "--tf-bg",
  bgSecondary: "--tf-bg-secondary",
  surface: "--tf-surface",
  text: "--tf-text",
  textSecondary: "--tf-text-secondary",
  textTertiary: "--tf-text-tertiary",
  border: "--tf-border",
  borderSubtle: "--tf-border-subtle",
  success: "--tf-success",
  successBg: "--tf-success-bg",
  danger: "--tf-danger",
  dangerBg: "--tf-danger-bg",
  warning: "--tf-warning",
  warningBg: "--tf-warning-bg",
  column: "--tf-column",
  header: "--tf-header",
};

const LS_KEY = "tf_custom_palette";

/**
 * Aplica/remove overrides de CSS variables com base no theme_preferences do perfil.
 * Salva no localStorage pra que theme-init.js aplique antes do React hidratar.
 */
export function useCustomPalette(
  themePreferences: Record<string, string> | null | undefined
) {
  useEffect(() => {
    const root = document.documentElement;

    if (!themePreferences || Object.keys(themePreferences).length === 0) {
      // Limpar overrides
      for (const cssVar of Object.values(PALETTE_MAP)) {
        root.style.removeProperty(cssVar);
      }
      localStorage.removeItem(LS_KEY);
      return;
    }

    // Aplicar overrides
    for (const [field, cssVar] of Object.entries(PALETTE_MAP)) {
      const value = themePreferences[field];
      if (value) {
        root.style.setProperty(cssVar, value);
      } else {
        root.style.removeProperty(cssVar);
      }
    }

    // Salvar no localStorage pra theme-init.js
    localStorage.setItem(LS_KEY, JSON.stringify(themePreferences));
  }, [themePreferences]);
}

/** Exporta o mapa pra uso no theme-init.js e na UI de settings. */
export { PALETTE_MAP };
