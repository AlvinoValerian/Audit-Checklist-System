import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyTimeout: 120000,
  },
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
      {
        source: "/riwayat",
        destination: "/jadwal-staff/riwayat",
        permanent: false,
      },
      {
        source: "/profile",
        destination: "/jadwal-staff/profile",
        permanent: false,
      },
      {
        source: "/profil",
        destination: "/jadwal-staff/profile",
        permanent: false,
      },
      {
        source: "/staff/riwayat",
        destination: "/jadwal-staff/riwayat",
        permanent: false,
      },
      {
        source: "/staff/profile",
        destination: "/jadwal-staff/profile",
        permanent: false,
      },
      {
        source: "/staff/profil",
        destination: "/jadwal-staff/profile",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
