'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function AcceptInvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Supabase puts the token in the URL hash on invite links
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email || '');
        setReady(true);
      } else {
        toast.error('Invalid or expired invite link');
        router.push('/auth/login');
      }
    });
  }, []);

  async function handleSetPassword() {
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password set! Redirecting to dashboard…');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-2xl font-black text-white mx-auto">
            NG
          </div>
          <h1 className="text-2xl font-bold">Welcome to Neon Ghost</h1>
          <p className="text-gray-400 text-sm">Set a password to activate your account</p>
          {email && <p className="text-xs text-gray-500">{email}</p>}
        </div>

        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="input"
              placeholder="Repeat your password"
              onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
            />
          </div>
          <button
            onClick={handleSetPassword}
            disabled={loading || !password}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Activating…' : 'Activate Account →'}
          </button>
        </div>
      </div>
    </div>
  );
}
