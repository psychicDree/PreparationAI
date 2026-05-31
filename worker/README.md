# PreparationAI edge gateway (Cloudflare Worker)

An optional edge API gateway that fronts `api.jobpreparation.online` and
reverse-proxies to the Go backend on Fly.io. It adds CORS + security headers and
transparently passes through WebSocket upgrades (preserving the `?token=` query
the backend uses to authenticate the socket).

> Not required: you can instead point `api.jobpreparation.online` straight at the
> Fly origin via a proxied Cloudflare DNS record and use WAF rules. This Worker
> is for when you want gateway logic at the edge.

## Configure

Set the origin and allowed CORS origin in `wrangler.toml` (`[vars]`) or override
per-environment:

```bash
npx wrangler secret put ORIGIN_URL        # e.g. https://preparationai-api.fly.dev
npx wrangler secret put ALLOWED_ORIGIN    # https://jobpreparation.online
```

(They are plain vars here, not secrets — `[vars]` in `wrangler.toml` is fine.)

## Develop & deploy

```bash
npm install
npm run typecheck      # tsc --noEmit
npm run dev            # local: wrangler dev
npm run deploy         # wrangler deploy (requires `wrangler login` or CLOUDFLARE_API_TOKEN)
```

The `routes` in `wrangler.toml` require `jobpreparation.online` to be a zone on
your Cloudflare account with a DNS record for `api.jobpreparation.online`.
