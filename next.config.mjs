/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep server-only packages out of the webpack bundle.
  // firebase-admin and cloudinary use Node.js built-ins that cannot run
  // in the browser or edge runtime — mark them as externals.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "firebase-admin",
        "firebase-admin/app",
        "firebase-admin/firestore",
        "firebase-admin/storage",
        "firebase-admin/auth",
        "cloudinary",
      ];
    }
    return config;
  },
};

export default nextConfig;
