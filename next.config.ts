import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // This project sits inside a workspace that has its own lockfile higher up.
  // Pinning the trace root stops Next inferring the parent directory and
  // dragging unrelated sibling projects into the build trace.
  outputFileTracingRoot: process.cwd(),

  // three.js ships untranspiled ESM examples; Next handles this natively but we
  // opt three into the server-external bundle path to keep the RSC graph lean.
  transpilePackages: ['three'],

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
