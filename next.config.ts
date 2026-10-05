import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      { source: "/publik/fasilitas", destination: "/fasilitas", permanent: true },
      { source: "/publik/fasilitas/:facilityId", destination: "/fasilitas/:facilityId", permanent: true },
    ];
  },
};

export default nextConfig;
