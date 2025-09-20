import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";
export const runtime = "edge";

export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #121217, #0D0D0F)",
          color: "#00F0FF",
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: -4,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        GH
      </div>
    ),
    size
  );
}

