import type {NextConfig} from 'next';

const allowedOrigin = 'https://6000-firebase-studio-1748732078140.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [allowedOrigin],
  },
};

console.log("--- Loading next.config.ts ---");
console.log("Current allowedOrigin variable:", allowedOrigin);
console.log("experimental.allowedDevOrigins in config:", nextConfig.experimental?.allowedDevOrigins);
console.log("-----------------------------");

export default nextConfig;
