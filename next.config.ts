import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow local images from public directory
    domains: [],
    unoptimized: true,
  },
};

export default nextConfig;
