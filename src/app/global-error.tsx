"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Algo deu errado</h2>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>Um erro inesperado ocorreu. Nossa equipe foi notificada.</p>
          <button
            onClick={reset}
            style={{ padding: "0.75rem 1.5rem", background: "#00857A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
