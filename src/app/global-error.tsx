"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="pt-BR">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "1.5rem",
            textAlign: "center",
            fontFamily: "var(--tf-font-display, system-ui)",
            background: "#0A0A0B",
            color: "#E8E8EA",
          }}
        >
          <span
            style={{
              fontSize: "0.6875rem",
              fontFamily: "var(--tf-font-mono, ui-monospace, monospace)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6B6B70",
              marginBottom: "0.5rem",
            }}
          >
            Erro crítico
          </span>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            Algo deu errado
          </h2>
          <p
            style={{
              color: "#A8A8AE",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
              maxWidth: "28rem",
              letterSpacing: "-0.005em",
            }}
          >
            Um erro inesperado ocorreu. Nossa equipe foi notificada.
          </p>
          {error.digest && (
            <code
              style={{
                display: "inline-block",
                fontSize: "0.6875rem",
                fontFamily: "var(--tf-font-mono, ui-monospace, monospace)",
                background: "#18181B",
                color: "#6B6B70",
                padding: "0.25rem 0.5rem",
                border: "1px solid #2A2A2E",
                borderRadius: "2px",
                marginBottom: "1.5rem",
                letterSpacing: "0.02em",
              }}
            >
              {error.digest}
            </code>
          )}
          <button
            onClick={reset}
            style={{
              height: "2.25rem",
              padding: "0 0.875rem",
              background: "#FF6B35",
              color: "#FFFFFF",
              border: "1px solid #FF6B35",
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 500,
              letterSpacing: "-0.005em",
              fontFamily: "inherit",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
