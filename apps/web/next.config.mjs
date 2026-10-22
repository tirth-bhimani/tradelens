const isDev = process.env.NODE_ENV === "development" || process.argv.includes("dev");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Isolate dev server build artifacts from production next build so running dev server never corrupts
  distDir: isDev ? ".next-dev" : ".next",
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
