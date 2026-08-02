import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "arc-api-production-ef9c.up.railway.app" },
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
