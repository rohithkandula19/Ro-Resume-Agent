/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,
  // Static export for Firebase Hosting — set OUTPUT=export when building for prod.
  ...(process.env.OUTPUT === "export" ? { output: "export" } : {}),
  async rewrites() {
    // In dev, proxy /api/* to the local FastAPI server.
    // In Firebase Hosting, firebase.json rewrites handle /api/* → Cloud Run.
    if (isProd) return [];
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:8010/api/:path*" },
    ];
  },
};

module.exports = nextConfig;
