import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NORA_NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
};

export default nextConfig;
