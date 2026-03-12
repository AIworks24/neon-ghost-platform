// app/api/team/route.ts
// Team management API — list, invite, update role, deactivate
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getCallerProfile() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();
  return profile;
}

// GET /api/team — list all team members
export async function GET() {
  const caller = await getCallerProfile();
  if (!caller || !['super_admin', 'agency_admin'].includes(caller.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data });
}

// POST /api/team — invite a new team member
export async function POST(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || !['super_admin', 'agency_admin'].includes(caller.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { email, full_name, role } = await req.json();

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }

  // agency_admin cannot create super_admin accounts
  if (caller.role === 'agency_admin' && role === 'super_admin') {
    return NextResponse.json({ error: 'You cannot create super_admin accounts' }, { status: 403 });
  }

  const VALID_ROLES = ['super_admin', 'agency_admin', 'campaign_manager', 'client_view'];
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Check if user already exists in auth
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    // User exists in auth — just upsert their profile role
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: existingUser.id,
        email,
        full_name: full_name || email.split('@')[0],
        role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ member: updatedProfile, invited: false, message: 'User role updated' });
  }

  // Invite brand new user via Supabase Auth Admin
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: full_name || '', role },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invite`,
    }
  );

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

  // Pre-create their profile row so role is set before first login
  if (inviteData?.user) {
    await supabaseAdmin.from('profiles').upsert({
      id: inviteData.user.id,
      email,
      full_name: full_name || email.split('@')[0],
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  }

  return NextResponse.json({
    invited: true,
    message: `Invitation sent to ${email}`,
  });
}

// PATCH /api/team — update a team member's role or name
export async function PATCH(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || !['super_admin', 'agency_admin'].includes(caller.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId, role, full_name } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Prevent role escalation
  if (role === 'super_admin' && caller.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admins can assign super_admin role' }, { status: 403 });
  }

  // Prevent self-demotion
  if (userId === caller.id && role && role !== caller.role) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (role) updates.role = role;
  if (full_name) updates.full_name = full_name;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

// DELETE /api/team — remove a team member (disable auth + clear profile role)
export async function DELETE(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || caller.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admins can remove team members' }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  if (userId === caller.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });

  // Disable the auth user (ban them) rather than hard delete
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Downgrade role to prevent access
  await supabaseAdmin.from('profiles').update({ role: 'client_view' }).eq('id', userId);

  return NextResponse.json({ success: true });
}
