"use client";

import { useEffect } from "react";

/**
 * Mapa de campos do theme_preferences -> CSS variables.
 */
const PALETTE_MAP: Record<string, string> = {
  accent: "--tf-accent",
  accentHover: "--tf-accent-hover",
  accentLight: "--tf-accent-light",
  accentText: "--tf-accent-text",
  bg: "--tf-bg",
  bgSecondary: "--tf-bg-secondary",
  surface: "--tf-surface",
  surfaceHover: "--tf-surface-hover",
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
  headerText: "--tf-header-text",
};

const LS_KEY = "tf_custom_palette";

/**
 * Aplica/remove overrides de CSS variables com base no theme_preferences do perfil.
 * Salva no localStorage para que theme-init.js aplique antes do React hidratar.
 */
export function useCustomPalette(
  themePreferences: Record<string, string> | null | undefined
) {
  useEffect(() => {
    const root = document.documentElement;

    if (!themePreferences || Object.keys(themePreferences).length === 0) {
      for (const cssVar of Object.values(PALETTE_MAP)) {
        root.style.removeProperty(cssVar);
      }
      localStorage.removeItem(LS_KEY);
      return;
    }

    for (const [field, cssVar] of Object.entries(PALETTE_MAP)) {
      const value = themePreferences[field];
      if (value) {
        root.style.setProperty(cssVar, value);
      } else {
        root.style.removeProperty(cssVar);
      }
    }

    localStorage.setItem(LS_KEY, JSON.stringify(themePreferences));
  }, [themePreferences]);
}
