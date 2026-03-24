/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Local development / LocalStack
      { protocol: 'http', hostname: 'localhost', port: '**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '**' },
      // AWS S3 — virtual-hosted style: {bucket}.s3.{region}.amazonaws.com
      { protocol: 'https', hostname: '**.amazonaws.com' },
      // Custom S3 bucket domain via env var
      ...(process.env.S3_BUCKET_DOMAIN
        ? [{ protocol: 'https', hostname: process.env.S3_BUCKET_DOMAIN }]
        : []),
    ],
  },
  async rewrites() {
    // In mock mode the API client points at localhost:3000 (this server).
    // Skip the rewrite entirely to avoid an infinite redirect loop and let
    // the mock route handlers under src/app/api/v1/ respond directly.
    if (process.env.NEXT_PUBLIC_MOCK_API === 'true') return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // Allow same-machine cross-port requests in dev/mock mode
      ...(process.env.NEXT_PUBLIC_MOCK_API === 'true'
        ? [
            {
              source: '/api/:path*',
              headers: [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,PUT,DELETE,OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
              ],
            },
          ]
        : []),
    ];
  },
};

module.exports = nextConfig;
