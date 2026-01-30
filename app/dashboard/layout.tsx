'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { toast } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // Step 1: Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Invalid session');
      }

      if (!session) {
        console.log('No session found');
        router.push('/auth/login');
        return;
      }

      // Step 2: Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User error:', userError);
        throw userError;
      }

      if (!user) {
        console.log('No user found');
        router.push('/auth/login');
        return;
      }

      console.log('User found:', user.id, user.email);

      // Step 3: Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError.message, profileError.code, profileError.details);
        
        // If profile doesn't exist (PGRST116 = no rows returned)
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, attempting to create...');
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: 'campaign_manager'
            })
            .select()
            .single();

          if (insertError) {
            console.error('Insert error:', insertError);
            toast.error('Could not create profile. Please contact support.');
            return;
          }

          console.log('Profile created:', newProfile);
          setProfile(newProfile);
          toast.success('Profile created successfully!');
          return;
        }
        
        throw profileError;
      }

      console.log('Profile loaded:', profileData);
      setProfile(profileData);

    } catch (error: any) {
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.details);
      toast.error('Authentication error. Please try logging in again.');
      
      // Clear bad session and redirect
      await supabase.auth.signOut();
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Unable to load profile</p>
          <button onClick={() => router.push('/auth/login')} className="btn-primary">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-dark-800 border-r border-dark-600">
        {/* Logo */}
        <div className="p-6 border-b border-dark-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-neon rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">NG</span>
            </div>
            <span className="text-xl font-bold gradient-text">Neon Ghost</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <span>🏠</span>
            <span>Home</span>
          </Link>
          <Link
            href="/clients"
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <span>👥</span>
            <span>Clients</span>
          </Link>
          <Link
            href="/content"
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <span>✨</span>
            <span>Content</span>
          </Link>
          <Link
            href="/campaigns"
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <span>🚀</span>
            <span>Campaigns</span>
          </Link>
          <Link
            href="/reports"
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <span>📈</span>
            <span>Reports</span>
          </Link>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-neon rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {profile?.role.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-white transition-colors"
              title="Sign out"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        {/* Top Bar */}
        <header className="bg-dark-800 border-b border-dark-600 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {profile?.full_name || 'User'}!
            </h1>
            <div className="flex items-center space-x-4">
              <span className="badge bg-neon-purple/20 text-neon-purple">
                {profile?.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}