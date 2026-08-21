import type { NextConfig } from 'next';

const staticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = staticExport
  ? {
      output: 'export',
      images: { unoptimized: true },
      trailingSlash: true
    }
  : {
      // Proxy same-origin: o frontend consome /api e /storage sem CORS.
      // Cada prefixo é roteado para o microsserviço correspondente.
      async rewrites() {
        const host = process.env.SERVICES_HOST || 'http://localhost';
        const svc = (port: number) => process.env['SVC_' + port + '_URL'] || host + ':' + port;
        const route = (prefix: string, port: number) => ({
          source: '/api/' + prefix + '/:path*',
          destination: svc(port) + '/api/' + prefix + '/:path*'
        });
        return [
          route('analytics', 3018),
          route('bounty', 3022),
          route('chain', 3008),
          route('content', 3004),
          route('dao', 3015),
          route('explorer', 3009),
          route('kpi', 3017),
          route('live', 3013),
          route('mainnet', 3024),
          route('metrics', 3010),
          route('mod', 3014),
          route('nano', 3021),
          route('nft', 3016),
          route('reco', 3012),
          route('social', 3011),
          route('swap', 3023),
          // fallback: core (auth, videos, feed, search, geo, translate)
          { source: '/api/:path*', destination: svc(3002) + '/api/:path*' },
          { source: '/storage/:path*', destination: svc(3002) + '/storage/:path*' }
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
                value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self'; font-src 'self'; connect-src 'self' https://*.ngrok-free.app https://*.ngrok.io wss://*.ngrok-free.app wss://*.ngrok.io; frame-src 'self' https://*.ngrok-free.app https://*.ngrok.io; object-src 'none'; base-uri 'self'; form-action 'self'"
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
      // HTTPS redirect is handled by Cloudflare automatically
      // Configurações de imagem otimizadas
      images: {
        unoptimized: false,
        domains: ['localhost', '*.ngrok-free.app', '*.ngrok.io'],
        minimumCacheTTL: 60
      },
      // Compressão habilitada
      compress: true
    };

export default nextConfig;
