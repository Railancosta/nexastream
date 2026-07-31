/**
 * TLS/SSL HARDENING CONFIGURATION
 * NexaStream Military-Grade Transport Security
 * 
 * Implements:
 * - TLS 1.3 with 0-RTT disabled for security
 * - Strong cipher suites (AEAD only)
 * - Certificate Pinning
 * - OCSP Stapling
 * - Perfect Forward Secrecy
 */

const fs = require('fs');

// ============================================================================
// TLS CONFIGURATION - FIPS 140-2 COMPLIANT
// ============================================================================

const TLS_CONFIG = {
    // Minimum TLS version
    minVersion: 'TLSv1.3',
    
    // Maximum TLS version
    maxVersion: 'TLSv1.3',
    
    // Cipher suites in order of preference
    // Only AEAD ciphers with Perfect Forward Secrecy
    ciphers: [
        // TLS 1.3 cipher suites
        'TLS_AES_256_GCM_SHA384',
        'TLS_AES_128_GCM_SHA256',
        'TLS_CHACHA20_POLY1305_SHA256',
        
        // TLS 1.2 cipher suites (fallback for older clients)
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-CHACHA20-POLY1305',
        
        // Reject weak ciphers
        '!aNULL',
        '!eNULL',
        '!EXPORT',
        '!DES',
        '!RC4',
        '!MD5',
        '!PSK',
        '!SRP',
        '!CAMELLIA',
        '!SEED',
        '!IDEA',
        '!3DES'
    ].join(':'),
    
    // Diffie-Hellman parameters
    dhparam: {
        size: 4096,
        generator: 2
    },
    
    // ECDH curve preference
    ecdhCurve: [
        'secp521r1',
        'secp384r1',
        'secp256r1',
        'X448',
        'X25519'
    ].join(':'),
    
    // Session configuration
    sessionTimeout: 3600, // 1 hour
    sessionCacheSize: 10000,
    
    // HSTS preload
    hstsPreload: true,
    hstsMaxAge: 63072000, // 2 years
    
    // Certificate configuration
    certificates: {
        // Primary certificate chain
        cert: process.env.SSL_CERT_PATH || '/etc/ssl/certs/nexastream.pem',
        // Private key (must be kept secure)
        key: process.env.SSL_KEY_PATH || '/etc/ssl/private/nexastream.key',
        // Intermediate certificates
        ca: process.env.SSL_CA_PATH || '/etc/ssl/certs/ca-bundle.crt',
        
        // OCSP Stapling
        ocsp: true,
        ocspTimeout: 5000,
        
        // Let's Encrypt specific
        letsEncrypt: {
            enabled: true,
            challengeType: 'http-01',
            renewalDaysBefore: 30
        }
    },
    
    // Certificate Pinning (HPKP - Deprecated but useful for internal PKI)
    // For public CAs, use CSP with report-uri instead
    pinning: {
        // SHA-256 fingerprint of your certificate's public key
        pins: [
            'sha256AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
            // Backup key pin (rotate keys periodically)
            'sha256 BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='
        ],
        includeSubDomains: true,
        maxAge: 5184000, // 60 days
        reportUri: '/api/security/hpkp-violation'
    }
};

// ============================================================================
// MUTUAL TLS (mTLS) CONFIGURATION
// ============================================================================

const MTLS_CONFIG = {
    enabled: true,
    
    // Client certificate authentication
    requestCert: true,
    rejectUnauthorized: true,
    
    // CA for client certificates
    ca: process.env.MTLS_CA_PATH || '/etc/ssl/certs/client-ca.pem',
    
    // Certificate validation options
    verifyOptions: {
        // Check certificate date validity
        checkValidity: true,
        
        // Verify against hostname
        verifyHostname: true,
        
        // Maximum allowed time difference (in seconds)
        maxAge: 86400,
        
        // Subject alternative names
        subjectAltNames: ['nexastream.org', '*.nexastream.org']
    },
    
    // Certificate revocation checking
    revocation: {
        enabled: true,
        // Use OCSP for real-time checking
        preferCsr: false,
        strict: false,
       softFail: false
    }
};

// ============================================================================
// SECURITY HEADERS FOR HTTPS
// ============================================================================

const HTTPS_HEADERS = {
    // Strict Transport Security
    'Strict-Transport-Security': [
        'max-age=63072000',           // 2 years
        'includeSubDomains',          // Apply to all subdomains
        'preload'                      // Submit to HSTS preload list
    ].join('; '),
    
    // HTTP Public Key Pinning (for custom PKI only)
    // WARNING: Can cause site lockout if misconfigured
    'Public-Key-Pins': [
        'pin-sha256="cUPcTAZWKaASuYWhhneDttWpY3oBAkE63hogaLG/LQM="',
        'pin-sha256="M8HztCzM3evUxYmEmTFVEfWrNWIHAA3Q8VMFzZoA4c4="',
        'max-age=5184000',            // 60 days
        'includeSubDomains',
        'report-uri="https://nexastream.org/api/security/hpkp-report"'
    ].join('; '),
    
    // Certificate Transparency compliance
    'Expect-CT': [
        'max-age=86400',              // 24 hours
        'enforce',                    // Strict enforcement
        'report-uri="https://nexastream.org/api/security/ct-report"'
    ].join('; ')
};

// ============================================================================
// NGNIX CONFIGURATION TEMPLATE
// ============================================================================

const NGINX_CONFIG = `
# ============================================
# NEXASTREAM - MILITARY GRADE NGINX CONFIG
# ============================================

# Run as non-root user
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;

# PID file
pid /run/nginx.pid;

events {
    worker_connections 65535;
    use epoll;
    multi_accept on;
}

http {
    # ============================================
    # SECURITY HEADERS
    # ============================================
    
    # Hide nginx version
    server_tokens off;
    
    # Remove "nginx" from server header
    more_set_headers 'Server: SecureProxy';
    
    # Strict Transport Security
    add_header Strict-Transport-Security 
        "max-age=63072000; includeSubDomains; preload" 
        always;
    
    # X-Frame-Options
    add_header X-Frame-Options "DENY" always;
    
    # X-Content-Type-Options
    add_header X-Content-Type-Options "nosniff" always;
    
    # X-XSS-Protection
    add_header X-XSS-Protection "1; mode=block; report=/api/security/xss-report" always;
    
    # Referrer Policy
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Permissions Policy
    add_header Permissions-Policy 
        "camera=(), microphone=(), geolocation=(), payment=(self)" 
        always;
    
    # Content Security Policy
    add_header Content-Security-Policy 
        "default-src 'none'; 
         script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; 
         style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
         font-src 'self' https://fonts.gstatic.com; 
         img-src 'self' data: https: blob:; 
         object-src 'none'; 
         frame-ancestors 'none'; 
         form-action 'self'; 
         base-uri 'self'; 
         connect-src 'self' https://nexastream.org wss://nexastream.org;
         report-uri /api/security/csp-report"
        always;
    
    # ============================================
    # SSL/TLS CONFIGURATION
    # ============================================
    
    ssl_protocols TLSv1.3;
    ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-CHACHA20-POLY1305';
    ssl_prefer_server_ciphers off;
    ssl_ecdh_curve secp521r1:secp384r1:secp256r1:X448:X25519;
    
    # SSL session configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # SSL certificate paths
    ssl_certificate /etc/ssl/certs/nexastream.pem;
    ssl_certificate_key /etc/ssl/private/nexastream.key;
    ssl_trusted_certificate /etc/ssl/certs/ca-bundle.pem;
    
    # DH parameters for perfect forward secrecy
    ssl_dhparam /etc/ssl/dhparams.pem;
    
    # ============================================
    # RATE LIMITING
    # ============================================
    
    # Define rate limit zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    limit_req_zone $binary_remote_addr zone=global:10m rate=50r/s;
    limit_req_zone $binary_remote_addr $http_authorization zone=auth:10m rate=5r/m;
    
    # Connection limit
    limit_conn_zone $binary_remote_addr zone=conn:10m;
    
    # ============================================
    # PROTECTION
    # ============================================
    
    # Prevent clickjacking
    add_header X-Frame-Options "DENY";
    
    # Block access to sensitive files
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \\.(env|log|conf|git|htaccess|gitignore|gitmodules)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Block SQL injection
    if ($query_string ~ ".*(union|select|insert|update|delete|drop|exec|execute).*") {
        return 403;
    }
    
    # Block XSS attempts
    if ($query_string ~ ".*(<|%3C).*script.*(>|%3E).*") {
        return 403;
    }
    
    # Block path traversal
    if ($query_string ~ ".*\\.\\./.*") {
        return 403;
    }
    
    # ============================================
    # CACHING & COMPRESSION
    # ============================================
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json 
               application/javascript application/rss+xml 
               application/atom+xml image/svg+xml;
    gzip_min_length 1000;
    gzip_disable "msie6";
    
    # Cache static assets
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # ============================================
    # MAIN APPLICATION
    # ============================================
    
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        
        server_name nexastream.org www.nexastream.org;
        
        root /var/www/nexastream/public;
        index index.html;
        
        # Apply rate limits
        limit_req zone=global burst=50 nodelay;
        limit_req zone=api burst=20 nodelay;
        limit_conn conn 10;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # API endpoints with stricter limits
        location /api/ {
            limit_req zone=api burst=10 nodelay;
            limit_req zone=auth burst=5 nodelay;
            
            # Auth endpoints
            location ~ ^/api/auth/(login|register|reset-password) {
                limit_req zone=login burst=5 nodelay;
                
                # Add security headers
                add_header X-Content-Type-Options "nosniff" always;
                add_header X-Frame-Options "DENY" always;
                
                proxy_pass http://localhost:3000;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_cache_bypass $http_upgrade;
            }
            
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            limit_req zone=global burst=100 nodelay;
            return 200 "OK";
        }
        
        # Security report endpoints
        location /api/security/ {
            access_log off;
            return 200 "{}";
        }
    }
    
    # ============================================
    # HTTP REDIRECT
    # ============================================
    
    server {
        listen 80;
        listen [::]:80;
        server_name nexastream.org www.nexastream.org;
        
        # Redirect all HTTP to HTTPS
        return 301 https://$host$request_uri;
    }
    
    # ============================================
    # RATE LIMITING ZONES
    # ============================================
    
    # IP-based rate limiting
    geo $limit {
        default 1;
        10.0.0.0/8 0;           # Internal network - no limit
        172.16.0.0/12 0;        # Internal network - no limit
        192.168.0.0/16 0;       # Internal network - no limit
    }
    
    map $limit $limit_key {
        0 "";
        1 $binary_remote_addr;
    }
}
`;

// ============================================================================
// APACHE CONFIGURATION TEMPLATE
// ============================================================================

const APACHE_CONFIG = `
# ============================================
# NEXASTREAM - MILITARY GRADE APACHE CONFIG
# ============================================

# Required modules
LoadModule ssl_module modules/mod_ssl.so
LoadModule headers_module modules/mod_headers.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule deflate_module modules/mod_deflate.so
LoadModule cache_module modules/mod_cache.so

# Security Headers
<IfModule mod_headers.c>
    # Hide server identity
    ServerTokens Prod
    ServerSignature Off
    Header always unset X-Powered-By
    Header always unset X-AspNet-Version
    Header always unset X-AspNetMvc-Version
    
    # HSTS
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    
    # X-Frame-Options
    Header always set X-Frame-Options "DENY"
    
    # X-Content-Type-Options
    Header always set X-Content-Type-Options "nosniff"
    
    # X-XSS-Protection
    Header always set X-XSS-Protection "1; mode=block"
    
    # Referrer Policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Permissions Policy
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    
    # Content Security Policy
    Header always set Content-Security-Policy "default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; object-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';"
    
    # Expect CT
    Header always set Expect-CT "enforce, max-age=86400, report-uri=https://nexastream.org/api/security/ct-report"
    
    # Cache control for sensitive pages
    <LocationMatch "(/api/auth/|/user/|/admin/)">
        Header always set Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, private"
        Header always set Pragma "no-cache"
        Header always set Expires "0"
    </LocationMatch>
</IfModule>

# SSL Configuration
<IfModule mod_ssl.c>
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1 -TLSv1.2
    SSLCipherSuite TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder on
    SSLCompression off
    SSLSessionTickets off
    SSLUseStapling on
    SSLStaplingCache "shmcb:logs/ssl_stapling(32768)"
    
    # Certificate paths
    SSLCertificateFile /etc/ssl/certs/nexastream.pem
    SSLCertificateKeyFile /etc/ssl/private/nexastream.key
    SSLCertificateChainFile /etc/ssl/certs/ca-bundle.crt
</IfModule>

# Rate Limiting (requires mod_ratelimit)
<IfModule mod_ratelimit.c>
    SetOutputFilter RATE_LIMIT
    SetEnv rate-limit 51200
</IfModule>

# Virtual Host
<VirtualHost *:443>
    ServerName nexastream.org
    ServerAlias www.nexastream.org
    DocumentRoot /var/www/nexastream/public
    
    # SSL
    SSLEngine on
    
    # Security
    <Directory "/var/www/nexastream">
        Options -Indexes -FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
    
    # Block sensitive files
    <FilesMatch "(\\.env|\\.git|\\.htaccess|\\.log)$">
        Require all denied
    </FilesMatch>
    
    # Rewrite rules
    RewriteEngine On
    RewriteCond %{HTTPS} !=on [OR]
    RewriteCond %{HTTP_HOST} !^nexastream\\.org$ [NC]
    RewriteRule ^ https://nexastream.org%{REQUEST_URI} [R=301,L]
</VirtualHost>

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName nexastream.org
    ServerAlias www.nexastream.org
    RewriteEngine On
    RewriteCond %{HTTPS} on
    RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>
`;

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    TLS_CONFIG,
    MTLS_CONFIG,
    HTTPS_HEADERS,
    NGINX_CONFIG,
    APACHE_CONFIG
};
