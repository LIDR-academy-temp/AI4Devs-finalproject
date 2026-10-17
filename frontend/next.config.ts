import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle, so the runtime image needs no node_modules install.
  output: "standalone",
};

export default nextConfig;
