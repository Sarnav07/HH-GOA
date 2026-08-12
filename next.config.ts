import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Pulls single icons out of the barrel instead of the whole family.
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
