"use client";

import { useReducedMotion as useReducedMotionBase } from "motion/react";

/**
 * Re-export do hook do motion com fallback SSR-safe.
 *
 * Retorna `true` se o usuário prefere movimento reduzido (OS setting),
 * `false` caso contrário. No SSR/primeira render retorna `null`,
 * então tratamos como `false` pra não bloquear animações inicialmente.
 */
export function usePrefersReducedMotion(): boolean {
  const prefers = useReducedMotionBase();
  return prefers === true;
}
