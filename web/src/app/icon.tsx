import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export const runtime = "edge";

export default function Icon() {
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
          color: "#00F0FF",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: -0.5,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        GH
      </div>
    ),
    size
  );
}

