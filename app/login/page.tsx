'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        alert('Login failed');
      }
    } catch (error) {
      alert('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!email) {
      alert('Enter email first');
      return;
    }
    setLoading(true);

    try {
      // Get authentication options
      const optionsResponse = await fetch(`/api/v1/auth/passkey/authenticate?email=${encodeURIComponent(email)}`, {
        credentials: 'include',
      });
      const options = await optionsResponse.json();

      if (!optionsResponse.ok) {
        alert('No passkeys found for this email');
        return;
      }

      // Start authentication
      const authResponse = await startAuthentication(options);

      // Verify authentication
      const verifyResponse = await fetch('/api/v1/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, response: authResponse }),
      });

      if (verifyResponse.ok) {
        router.push('/dashboard');
      } else {
        alert('Passkey authentication failed');
      }
    } catch (error) {
      console.error('Passkey auth error:', error);
      alert('Error authenticating with passkey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl mb-4">Login</h1>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-500 text-white p-2 rounded"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={loading || !email}
            className="flex-1 bg-purple-500 text-white p-2 rounded disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Login with Passkey'}
          </button>
        </div>
        <div className="mt-4">
          <button
            onClick={() => window.location.href = '/api/v1/auth/google'}
            className="w-full bg-red-500 text-white p-2 rounded mb-2"
          >
            Login with Google
          </button>
          <button
            onClick={() => window.location.href = '/api/v1/auth/github'}
            className="w-full bg-gray-800 text-white p-2 rounded"
          >
            Login with GitHub
          </button>
        </div>
      </form>
    </div>
  );
}