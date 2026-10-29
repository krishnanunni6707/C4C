/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

// Content Security Policy
// In production: no unsafe-eval! In development: unsafe-eval allowed for React HMR
const cspScriptSrc = isProd
  ? "'self' 'unsafe-inline' https://checkout.razorpay.com https://api.razorpay.com"
  : "'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com";

const contentSecurityPolicy = `
  default-src 'self';
  script-src ${cspScriptSrc};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://res.cloudinary.com;
  font-src 'self' data:;
  connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://res.cloudinary.com ws://127.0.0.1:* ws://localhost:*;
  frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isProd ? "upgrade-insecure-requests;" : ""}
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  // Security headers configuration (P-14)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Keep server-only packages out of the client webpack bundle
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
