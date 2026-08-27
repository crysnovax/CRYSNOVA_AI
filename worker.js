/**
 * Simple Cloudflare Worker proxy for GitHub API.
 *
 * Purpose:
 * - Keep your GitHub token out of client-side code.
 * - Deploy this Worker to plogme.crysnova.qzz.io and set a secret binding GITHUB_TOKEN.
 *
 * Security notes:
 * - This is a simple proxy; apply rate-limiting, ACLs, and additional auth checks before publishing.
 * - Do NOT embed real tokens here in the repo. Set the token as an environment/secret in Cloudflare (Workers > Variables).
 *
 * Example: configure a route like https://plogme.crysnova.qzz.io/github/* -> this worker.
 *
 * Usage:
 * - Request to https://plogme.crysnova.qzz.io/github/repos/:owner/:repo/contents/:path
 *   The worker forwards the request to api.github.com with the GITHUB_TOKEN binding.
 */

addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const url = new URL(request.url);

  // Only accept paths under /github/
  if (!url.pathname.startsWith('/github/')) {
    return new Response('Not found', { status: 404 });
  }

  // Build target GitHub URL (strip /github prefix)
  const githubPath = url.pathname.replace(/^\/github/, '');

  // Restrict to allowed GitHub API paths and prevent path traversal
  if (!githubPath.startsWith('/repos/') || githubPath.includes('..')) {
    return new Response('Forbidden', { status: 403 });
  }

  const target = `https://api.github.com${githubPath}${url.search}`;

  // IMPORTANT: set your token in the Cloudflare Worker secrets as GITHUB_TOKEN
  const GITHUB_TOKEN = GLOBAL_GITHUB_TOKEN; // replace with binding name in deployment (see note below)

  if (!GITHUB_TOKEN) {
    return new Response('Server misconfigured: missing GITHUB_TOKEN', { status: 500 });
  }

  // Forward the method, headers, and body.
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set('Authorization', `Bearer ${GITHUB_TOKEN}`);
  forwardHeaders.set('User-Agent', 'plogme-proxy');

  const resp = await fetch(target, {
    method: request.method,
    headers: forwardHeaders,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'follow'
  });

  // Relay response back
  const body = await resp.arrayBuffer();
  const headers = new Headers(resp.headers);
  // Remove cookies and other hop-by-hop headers if desired
  return new Response(body, {
    status: resp.status,
    statusText: resp.statusText,
    headers
  });
}

/*
Deployment note:
- In Cloudflare Workers, bind the secret as an env/secret. If you're using wrangler v2, add:
  env:
    GITHUB_TOKEN: <your-token>
  Then in Worker code reference it as "GITHUB_TOKEN" (global binding).
- Replace GLOBAL_GITHUB_TOKEN above with the actual binding variable name (for example: GITHUB_TOKEN).
*/
