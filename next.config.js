// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Legacy: WhatsApp used /cancel/:id, correct route is /booking/:id
      { source: "/cancel/:id", destination: "/booking/:id", permanent: true },
      // Handle double-slash from trailing slash in NEXT_PUBLIC_APP_URL
      { source: "//cancel/:id", destination: "/booking/:id", permanent: true },
    ];
  },
  // PWA: manifest and service worker are served from public/
  // No next-pwa needed; we use custom public/sw.js and register in client
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
};

module.exports = nextConfig;
