'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleRegisterPasskey = async () => {
    setLoading(true);
    try {
      // Get registration options
      const optionsResponse = await fetch('/api/v1/auth/passkey/register', {
        credentials: 'include',
      });
      const options = await optionsResponse.json();

      if (!optionsResponse.ok) {
        alert('Failed to get registration options');
        return;
      }

      // Start registration
      const registrationResponse = await startRegistration(options);

      // Verify registration
      const verifyResponse = await fetch('/api/v1/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ response: registrationResponse }),
      });

      if (verifyResponse.ok) {
        alert('Passkey registered successfully!');
      } else {
        alert('Passkey registration failed');
      }
    } catch (error) {
      console.error('Passkey registration error:', error);
      alert('Error registering passkey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
      <p>Welcome to your dashboard!</p>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Security</h2>
        <button
          onClick={handleRegisterPasskey}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register Passkey'}
        </button>
      </div>
    </div>
  );
}