"use client";

import { useSyncExternalStore, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

// Module-level state (survives re-renders, shared across components)
let toasts: Toast[] = [];
let listeners: Set<() => void> = new Set();

function emit() {
  listeners.forEach((l) => l());
}

function addToast(type: ToastType, message: string) {
  const id = Math.random().toString(36).slice(2, 9);
  toasts = [...toasts, { id, type, message, createdAt: Date.now() }];
  // Max 3 visible
  if (toasts.length > 3) toasts = toasts.slice(-3);
  emit();

  // Auto-dismiss after 4s
  setTimeout(() => {
    removeToast(id);
  }, 4000);
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

// Public API
export const toast = {
  success: (message: string) => addToast("success", message),
  error: (message: string) => addToast("error", message),
  info: (message: string) => addToast("info", message),
};

// Hook
export function useToast() {
  const currentToasts = useSyncExternalStore(
    useCallback((cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }, []),
    () => toasts,
    () => [] // SSR
  );

  return { toasts: currentToasts, remove: removeToast };
}
