import { ImageResponse } from "next/og";

export const alt = "Taskflow — Gestão de tarefas para times que entregam";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#0A0A0B",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Top row — brand + meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "6px",
                background: "#FF6B35",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              T
            </div>
            <span
              style={{
                fontSize: "34px",
                fontWeight: 600,
                color: "#E8E8EA",
                letterSpacing: "-0.02em",
              }}
            >
              Taskflow
            </span>
          </div>

          {/* Meta label */}
          <span
            style={{
              fontSize: "15px",
              fontFamily: "ui-monospace, monospace",
              color: "#6B6B70",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            · Tech-futurista
          </span>
        </div>

        {/* Middle — main headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            position: "relative",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontFamily: "ui-monospace, monospace",
              color: "#FF6B35",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Para times de desenvolvimento
          </span>
          <h1
            style={{
              fontSize: "72px",
              fontWeight: 600,
              color: "#E8E8EA",
              letterSpacing: "-0.03em",
              lineHeight: 1.02,
              margin: 0,
              maxWidth: "900px",
            }}
          >
            Gerencie tarefas do jeito que seu time{" "}
            <span style={{ color: "#FF6B35" }}>realmente trabalha.</span>
          </h1>
        </div>

        {/* Bottom — features and CTA hint */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", gap: "10px" }}>
            {["Kanban", "Sprints", "GitHub"].map((feature) => (
              <div
                key={feature}
                style={{
                  padding: "6px 14px",
                  borderRadius: "2px",
                  border: "1px solid #2A2A2E",
                  background: "#111113",
                  color: "#A8A8AE",
                  fontSize: "14px",
                  fontFamily: "ui-monospace, monospace",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {feature}
              </div>
            ))}
          </div>

          <span
            style={{
              fontSize: "15px",
              fontFamily: "ui-monospace, monospace",
              color: "#6B6B70",
              letterSpacing: "0.04em",
            }}
          >
            taskflow.app
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
