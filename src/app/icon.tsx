import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FF6B35",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
        }}
      >
        {/* 3 colunas kanban em branco */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "4px",
              height: "12px",
              background: "#FFFFFF",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              width: "4px",
              height: "18px",
              background: "#FFFFFF",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              width: "4px",
              height: "8px",
              background: "#FFFFFF",
              borderRadius: "1px",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
