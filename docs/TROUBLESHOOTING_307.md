# Troubleshooting 307 Redirect di Vercel

## Gejala
- Login berhasil (200 OK)
- Redirect ke `/dashboard?_rsc=5c339`
- Langsung redirect lagi dengan **307 Temporary Redirect**
- User tidak pernah sampai ke dashboard

## Root Cause
Ada beberapa kemungkinan penyebab:

### 1. ❌ JWT_SECRET Tidak Di-set di Vercel
**Paling sering terjadi!**

Session tidak bisa di-decrypt karena `JWT_SECRET` tidak ada di environment variables Vercel.

**Cara Check:**
```bash
# Test debug endpoint
curl https://superapps-kappa.vercel.app/api/v1/debug/session
```

Jika `hasJwtSecret: false` → JWT_SECRET belum di-set!

**Cara Fix:**
1. Generate secret:
   ```bash
   openssl rand -base64 32
   ```

2. Tambahkan ke Vercel:
   - Go to: https://vercel.com/pokemon-catch-muhammadimamrozali/superapps/settings/environment-variables
   - Add: `JWT_SECRET` = hasil dari command di atas
   - Apply to: Production, Preview, Development
   - Redeploy

### 2. ❌ Cookie Tidak Ter-set dengan Benar

**Cara Check:**
```bash
# Set test cookie
curl https://superapps-kappa.vercel.app/api/v1/debug/cookie

# Check if cookie exists
curl -X POST https://superapps-kappa.vercel.app/api/v1/debug/cookie \
  -H "Cookie: test_cookie=test-xxxxx"
```

**Cara Fix:**
- Pastikan `secure: true` di production
- Pastikan `sameSite: 'lax'` (bukan 'strict')
- Pastikan `path: '/'`

### 3. ❌ Middleware Redirect Loop

**Cara Check:**
Lihat Vercel logs:
- https://vercel.com/pokemon-catch-muhammadimamrozali/superapps/logs

Cari pattern:
```
Redirecting to login - no session
Redirecting to dashboard - already authenticated
```

**Cara Fix:**
- Pastikan middleware skip untuk `_rsc` parameter (sudah fixed)
- Pastikan session decrypt tidak throw error

### 4. ❌ Database Connection Error

**Cara Check:**
```bash
curl -X POST https://superapps-kappa.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Jika error `ECONNREFUSED` → Database tidak terkoneksi

**Cara Fix:**
- Set `DATABASE_URL` di Vercel environment variables
- Pastikan connection string benar dengan `?sslmode=require`

## Quick Diagnostic Steps

### Step 1: Check Environment Variables
```bash
curl https://superapps-kappa.vercel.app/api/v1/debug/session
```

Expected output:
```json
{
  "env": {
    "hasJwtSecret": true,
    "jwtSecretLength": 44,
    "nodeEnv": "production",
    "nextAuthUrl": "https://superapps-kappa.vercel.app"
  }
}
```

### Step 2: Test Login
```bash
curl -i -X POST https://superapps-kappa.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Check response headers for:
```
Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax; Path=/
```

### Step 3: Test Session After Login
Setelah login, copy cookie `session=...` dari response:
```bash
curl https://superapps-kappa.vercel.app/api/v1/debug/session \
  -H "Cookie: session=YOUR_SESSION_TOKEN_HERE"
```

Expected:
```json
{
  "hasSession": true,
  "session": {
    "userId": "uuid-here",
    ...
  }
}
```

### Step 4: Check Vercel Logs
1. Go to: https://vercel.com/pokemon-catch-muhammadimamrozali/superapps/logs
2. Filter by: "Error" or "Redirect"
3. Look for patterns

## Most Common Fix (90% kasus)

**Set JWT_SECRET di Vercel:**

```bash
# Generate secret
openssl rand -base64 32
# Output: 8xK2mN5pQ7rS9tU0vW1xY2zA3bC4dE5fG6hH7iI8jJ9=

# Add to Vercel via CLI
vercel env add JWT_SECRET production
# Paste: 8xK2mN5pQ7rS9tU0vW1xY2zA3bC4dE5fG6hH7iI8jJ9=

# Or via Dashboard:
# https://vercel.com/pokemon-catch-muhammadimamrozali/superapps/settings/environment-variables
```

Kemudian **REDEPLOY**:
```bash
vercel --prod
```

## Verification

Setelah fix, test:

1. **Login:**
   - Go to: https://superapps-kappa.vercel.app/login
   - Enter credentials
   - Should redirect to `/dashboard` (no more 307!)

2. **Check session:**
   ```bash
   # Login via curl to get session cookie
   curl -i -X POST https://superapps-kappa.vercel.app/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"yourpassword"}'
   
   # Copy session cookie from Set-Cookie header
   # Then check session
   curl https://superapps-kappa.vercel.app/api/v1/debug/session \
     -H "Cookie: session=PASTE_HERE"
   ```

3. **Access dashboard:**
   Browser should stay on `/dashboard` without redirecting

## Still Not Working?

Check Vercel Function Logs in real-time:
```bash
vercel logs --follow
```

Then try to login and watch the logs for errors.

## Contact Support

If still having issues, provide:
1. Screenshot of Vercel environment variables (hide sensitive values)
2. Output from `/api/v1/debug/session`
3. Vercel function logs during login attempt
