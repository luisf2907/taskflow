"use client";

import { useEffect, useState } from "react";

export function useSidebar() {
  const [aberta, setAberta] = useState<boolean>(true);
  const [iniciado, setIniciado] = useState(false);

  useEffect(() => {
    const salva = localStorage.getItem("tf_sidebar_aberta");
    if (salva !== null) {
      setAberta(salva === "true");
    }
    setIniciado(true);
  }, []);

  const toggleSidebar = () => {
    setAberta((prev) => {
      const next = !prev;
      localStorage.setItem("tf_sidebar_aberta", String(next));
      return next;
    });
  };

  return { sidebarAberta: aberta, toggleSidebar, iniciado };
}
