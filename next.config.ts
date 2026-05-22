import type { NextConfig } from 'next'

if (
  process.env.NEXT_ADAPTER_PATH &&
  process.env.VERCEL_PREVIEW_COMMENTS_ENABLED === '1'
) {
  // Vercel's Next adapter reads ctx.projectDir during modifyConfig, but Next
  // 16.2 only provides that field after the build completes.
  process.env.VERCEL_PREVIEW_COMMENTS_ENABLED = '0'
}

const nextConfig: NextConfig = {
  compress: true,
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'jqgaebdtuasenyojvbsi.supabase.co',
      },
    ],
    minimumCacheTTL: 86400,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/:path*\\.(ico|png|jpg|jpeg|svg|webp|avif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/shelf',
        destination: '/3d-shop',
        permanent: true,
      },
      {
        source: '/shelf/:path*',
        destination: '/3d-shop/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
