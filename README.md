## Projection – Invoicing System

Next.js 15 app with Prisma, NextAuth, role-based access, invoices, journal, reports, stock, and media management.

Key features:

- Invoice creation (supports collection-only invoices – no items)
- Stock management with inline edit (name, capacity, price, stock, image upload/remove)
- Customers and journal entries with reports and print buttons
- Global background and logo editable from Settings
- Image upload with automatic resize and WebP optimization via `sharp`
- Optional Cloudinary integration for production-grade media storage

---

## Local Development

1) Install dependencies

```bash
npm install
# If missing: npm install sharp
```

2) Environment variables (create `.env.local`)

```
DATABASE_URL="postgresql://..."  # Neon connection string
NEXTAUTH_SECRET="your-strong-secret"
NEXTAUTH_URL="http://localhost:3001"  # dev URL

# Optional: enable Cloudinary uploads in dev
# CLOUDINARY_URL="cloudinary://API_KEY:API_SECRET@CLOUD_NAME"
# or
# CLOUDINARY_CLOUD_NAME="..."
# CLOUDINARY_API_KEY="..."
# CLOUDINARY_API_SECRET="..."
```

3) Generate Prisma client (after any schema edits)

```bash
npx prisma generate
```

4) Run dev server on port 3001

```bash
npm run dev -- -p 3001
# or: next dev -p 3001
```

Dev site: http://localhost:3001

---

## Production Deployment (Vercel + Neon + Cloudinary)

This project is ready for stable public deployment with:

- Vercel (Next.js hosting)
- Neon (Postgres)
- Cloudinary (image storage)

### Required Environment Variables (Vercel Project Settings → Environment Variables)

```
NEXTAUTH_URL = https://your-domain.vercel.app
NEXTAUTH_SECRET = <strong-random-string>
DATABASE_URL = <Neon connection string>

# One of the following for Cloudinary
CLOUDINARY_URL = cloudinary://API_KEY:API_SECRET@CLOUD_NAME
# or the 3-part config
CLOUDINARY_CLOUD_NAME = ...
CLOUDINARY_API_KEY = ...
CLOUDINARY_API_SECRET = ...
```

Notes:

- Without Cloudinary, uploads fall back to local `public/uploads`, which is not persistent on Vercel. For stable production, set Cloudinary env vars.
- If you add or change Prisma schema fields, deploy with `npx prisma migrate deploy` as part of your pipeline if your platform supports it.

### Steps to Deploy

1) Push this repository to GitHub (or your Git provider).
2) Import the repository into Vercel.
3) Add the environment variables above (Production scope).
4) Deploy. After the first successful deploy, open your production URL.
5) Sign in and go to `/settings` to upload a background and logo.

---

## What’s already implemented (code)

- `app/api/upload/route.ts` will:
  - Resize images to max width 1000px, convert to WebP (quality 80)
  - Upload to Cloudinary automatically if credentials are present
  - Fall back to local `/public/uploads` in development

- `app/api/media/route.ts`:
  - GET returns latest logo and background
  - POST accepts absolute or relative URLs (e.g., `/uploads/...`)

- `app/settings/page.tsx` + `components/settings-form.tsx`:
  - Upload and set logo/background from the UI (ADMIN/MANAGER only)

- `app/stock/page.tsx`:
  - Inline edit for name, capacity, price, stock
  - Upload/Remove product images
  - Delete product (blocked if used in invoice items)

- `app/api/invoices/route.ts`:
  - Supports collection-only invoices (no items)
  - Consistent journal entry + customer debt updates

---

## What you must do manually

- Create and set env vars in Vercel:
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `CLOUDINARY_...`
- Ensure Neon database is reachable and migrated
- Create an ADMIN/MANAGER account (via seed script or admin flow you prefer)
- After deploy, set site media from `/settings` (logo/background)

Optional manual items:

- Add Sentry or logging
- Add rate limiting for APIs
- Add seed scripts for initial data

---

## Troubleshooting

- "Transaction already closed" during invoice save:
  - Caused by slow DB cold start. The code increases interactive transaction timeout; try again after a few seconds.

- Images not showing in production:
  - Ensure Cloudinary env vars are set so uploads use a persistent store
  - Confirm the image URL is HTTPS and accessible

- NextAuth issues in production:
  - Check `NEXTAUTH_URL` matches your deploy URL
  - Verify `NEXTAUTH_SECRET` is set

---

## Scripts

Common commands:

```bash
npm install                # install deps
npx prisma generate        # generate Prisma client
npm run dev -p 3001        # run dev on port 3001
```

