// app/utm/layout.tsx
// Gives the UTM Builder page the sidebar + dashboard shell.

import DashboardLayout from '@/app/dashboard/layout';

export default function UTMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
