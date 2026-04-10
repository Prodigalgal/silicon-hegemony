/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/silicon-hegemony',
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/silicon-hegemony',
        permanent: false,
        basePath: false,
      },
    ]
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: '/silicon-hegemony',
  },
}

export default nextConfig
