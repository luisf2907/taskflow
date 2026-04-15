import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: "36px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "64px",
              background: "#FFFFFF",
              borderRadius: "4px",
            }}
          />
          <div
            style={{
              width: "22px",
              height: "96px",
              background: "#FFFFFF",
              borderRadius: "4px",
            }}
          />
          <div
            style={{
              width: "22px",
              height: "42px",
              background: "#FFFFFF",
              borderRadius: "4px",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
