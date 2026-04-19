"use client";

import { useSyncExternalStore } from "react";

export type ToastType = "success" | "error" | "info" | "done";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

// Module-level state (survives re-renders, shared across components)
let toasts: Toast[] = [];
const listeners: Set<() => void> = new Set();
const EMPTY: Toast[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot() {
  return EMPTY;
}

function addToast(type: ToastType, message: string) {
  const id = Math.random().toString(36).slice(2, 9);
  toasts = [...toasts, { id, type, message, createdAt: Date.now() }];
  if (toasts.length > 3) toasts = toasts.slice(-3);
  emit();

  const duration = type === "error" ? 6000 : type === "done" ? 3500 : 4000;
  setTimeout(() => {
    removeToast(id);
  }, duration);
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
  /** Usado em momentos de celebracao (card movido pra Concluido, sprint fechada). */
  done: (message: string) => addToast("done", message),
};

// Hook
export function useToast() {
  const currentToasts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { toasts: currentToasts, remove: removeToast };
}
