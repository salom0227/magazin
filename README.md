# Zamon Market

React + Vite frontend with an Express + Prisma (PostgreSQL) backend.

## Requirements

- Node.js 20.19+, 22.12+ or 24+ (Prisma 7 requirement)
- PostgreSQL 14+

## Local setup

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
npx prisma migrate deploy     # or: npx prisma migrate dev
npm run prisma:seed           # optional demo data
npm run dev                   # http://localhost:3000
```

A local database via Docker:

```bash
docker run -d --name magazin-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=magazin -p 5432:5432 postgres:16
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/magazin?schema=public
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Token signing secret; the server exits if it is missing |
| `PORT` | no | HTTP port (default `3000`) |
| `DELIVERY_FEE` | no | Delivery fee in so'm (default `25000`) |
| `FREE_DELIVERY_THRESHOLD` | no | Free delivery from this subtotal (default `500000`) |
| `SEED_ADMIN_PIN` / `SEED_USER_PIN` | no | PIN codes for seeded accounts (default `1234`) |
| `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_ENDPOINT` | for uploads | Cloudflare R2 credentials |
| `R2_PUBLIC_URL` | for uploads | Public bucket URL (`*.r2.dev` or custom domain) used to build image URLs |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | no | Order notifications; skipped when unset |

### Seeded accounts

`npm run prisma:seed` creates an admin (`+998901234567`) and a demo user (`+998991234567`)
with the PINs from `SEED_ADMIN_PIN` / `SEED_USER_PIN`. Change these before exposing an
environment publicly — seeded PINs are for local development only.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Express + Vite dev server |
| `npm run build` | Builds the client and bundles the server to `dist/server.cjs` |
| `npm start` | Runs the production bundle |
| `npm run lint` | `tsc --noEmit` |
| `npm run prisma:migrate` | Create/apply a development migration |
| `npm run prisma:seed` | Seed demo data |

## Authentication

PINs are 4 digits, stored as PBKDF2-SHA512 hashes (100k iterations) with a per-user salt.
Login is rate limited to 5 failed attempts per phone number, followed by a 5 minute lock.
Tokens are HMAC-SHA256 signed and valid for 30 days.

## Deployment

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start
```

Set all required environment variables in the hosting provider. `NODE_ENV=production`
makes the server serve `dist/` instead of starting Vite in middleware mode.

In production the frontend never falls back to mock data: failed API calls surface as
errors. The mock dataset in `src/data/mockData.ts` is imported lazily and only used when
`import.meta.env.DEV` is true.
