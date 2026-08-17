/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Necessário para exportação estática
  },
  trailingSlash: true,
}

module.exports = nextConfig
