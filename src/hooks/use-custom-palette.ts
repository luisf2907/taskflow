"use client";

import { useEffect, useState } from "react";

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
 * Detecta se o tema e dark mode.
 * Formato do theme_preferences:
 *   { "light": { accent: ..., bg: ... }, "dark": { accent: ..., bg: ... } }
 *
 * Aplica o sub-objeto correto conforme o modo atual. Observa mudancas de
 * classe .dark no <html> via MutationObserver pra reagir ao toggle.
 */
export function useCustomPalette(
  themePreferences: Record<string, unknown> | null | undefined
) {
  const [isDark, setIsDark] = useState(false);

  // Observar mudancas de classe dark no <html>
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (!themePreferences) {
      for (const cssVar of Object.values(PALETTE_MAP)) {
        root.style.removeProperty(cssVar);
      }
      localStorage.removeItem(LS_KEY);
      return;
    }

    // Detectar formato: { light: {...}, dark: {...} } ou plano { accent: ... }
    const hasLightDark =
      themePreferences.light &&
      typeof themePreferences.light === "object";

    const palette = hasLightDark
      ? ((isDark ? themePreferences.dark : themePreferences.light) as Record<
          string,
          string
        >) || {}
      : (themePreferences as Record<string, string>);

    if (!palette || Object.keys(palette).length === 0) {
      for (const cssVar of Object.values(PALETTE_MAP)) {
        root.style.removeProperty(cssVar);
      }
      localStorage.removeItem(LS_KEY);
      return;
    }

    for (const [field, cssVar] of Object.entries(PALETTE_MAP)) {
      const value = palette[field];
      if (value) {
        root.style.setProperty(cssVar, value);
      } else {
        root.style.removeProperty(cssVar);
      }
    }

    // Salvar no localStorage (o theme-init.js aplica antes do React)
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ ...themePreferences, _mode: isDark ? "dark" : "light" })
    );
  }, [themePreferences, isDark]);
}
