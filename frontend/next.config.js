/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Use 127.0.0.1 (not localhost) — macOS resolves localhost to ::1 first,
      // which collides with anything Docker binds on IPv6. Port 8010 keeps us
      // clear of the infra-api-1 container on :8000.
      { source: "/api/:path*", destination: "http://127.0.0.1:8010/api/:path*" },
    ];
  },
};
module.exports = nextConfig;
