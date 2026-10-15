import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets a verification build run into a separate folder while `next dev` uses .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@prisma/client"],
  webpack: (config) => {
    // Wallet adapter packages reference optional Node builtins in the browser bundle.
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;
