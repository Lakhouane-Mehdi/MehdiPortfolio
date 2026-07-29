# Portfolio — mehdilakhouane.com

My personal site. It covers the move from Straßenbauer (road construction) to
software, and the projects I've built along the way.

Vanilla HTML, CSS, and JavaScript — no UI framework. Vite bundles it, Vercel
hosts it, Supabase handles the data.

## What's in it

- **Five pages** — the main portfolio, a project screenshot gallery, a private
  admin dashboard, plus Impressum and Datenschutz (required for a German site).
- **Contact form** that writes to Postgres, with a honeypot field and
  per-IP rate limiting.
- **Privacy-first analytics** I wrote myself instead of using Google Analytics.
  Nothing is tracked until the visitor consents, and IPs are hashed, never stored raw.
- **Admin dashboard** behind Supabase Auth, for reading messages and view stats.
- **English and German**, switched at runtime from JSON translation files.
- **Responsive** down to small phones, with a real hamburger menu.

## Stack

| | |
|---|---|
| Build | Vite (multi-page) |
| Frontend | Vanilla JS, CSS custom properties |
| Backend | Vercel serverless functions |
| Database | Supabase (Postgres + Row Level Security) |
| Auth | Supabase Auth (admin only) |
| Hosting | Vercel |

## Running it

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.

```bash
npm run build     # production build into dist/
npm run preview   # preview that build locally
```

## API

| Route | Purpose |
|---|---|
| `POST /api/contact` | Contact form submissions |
| `POST /api/track` | Pageview events (consent required) |
| `GET /api/stats` | Aggregate analytics (admin) |
| `GET /api/messages` | Read contact messages (admin) |
| `GET /api/keepalive` | Twice-weekly cron so the free Supabase tier doesn't pause |

Admin routes verify a Supabase JWT server-side. The service-role key stays on
the server and is never exposed to the browser.

## Security

Security headers are set in [`vercel.json`](vercel.json) — a strict
Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, and a locked-down
Permissions-Policy. Database access is guarded by Row Level Security; the schema
lives in [`supabase/`](supabase/).

## License

MIT
