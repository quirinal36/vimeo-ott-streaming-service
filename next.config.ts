import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
              "connect-src 'self' https://*.supabase.co https://localhost:* http://localhost:*",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
