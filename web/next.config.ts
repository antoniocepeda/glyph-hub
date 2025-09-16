import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Use default project root so .env.local in web/ is picked up correctly
  outputFileTracingRoot: path.resolve(__dirname, ".."),
};

export default nextConfig;
