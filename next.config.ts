import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@base-ui/react", "lucide-react"],
  },
};

export default nextConfig;
