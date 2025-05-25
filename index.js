// This is a simple placeholder file for Wrangler static site deployment
// It's not actually used, but Wrangler requires an entry point

export default {
  async fetch(request, env) {
    // This function is not used for static site deployments
    // Cloudflare Pages automatically handles serving static files
    return new Response("PrintBox Static Site", { status: 200 });
  }
};
