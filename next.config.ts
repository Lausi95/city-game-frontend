import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for a small,
  // dependency-traced production image. See docs/adr/0018.
  output: "standalone",
};

export default nextConfig;
