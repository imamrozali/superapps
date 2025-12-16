import { NextRequest, NextResponse } from 'next/server';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function GET() {
  const scopes = ['user:email'];
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${scopes.join(' ')}&redirect_uri=${encodeURIComponent(`${BASE_URL}/api/v1/auth/github/callback`)}`;

  return NextResponse.redirect(githubAuthUrl);
}