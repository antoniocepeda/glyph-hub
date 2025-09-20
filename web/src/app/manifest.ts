import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GlyphHub",
    short_name: "GlyphHub",
    description: "Save, share, and remix AI prompts.",
    start_url: "/?utm_source=web_app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D0D0F",
    theme_color: "#0D0D0F",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "New Prompt",
        short_name: "New",
        url: "/new?utm_source=web_app_shortcut",
      },
      {
        name: "Collections",
        short_name: "Collections",
        url: "/collections?utm_source=web_app_shortcut",
      },
    ],
    prefer_related_applications: false,
  };
}
