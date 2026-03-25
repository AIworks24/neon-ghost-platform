// app/campaigns/layout.tsx
// Wraps ALL /campaigns/* routes in the DashboardLayout.
// This covers:
//   /campaigns              — campaign list
//   /campaigns/new          — new campaign form
//   /campaigns/[id]         — campaign detail
//   /campaigns/[id]/launch  — launch wizard
// Previously these pages had no sidebar because they lived outside
// app/dashboard/ and had no layout.tsx of their own.

import DashboardLayout from '@/app/dashboard/layout';

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
