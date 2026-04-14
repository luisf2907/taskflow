"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function handleOffline() { setOffline(true); }
    function handleOnline() { setOffline(false); }

    // Check initial state — set-state-in-effect intencional pra sincronizar com
    // navigator.onLine no mount (não dá pra usar lazy initializer porque
    // navigator não existe durante SSR e precisamos reagir a eventos depois).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.onLine) setOffline(true);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-bold shadow-lg animate-in fade-in slide-in-from-top-2"
      style={{ background: "var(--tf-danger)", color: "white" }}
    >
      <WifiOff size={16} />
      Sem conexão — suas alterações serão salvas quando reconectar
    </div>
  );
}
