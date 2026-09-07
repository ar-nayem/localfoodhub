/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // `next start` only scans public/ once at boot, so a file uploaded after the server is
  // already running isn't in that cache and 404s on its normal /uploads/<...> path even
  // though it's on disk. Next checks public/ first regardless, so already-known files
  // still take that fast path unaffected — this rewrite only fires on a miss, sending it
  // to app/api/uploads/[...path]/route.ts, which reads straight from disk instead.
  async rewrites() {
    return [{ source: "/uploads/:path*", destination: "/api/uploads/:path*" }];
  },
};

module.exports = nextConfig;
