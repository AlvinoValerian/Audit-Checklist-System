import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5000/api/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/auth/login",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/auth/register",
        destination: "/register",
        permanent: true,
      },
      {
        source: "/workspaces",
        destination: "/workspace",
        permanent: false,
      },
      {
        source: "/superadmin/workspaces",
        destination: "/workspace",
        permanent: false,
      },
      {
        source: "/superadmin",
        destination: "/kelola-admin",
        permanent: false,
      },
      {
        source: "/admins",
        destination: "/kelola-admin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
