// app/ai-presentation/layout.tsx
// Gives the AI Presentation Builder page the sidebar + dashboard shell.

import DashboardLayout from '@/app/dashboard/layout';

export default function AIPresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
