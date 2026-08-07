import type { Metadata } from "next";

// A pagina de ajuda e "use client" (tem busca e acordeao), e componente de
// cliente nao pode exportar `metadata`. Este layout existe so para dar a ela
// titulo e descricao proprios — sem ele a pagina herdava o "Taskflow"
// generico do layout raiz, era a unica publica sem metadata sua.
export const metadata: Metadata = {
  title: "Central de Ajuda",
  description:
    "Como usar o Taskflow: quadros kanban, sprints, planning poker, wiki, integração com GitHub e atalhos de teclado.",
  alternates: { canonical: "/help" },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
