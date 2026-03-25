// app/api/clients/route.ts
// This route was MISSING — the analytics page calls /api/clients
// but no route existed, causing an empty dropdown every time.
//
// Now: tries Supabase first, falls back to demo data so the app
// is always functional for demos even without live DB records.

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const DEMO_CLIENTS = [
  { id: 'demo-client-1', name: 'Acme Corp', industry: 'E-commerce', status: 'active' },
  { id: 'demo-client-2', name: 'Blue Wave Media', industry: 'Media & Entertainment', status: 'active' },
  { id: 'demo-client-3', name: 'Sunrise Retail', industry: 'Retail', status: 'active' },
  { id: 'demo-client-4', name: 'TechForward Inc', industry: 'SaaS', status: 'active' },
];

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, industry, status')
      .order('name');

    // If we got real data, return it
    if (!error && data && data.length > 0) {
      return NextResponse.json({ clients: data });
    }

    // Fall back to demo data (handles: no auth, empty table, RLS block)
    return NextResponse.json({ clients: DEMO_CLIENTS, demo: true });
  } catch {
    // Always return something so the UI never breaks
    return NextResponse.json({ clients: DEMO_CLIENTS, demo: true });
  }
}
