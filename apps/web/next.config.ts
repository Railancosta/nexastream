import type { NextConfig } from 'next';

const staticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = staticExport
  ? {
      output: 'export',
      images: { unoptimized: true },
      trailingSlash: true
    }
  : {
      // Proxy same-origin: o frontend consome /api e /storage sem CORS,
      // encaminhando para o serviço core (JWT, vídeos, feed, storage)
      async rewrites() {
        const core = process.env.CORE_API_URL || 'http://localhost:3002';
        return [
          { source: '/api/:path*', destination: core + '/api/:path*' },
          { source: '/storage/:path*', destination: core + '/storage/:path*' }
        ];
      },
      // Segurança: Forçar HTTPS em produção
      async headers() {
        return [
          {
            source: '/:path*',
            headers: [
              // HSTS (HTTP Strict Transport Security)
              {
                key: 'Strict-Transport-Security',
                value: 'max-age=31536000; includeSubDomains; preload'
              },
              // XSS Protection
              {
                key: 'X-XSS-Protection',
                value: '1; mode=block'
              },
              // X-Content-Type-Options
              {
                key: 'X-Content-Type-Options',
                value: 'nosniff'
              },
              // X-Frame-Options
              {
                key: 'X-Frame-Options',
                value: 'DENY'
              },
              // Referrer Policy
              {
                key: 'Referrer-Policy',
                value: 'strict-origin-when-cross-origin'
              },
              // Content Security Policy (CSP)
              {
                key: 'Content-Security-Policy',
                value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' http://localhost:3001 http://localhost:3002; frame-src 'none'; object-src 'none'"
              },
              // Permissions Policy
              {
                key: 'Permissions-Policy',
                value: 'camera=(), microphone=(), geolocation=()'
              }
            ]
          }
        ];
      },
      // Redirecionar HTTP para HTTPS em produção
      async redirects() {
        return [
          {
            source: '/:path*',
            has: [
              {
                type: 'host',
                value: process.env.NEXT_PUBLIC_DOMAIN || 'nexastream.org'
              }
            ],
            destination: 'https://:host/:path*',
            permanent: true
          }
        ];
      },
      // Configurações de imagem otimizadas
      images: {
        unoptimized: false,
        domains: ['localhost'],
        minimumCacheTTL: 60
      },
      // Compressão habilitada
      compress: true
    };

export default nextConfig;
