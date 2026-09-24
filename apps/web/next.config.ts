import type { NextConfig } from 'next';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com https://accounts.google.com/gsi/client",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://accounts.google.com/gsi/style",
  "img-src 'self' data: blob: https: https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  'frame-src https://accounts.google.com/gsi/',
  "worker-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://accounts.google.com/gsi/ https://prod.spline.design https://*.spline.design https://*.splinecode.com",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kistas/shared', '@kistas/supabase', '@kistas/ui'],
  allowedDevOrigins: [
    'outer-prompt-magazines-tissue.trycloudflare.com',
    '*.trycloudflare.com',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
