/** @type {import('next').NextConfig} */

// Content Security Policy
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.paystack.co https://js.withmono.com https://apis.google.com https://www.gstatic.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://i.imgur.com https://picsum.photos https://lh3.googleusercontent.com https://*.googleusercontent.com;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://api.paystack.co https://api.withmono.com https://*.googleapis.com https://*.firebase.com https://*.firebaseio.com https://*.firebaseapp.com https://*.web.app https://*.cloudfunctions.net wss://*.firebaseio.com wss://*.googleapis.com;
    frame-src 'self' https://js.paystack.co https://js.withmono.com https://*.firebaseapp.com https://*.web.app https://*.google.com;
    media-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

// Standard Security Headers
const securityHeaders = [
  /*
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
  */
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  /* 
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  */
  {
    key: 'Access-Control-Allow-Origin',
    value: '*', 
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET, POST, PUT, DELETE, OPTIONS',
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  },
];

const nextConfig = {
  // IMPORTANT: Do NOT use output: 'export' if you want AI flows or API routes to work.
  reactStrictMode: true,
  transpilePackages: ['react-markdown', 'remark-gfm', 'unified', 'vfile'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
      'firebase-admin': 'commonjs firebase-admin',
      'genkit': 'commonjs genkit',
      '@genkit-ai/google-genai': 'commonjs @genkit-ai/google-genai',
      '@opentelemetry/sdk-node': 'commonjs @opentelemetry/sdk-node',
    });

    // Ignore optional OpenTelemetry exporters that cause build failures on Vercel
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/exporter-jaeger': false,
      '@opentelemetry/exporter-zipkin': false,
    };

    return config;
  },
};

module.exports = nextConfig;
