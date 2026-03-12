// components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  roles?: string[]; // if undefined, show to all
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { href: '/clients', icon: '🏢', label: 'Clients', roles: ['super_admin', 'agency_admin', 'campaign_manager'] },
  { href: '/campaigns', icon: '🚀', label: 'Campaigns', roles: ['super_admin', 'agency_admin', 'campaign_manager'] },
  { href: '/utm', icon: '🔗', label: 'UTM Builder', roles: ['super_admin', 'agency_admin', 'campaign_manager'] },
  { href: '/analytics', icon: '📊', label: 'Analytics' },
  { href: '/reports', icon: '📈', label: 'Reports' },
  { href: '/portal', icon: '👤', label: 'Client Portal', roles: ['client_view'] },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin/users', icon: '👥', label: 'Users', roles: ['super_admin', 'agency_admin'] },
  { href: '/admin/platforms', icon: '🔌', label: 'Platform Accounts', roles: ['super_admin', 'agency_admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>('');
  const [userName, setUserName] = useState('');
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      const user = data?.user;
      if (user) {
        supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
          .then(({ data: profile }: { data: { role: string; full_name: string } | null }) => {
            if (profile) { setRole(profile.role); setUserName(profile.full_name || ''); }
          });
      }
    });
  }, []);

  const isVisible = (item: NavItem) => !item.roles || item.roles.includes(role);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  return (
    <aside className="w-64 min-h-screen bg-black/60 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="text-2xl font-black gradient-text">NEON GHOST</div>
        <div className="text-xs text-gray-500 mt-1">Media Buying Platform</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.filter(isVisible).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive(item.href)
                ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* Admin Section */}
        {ADMIN_ITEMS.some(isVisible) && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-xs text-gray-600 uppercase tracking-wider px-3">Admin</p>
            </div>
            {ADMIN_ITEMS.filter(isVisible).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                    : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-neon-purple/30 border border-neon-purple/50 flex items-center justify-center text-sm font-bold text-neon-purple">
            {userName.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{role.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
