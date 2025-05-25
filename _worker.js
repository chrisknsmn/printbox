// This is a minimal Cloudflare Worker script to handle SPA routing
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // If the request is for a static asset, let it pass through
    if (
      url.pathname.startsWith('/_next/') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')
    ) {
      return fetch(request);
    }
    
    // For all other routes, serve the index.html file
    const response = await fetch(new URL('/index.html', url));
    return new Response(response.body, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
        'cache-control': 'public, max-age=0, must-revalidate'
      }
    });
  }
};
