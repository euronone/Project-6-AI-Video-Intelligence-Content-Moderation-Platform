/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      's3.amazonaws.com',
      process.env.S3_BUCKET_DOMAIN || '',
    ].filter(Boolean),
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
