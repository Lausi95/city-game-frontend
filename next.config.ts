import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) for a small,
  // dependency-traced production image. See docs/adr/0018.
  output: "standalone",
  // pino does runtime module resolution that does not survive bundling under
  // `output: "standalone"` — without this the container throws on the first log
  // call. Keep it external so it loads from node_modules at runtime. See
  // docs/adr/0020-structured-json-logging-with-pino-for-datadog.md.
  serverExternalPackages: ["pino"],
};

export default nextConfig;
