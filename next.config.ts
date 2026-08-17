import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NORA_NEXT_DIST_DIR ?? ".next",
  devIndicators: false,
  poweredByHeader: false,
};

export default nextConfig;
