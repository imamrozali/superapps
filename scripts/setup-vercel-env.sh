#!/bin/bash

# Setup Vercel Environment Variables
# This script sets all required environment variables in Vercel

echo "🚀 Setting up Vercel Environment Variables for superapps-kappa.vercel.app"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in
echo "Checking Vercel login status..."
vercel whoami || vercel login

echo ""
echo "📝 Setting environment variables..."
echo ""

# Required variables
echo "Setting NEXTAUTH_URL..."
vercel env add NEXTAUTH_URL production <<< "https://superapps-kappa.vercel.app"

echo "Setting RP_ID..."
vercel env add RP_ID production <<< "superapps-kappa.vercel.app"

echo "Setting EXPECTED_ORIGIN..."
vercel env add EXPECTED_ORIGIN production <<< "https://superapps-kappa.vercel.app"

echo "Setting NODE_ENV..."
vercel env add NODE_ENV production <<< "production"

echo ""
echo "⚠️  Please set these manually in Vercel Dashboard:"
echo ""
echo "1. DATABASE_URL (already set from Neon)"
echo "2. JWT_SECRET (generate with: openssl rand -base64 32)"
echo "3. ENCRYPTION_KEY (generate with: openssl rand -base64 32)"
echo ""
echo "Optional (for OAuth):"
echo "4. GITHUB_CLIENT_ID"
echo "5. GITHUB_CLIENT_SECRET"
echo "6. GOOGLE_CLIENT_ID"
echo "7. GOOGLE_CLIENT_SECRET"
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com/pokemon-catch-muhammadimamrozali/superapps/settings/environment-variables"
echo "2. Add the remaining environment variables"
echo "3. Redeploy: vercel --prod"
echo ""
