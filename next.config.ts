import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

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
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: {
    '/api/orders/[orderId]/invoice': ['./node_modules/pdfkit/js/data/*.afm'],
    '/api/3d-shop/orders/[orderId]/invoice': ['./node_modules/pdfkit/js/data/*.afm'],
    '/api/admin/orders/export': ['./node_modules/pdfkit/js/data/*.afm'],
  },
  // HTTP/2, Brotli, and 103 Early Hints are deployment-layer behavior.
  // Vercel handles them automatically; self-hosted Node/Docker deployments
  // should terminate HTTP/2 and emit Early Hints from the reverse proxy.
  experimental: {
    inlineCss: true,
    optimizePackageImports: ['framer-motion', 'lucide-react', 'three-stdlib', '@react-three/drei'],
    webVitalsAttribution: ['CLS', 'INP', 'LCP'],
  },
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
    formats: ['image/avif', 'image/webp'],
    qualities: [50, 75],
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  async headers() {
    const immutableAssetHeaders = [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ]

    const noStoreHeaders = [
      {
        key: 'Cache-Control',
        value: 'no-store, max-age=0',
      },
    ]

    const headerRules = [
      {
        source: '/((?!api|_next/static|_next/image|.*\\..*).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/:path*\\.(mp4|webm|ogg)',
        headers: [
          ...immutableAssetHeaders,
          {
            key: 'Accept-Ranges',
            value: 'bytes',
          },
        ],
      },
      {
        source: '/:path*\\.(css|js|mjs)',
        headers: immutableAssetHeaders,
      },
      {
        source: '/:path*\\.(ico|png|jpg|jpeg|svg|webp|avif|woff|woff2|ttf|otf)',
        headers: immutableAssetHeaders,
      },
      {
        source: '/api/admin/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/api/3d-shop/admin/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/api/3d-shop/orders/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/api/orders/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/api/3d-shop/wishlist/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/api/3d-shop/reviews/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/api/3d-shop/notify-me',
        headers: noStoreHeaders,
      },
      {
        source: '/api/blog/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/api/blog',
        headers: noStoreHeaders,
      },
      {
        source: '/api/coupons/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/api/tracking/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/api/track',
        headers: noStoreHeaders,
      },
      {
        source: '/api/log-error',
        headers: noStoreHeaders,
      },
      {
        source: '/api/upload',
        headers: noStoreHeaders,
      },
      {
        source: '/api/test-upload',
        headers: noStoreHeaders,
      },
      {
        source: '/api/check-schema',
        headers: noStoreHeaders,
      },
    ]

    return headerRules
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
      {
        source: '/admin/email-logs',
        destination: '/admin/emails/logs',
        permanent: true,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || 'flux3d',
  project: process.env.SENTRY_PROJECT || 'javascript-nextjs',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_DSN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
})
