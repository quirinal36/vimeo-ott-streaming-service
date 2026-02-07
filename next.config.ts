import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "frame-src https://iframe.mediadelivery.net",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://assets.mediadelivery.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.b-cdn.net https://images.unsplash.com https://*.unsplash.com",
              "connect-src 'self' https://*.supabase.co https://*.up.railway.app https://video.bunnycdn.com https://localhost:* http://localhost:*",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
