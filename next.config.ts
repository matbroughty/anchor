import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Required for AWS Amplify static export compatibility
  },
};

export default nextConfig;
