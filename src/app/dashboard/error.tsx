"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function DashboardError({
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
        Não conseguimos carregar seu dashboard
      </h2>
      <p style={{ color: "var(--tf-text-secondary)", marginBottom: "1.5rem", maxWidth: "32rem" }}>
        Um erro inesperado ocorreu. Já registramos o problema — você pode tentar novamente ou voltar
        em instantes.
      </p>
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
    </div>
  );
}
