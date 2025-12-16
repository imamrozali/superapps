# Vercel Deployment Guide

## Prerequisites

1. **PostgreSQL Database** (pilih salah satu):
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - [Neon](https://neon.tech/)
   - [Supabase](https://supabase.com/)
   - [Railway](https://railway.app/)
   - Any PostgreSQL hosting service

## Environment Variables

Tambahkan environment variables berikut di Vercel Project Settings → Environment Variables:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App URL (gunakan domain Vercel Anda)
NEXTAUTH_URL=https://your-app.vercel.app

# WebAuthn/Passkey
RP_ID=your-app.vercel.app
EXPECTED_ORIGIN=https://your-app.vercel.app

# Encryption
ENCRYPTION_KEY=your-encryption-key-min-32-chars

# Node Environment
NODE_ENV=production
```

## Setup Steps

### 1. Setup Database

#### Option A: Vercel Postgres (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Create Postgres database
vercel postgres create

# Pull environment variables
vercel env pull .env.local
```

#### Option B: External Database (Neon, Supabase, etc.)
1. Create a PostgreSQL database
2. Copy connection string
3. Add to Vercel environment variables

### 2. Run Database Migrations

Setelah database ready, jalankan migrasi:

```bash
# Set DATABASE_URL di terminal atau .env
export DATABASE_URL="postgresql://..."

# Run migrations
npm run db:migrate

# Optional: Seed data
npm run db:seed
```

### 3. Setup OAuth Credentials

#### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Create New OAuth App
3. Set:
   - Homepage URL: `https://your-app.vercel.app`
   - Authorization callback URL: `https://your-app.vercel.app/api/v1/auth/github/callback`
4. Copy Client ID and Client Secret to Vercel env vars

#### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Set:
   - Authorized JavaScript origins: `https://your-app.vercel.app`
   - Authorized redirect URIs: `https://your-app.vercel.app/api/v1/auth/google/callback`
6. Copy Client ID and Client Secret to Vercel env vars

### 4. Deploy to Vercel

#### Via Vercel CLI
```bash
vercel --prod
```

#### Via GitHub Integration
1. Push code ke GitHub
2. Import project di Vercel dashboard
3. Vercel akan auto-deploy setiap push ke main branch

## Troubleshooting

### Database Connection Error

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
1. Pastikan `DATABASE_URL` sudah diset di Vercel environment variables
2. Format connection string harus benar:
   ```
   postgresql://user:password@host:5432/database?sslmode=require
   ```
3. Untuk Vercel Postgres, gunakan connection string dari tab "Settings" → ".env.local"

### JWT Secret Error

**Error:** `JWT_SECRET is not set`

**Solution:**
Generate secure random string dan tambahkan ke environment variables:
```bash
# Generate random string
openssl rand -base64 32

# Add to Vercel env vars
```

### OAuth Redirect Error

**Error:** Redirect URI mismatch

**Solution:**
1. Pastikan `NEXTAUTH_URL` sesuai dengan domain Vercel
2. Update OAuth callback URLs di GitHub/Google Console
3. Jangan gunakan `localhost` atau `127.0.0.1` di production

### Build Failed

**Error:** Type errors atau ESLint errors

**Solution:**
```bash
# Test locally first
npm run type-check
npm run lint
npm run build

# Fix any errors before deploying
```

## Monitoring

Setelah deploy, monitor logs di:
- Vercel Dashboard → Your Project → Deployments → Logs
- Vercel Dashboard → Your Project → Monitoring

## Security Checklist

- [ ] All environment variables set
- [ ] JWT_SECRET is strong (min 32 chars)
- [ ] ENCRYPTION_KEY is strong (min 32 chars)
- [ ] OAuth redirect URIs configured correctly
- [ ] Database uses SSL connection (`?sslmode=require`)
- [ ] NODE_ENV=production
- [ ] No sensitive data in code/logs

## Useful Commands

```bash
# View logs
vercel logs

# View environment variables
vercel env ls

# Add environment variable
vercel env add

# Pull latest environment variables
vercel env pull
```

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
