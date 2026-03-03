/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    // In production, nginx handles /api proxying
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
  async redirects() {
    return [
      { source: '/nguoi-dung', destination: '/users', permanent: true },
      { source: '/tin-nhan', destination: '/messages', permanent: true },
      { source: '/co-so-kien-thuc', destination: '/knowledge-base', permanent: true },
      { source: '/cham-diem', destination: '/scoring', permanent: true },
      { source: '/nhat-ky', destination: '/logs', permanent: true },
      { source: '/ket-noi-mcp', destination: '/mcp-connections', permanent: true },
      { source: '/cai-dat', destination: '/settings', permanent: true },
    ];
  },
};

module.exports = nextConfig;
