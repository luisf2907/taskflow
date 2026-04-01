"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "tf_sidebar_aberta";

// Leitura sincrona do localStorage — sem flash
function getSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  const salva = localStorage.getItem(STORAGE_KEY);
  return salva === null ? true : salva === "true";
}

function getServerSnapshot(): boolean {
  return true; // SSR default: sidebar aberta
}

function subscribe(callback: () => void) {
  // Escutar mudancas no localStorage (outras tabs)
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);

  // Escutar mudancas locais via evento custom
  window.addEventListener("tf-sidebar-change", callback);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("tf-sidebar-change", callback);
  };
}

export function useSidebar() {
  const aberta = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleSidebar = useCallback(() => {
    const next = !getSnapshot();
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event("tf-sidebar-change"));
  }, []);

  // Sempre iniciado — sem flash
  return { sidebarAberta: aberta, toggleSidebar, iniciado: true };
}
