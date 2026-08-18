import type { NextConfig } from 'next'
const staticExport = process.env.STATIC_EXPORT === '1'
const nextConfig: NextConfig = staticExport
  ? { output: 'export', images: { unoptimized: true }, trailingSlash: true }
  : {}
export default nextConfig
