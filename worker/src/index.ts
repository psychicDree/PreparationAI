/**
 * PreparationAI edge API gateway (Cloudflare Worker).
 *
 * Fronts api.jobpreparation.online and reverse-proxies to the Go (Fiber)
 * backend on Fly.io, adding CORS and security headers and transparently
 * passing through WebSocket upgrades (preserving the ?token= query the backend
 * uses to authenticate the socket).
 *
 * Rate limiting is intentionally NOT done here: the Go backend already enforces
 * an app-level limit, and edge limiting is better handled by Cloudflare's
 * Rate Limiting rules / WAF than by per-isolate state in a Worker.
 */

export interface Env {
  ORIGIN_URL?: string;
  ALLOWED_ORIGIN?: string;
}

const DEFAULT_ORIGIN = 'https://preparationai-api.fly.dev';
const DEFAULT_ALLOWED_ORIGIN = 'https://jobpreparation.online';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = (env.ORIGIN_URL ?? DEFAULT_ORIGIN).replace(/\/$/, '');
    const allowedOrigin = env.ALLOWED_ORIGIN ?? DEFAULT_ALLOWED_ORIGIN;

    const url = new URL(request.url);
    const targetUrl = origin + url.pathname + url.search;

    // Answer CORS preflight directly; never proxy it to the origin.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    // WebSocket upgrades: forward transparently so the 101 + socket stream and
    // the ?token= query string are preserved. Response headers on a 101 cannot
    // be mutated, so return it unchanged.
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return fetch(new Request(targetUrl, request));
    }

    // Proxy the request to the origin backend.
    let originResponse: Response;
    try {
      originResponse = await fetch(new Request(targetUrl, request));
    } catch {
      return new Response(
        JSON.stringify({ error: 'Bad gateway: origin unreachable' }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders(allowedOrigin) } },
      );
    }

    // Re-emit the response with CORS + security headers attached.
    const response = new Response(originResponse.body, originResponse);
    for (const [key, value] of Object.entries(corsHeaders(allowedOrigin))) {
      response.headers.set(key, value);
    }
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  },
} satisfies ExportedHandler<Env>;
