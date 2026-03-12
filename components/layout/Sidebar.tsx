'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Profile {
  role: string;
  full_name: string | null;
  email: string;
}

const NAV_ITEMS = [
  { href: '/dashboard',        label: 'Dashboard',         icon: '🏠', roles: ['super_admin','agency_admin','campaign_manager','client_view'] },
  { href: '/clients',          label: 'Clients',           icon: '👥', roles: ['super_admin','agency_admin','campaign_manager'] },
  { href: '/campaigns',        label: 'Campaigns',         icon: '🚀', roles: ['super_admin','agency_admin','campaign_manager'] },
  { href: '/utm',              label: 'UTM Builder',       icon: '🔗', roles: ['super_admin','agency_admin','campaign_manager'] },
  { href: '/analytics',        label: 'Analytics',         icon: '📈', roles: ['super_admin','agency_admin','campaign_manager'] },
  { href: '/ai-presentation',  label: 'AI Presentations',  icon: '🎯', roles: ['super_admin','agency_admin','campaign_manager'] },
  { href: '/reports',          label: 'Reports',           icon: '📊', roles: ['super_admin','agency_admin','campaign_manager'] },
  { href: '/portal',           label: 'Client Portal',     icon: '👁',  roles: ['client_view'] },
  { href: '/settings',         label: 'Settings',          icon: '⚙️', roles: ['super_admin','agency_admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      if (!data.user) return;
      supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', data.user.id)
        .single()
        .then(({ data: p }: { data: Profile | null }) => {
          if (p) setProfile(p);
        });
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  const visibleNav = NAV_ITEMS.filter(item =>
    !profile || item.roles.includes(profile.role)
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className={`flex flex-col bg-dark-900 border-r border-dark-700 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-dark-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-sm font-black text-white shrink-0">
          NG
        </div>
        {!collapsed && (
          <span className="font-black text-lg gradient-text">Neon Ghost</span>
        )}
        <button
          onClick={() => setCollapsed(p => !p)}
          className="ml-auto text-gray-500 hover:text-white transition-colors text-sm"
          aria-label="Toggle sidebar"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {visibleNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
              isActive(item.href)
                ? 'bg-neon-purple/20 text-white border border-neon-purple/30'
                : 'text-gray-400 hover:bg-dark-700 hover:text-white'
            }`}
          >
            <span className="text-lg shrink-0">{item.icon}</span>
            {!collapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
            {!collapsed && isActive(item.href) && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-purple" />
            )}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      {profile && (
        <div className={`border-t border-dark-700 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-xs font-bold text-white">
                  {(profile.full_name || profile.email)?.[0]?.toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-white truncate">{profile.full_name || profile.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile.role.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left text-xs text-gray-500 hover:text-red-400 transition-colors px-1 py-1"
              >
                Sign out →
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-red-400 transition-colors text-sm"
              title="Sign out"
            >
              ⏻
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
