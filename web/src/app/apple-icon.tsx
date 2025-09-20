import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const runtime = "edge";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0D0D0F",
          color: "#F5F7FA",
          fontSize: 100,
          fontWeight: 900,
          letterSpacing: -5,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        GH
      </div>
    ),
    size
  );
}

