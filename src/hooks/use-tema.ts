"use client";

import { useCallback, useEffect, useState } from "react";

type Tema = "claro" | "escuro";

export function useTema() {
  const [tema, setTema] = useState<Tema>("claro");

  useEffect(() => {
    const salvo = localStorage.getItem("tema") as Tema | null;
    const preferencia = salvo || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
    setTema(preferencia);
    aplicar(preferencia);
  }, []);

  const aplicar = useCallback((t: Tema) => {
    const html = document.documentElement;
    if (t === "escuro") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, []);

  function alternar() {
    const novo: Tema = tema === "claro" ? "escuro" : "claro";
    setTema(novo);
    aplicar(novo);
    localStorage.setItem("tema", novo);
  }

  return { tema, alternar };
}
