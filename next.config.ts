
import type {NextConfig} from 'next';

// Determine the base URL structure from the environment if available, or default
const baseUrlWithoutPort = process.env.NODE_ENV === 'development' && process.env.GITPOD_WORKSPACE_URL
  ? `https://firebase-studio-1748732078140.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev` // Fallback for similar environments
  : `https://firebase-studio-1748732078140.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev`; // Default for your setup

const allowedDevOriginsList: string[] = [];

if (process.env.NODE_ENV === 'development') {
  // Add origin based on common dev ports.
  // Your dev script uses 9002, and an error mentioned 9000.
  const devPort9002 = baseUrlWithoutPort.replace(/^(https?:\/\/)([^:]+)(:\d+)?(.*)$/, `$1$2:9002$4`);
  const devPort9000 = baseUrlWithoutPort.replace(/^(https?:\/\/)([^:]+)(:\d+)?(.*)$/, `$1$2:9000$4`);
  
  // Ensure the base URL derived doesn't already have a conflicting port before adding new ones.
  // The original `allowedOrigin` had port 6000. Let's be explicit about the ports we expect.
  allowedDevOriginsList.push(devPort9002);
  allowedDevOriginsList.push(devPort9000);

  // If you had a specific reason for port 6000, you could add it like this:
  // const devPort6000 = baseUrlWithoutPort.replace(/^(https?:\/\/)([^:]+)(:\d+)?(.*)$/, `$1$2:6000$4`);
  // allowedDevOriginsList.push(devPort6000);
}


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
    allowedDevOrigins: allowedDevOriginsList.length > 0 ? allowedDevOriginsList : undefined,
  },
};

console.log("--- Loading next.config.ts ---");
if (process.env.NODE_ENV === 'development') {
  console.log("Base URL for dev origins:", baseUrlWithoutPort);
  console.log("Allowed development origins set in Next.js config:", nextConfig.experimental?.allowedDevOrigins);
} else {
  console.log("Running in production or other mode, allowedDevOrigins might not be set via this logic.");
}
console.log("-----------------------------");


export default nextConfig;
