import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typedRoutes: false,
  transpilePackages: ["tldraw", "@tldraw/tldraw"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
