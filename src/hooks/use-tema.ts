"use client";

import { useCallback, useEffect, useState } from "react";

type Tema = "claro" | "escuro";

export function useTema() {
  // Inicia com "claro" em SSR e no primeiro client render pra não dar
  // hydration mismatch. O useEffect abaixo sincroniza com a preferência
  // real (localStorage / prefers-color-scheme) logo após a hidratação.
  // O theme-init.js já aplicou a classe `dark` no <html> antes disso,
  // então não tem FOUC visual.
  const [tema, setTema] = useState<Tema>("claro");

  const aplicar = useCallback((t: Tema) => {
    const html = document.documentElement;
    if (t === "escuro") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, []);

  // set-state-in-effect intencional: hidratar o state a partir de
  // localStorage/matchMedia SEM causar mismatch com o HTML do servidor.
  useEffect(() => {
    const salvo = localStorage.getItem("tema") as Tema | null;
    const preferencia =
      salvo || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTema(preferencia);
    aplicar(preferencia);
  }, [aplicar]);

  function alternar() {
    const novo: Tema = tema === "claro" ? "escuro" : "claro";
    setTema(novo);
    aplicar(novo);
    localStorage.setItem("tema", novo);
  }

  return { tema, alternar };
}
