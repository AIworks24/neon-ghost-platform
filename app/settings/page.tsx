'use client';

import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';

const SETTINGS_SECTIONS = [
  {
    href: '/settings/team',
    icon: '👥',
    label: 'Team Management',
    desc: 'Invite staff, assign roles, manage access',
    roles: ['super_admin', 'agency_admin'],
  },
  {
    href: '/settings/platforms',
    icon: '🔌',
    label: 'Platform Credentials',
    desc: 'Connect Meta, TikTok, LinkedIn and more per client',
    roles: ['super_admin', 'agency_admin'],
    badge: 'Coming next',
  },
  {
    href: '/settings/branding',
    icon: '🎨',
    label: 'Agency Branding',
    desc: 'White-label logos, colors, and domain settings',
    roles: ['super_admin'],
    badge: 'Coming soon',
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'Settings' }]} />
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Platform configuration and administration</p>
      </div>

      <div className="space-y-3">
        {SETTINGS_SECTIONS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="card flex items-center justify-between hover:border-neon-purple/40 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center text-2xl group-hover:bg-neon-purple/10 transition-colors">
                {s.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{s.label}</p>
                  {s.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 text-gray-400">{s.badge}</span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{s.desc}</p>
              </div>
            </div>
            <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
