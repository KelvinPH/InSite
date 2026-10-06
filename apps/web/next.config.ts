import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@insite/db", "@insite/shared"],
  serverExternalPackages: ["pg"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
