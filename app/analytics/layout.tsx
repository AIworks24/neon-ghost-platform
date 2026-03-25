// app/analytics/layout.tsx
// This file gives the Analytics page the same sidebar + shell as all dashboard pages.
// Without this file the page renders with no navigation.

import DashboardLayout from '@/app/dashboard/layout';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
