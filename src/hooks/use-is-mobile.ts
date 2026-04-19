"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";
const TABLET_QUERY = "(max-width: 1023px)";

function subscribeTo(query: string) {
  return (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia(query);
    const handler = () => callback();
    if (mql.addEventListener) {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  };
}

function getSnapshotFor(query: string) {
  return () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };
}

function serverFalse() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribeTo(MOBILE_QUERY),
    getSnapshotFor(MOBILE_QUERY),
    serverFalse
  );
}

export function useIsTabletOrBelow() {
  return useSyncExternalStore(
    subscribeTo(TABLET_QUERY),
    getSnapshotFor(TABLET_QUERY),
    serverFalse
  );
}
