"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Erro ao carregar o workspace
      </h2>
      <p style={{ color: "var(--tf-text-secondary)", marginBottom: "1.5rem", maxWidth: "32rem" }}>
        Algo deu errado ao abrir este workspace. O erro já foi registrado.
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.6rem 1.25rem",
            background: "var(--tf-accent)",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Tentar novamente
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: "0.6rem 1.25rem",
            background: "var(--tf-surface)",
            color: "var(--tf-text)",
            border: "1px solid var(--tf-border)",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
