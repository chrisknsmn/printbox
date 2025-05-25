/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports for Cloudflare Pages
  output: 'export',
  
  // Disable image optimization since Cloudflare Pages doesn't support it natively
  images: {
    unoptimized: true,
  },
  
  // Ensure trailing slashes are handled correctly
  trailingSlash: true,
  
  // Disable server components since we're using static export
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
