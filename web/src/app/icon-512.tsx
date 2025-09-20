import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export const runtime = "edge";

export default function Icon512() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(60% 60% at 50% 40%, #15161B 0%, #0D0D0F 100%)",
          color: "#A259FF",
          fontSize: 240,
          fontWeight: 900,
          letterSpacing: -12,
          fontFamily: "Inter, system-ui, sans-serif",
          textShadow: "0 12px 48px rgba(0,0,0,.45)",
        }}
      >
        GH
      </div>
    ),
    size
  );
}

