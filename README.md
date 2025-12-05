# Huluxe Delivery Tracker

A delivery tracking system for staff and authorizers.

## Features

- ✅ Staff page: Morning run form, Check-in/out, Evening report
- ✅ Authorizer page: View/authorize runs, Manage users, Settings
- ✅ Vehicle selection with exclusive booking
- ✅ Google Sheets sync on authorization
- ✅ Email alerts for late check-in & delivery shortfall
- ✅ 12-hour IST time format

## Deploy to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/huluxe-tracker.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Click "Deploy"

### Step 3: Add Environment Variables

In Vercel dashboard → Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_JBEznXRGq72x@ep-snowy-bonus-a4vzrd1x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_b3B0aW11bS1kYXNzaWUtNzAuY2xlcmsuYWNjb3VudHMuZGV2JA` |
| `CLERK_SECRET_KEY` | `sk_test_wAlQhnDBw2yxHvfO1dJlSg9FfLFs4EjaVutgQrWWZZ` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `RESEND_API_KEY` | `re_J5WZyJDE_Kr6W1D3NJy7ZqkRLctFBy22i` |
| `ADMIN_EMAIL` | `huluxemarketing@gmail.com` |

### Step 4: Update Clerk Settings

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Add your Vercel URL to allowed origins
3. Update redirect URLs if needed

### Step 5: Redeploy

After adding environment variables, click "Redeploy" in Vercel.

## Local Development

```bash
npm install
npx prisma generate
npm run dev
```

## Tech Stack

- Next.js 16 (App Router)
- Tailwind CSS + shadcn/ui
- PostgreSQL (Neon)
- Prisma ORM
- Clerk Authentication
- Resend Email
- React Query
