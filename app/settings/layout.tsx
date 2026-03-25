// app/settings/layout.tsx
// Wraps ALL /settings/* routes in the DashboardLayout.
// This covers:
//   /settings              — settings index
//   /settings/platforms    — per-client platform credentials
// Any future settings sub-pages are automatically covered too.

import DashboardLayout from '@/app/dashboard/layout';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
