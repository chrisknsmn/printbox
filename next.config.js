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
  
  // App Router is now the default in Next.js 15.3.2
  // No experimental options needed
};

module.exports = nextConfig;
