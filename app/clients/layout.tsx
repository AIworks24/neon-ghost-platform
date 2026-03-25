// app/clients/layout.tsx
// Wraps all /clients/* routes in the same DashboardLayout used by
// every other page — giving them the sidebar, auth guard, and
// dark-background shell without touching any page.tsx files.

import DashboardLayout from '@/app/dashboard/layout';

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
