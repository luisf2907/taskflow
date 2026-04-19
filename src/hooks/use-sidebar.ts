"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "tf_sidebar_aberta";
const MOBILE_QUERY = "(max-width: 1023px)";

// Estado em memória para mobile (não persiste entre page loads)
let mobileDrawerAberta = false;

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  if (isMobile()) return mobileDrawerAberta;
  const salva = localStorage.getItem(STORAGE_KEY);
  return salva === null ? true : salva === "true";
}

function getServerSnapshot(): boolean {
  return true;
}

function subscribe(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("tf-sidebar-change", callback);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("tf-sidebar-change", callback);
  };
}

export function useSidebar() {
  const aberta = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleSidebar = useCallback(() => {
    if (isMobile()) {
      mobileDrawerAberta = !mobileDrawerAberta;
    } else {
      const atual = localStorage.getItem(STORAGE_KEY);
      const proximo = !(atual === null ? true : atual === "true");
      localStorage.setItem(STORAGE_KEY, String(proximo));
    }
    window.dispatchEvent(new Event("tf-sidebar-change"));
  }, []);

  return { sidebarAberta: aberta, toggleSidebar, iniciado: true };
}
