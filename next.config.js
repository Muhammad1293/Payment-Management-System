// next.config.js
const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Cloudflare Pages + next-on-pages
  // All API routes declare `export const runtime = 'edge'`
};

if (process.env.NODE_ENV === 'development') {
  setupDevPlatform().catch(console.error);
}

module.exports = nextConfig;
