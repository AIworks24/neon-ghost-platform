'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Breadcrumb from '@/components/layout/Breadcrumb';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

const ROLES = [
  {
    key: 'super_admin',
    label: 'Super Admin',
    icon: '👑',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    desc: 'Full platform access. Can manage team, billing, and all settings.',
  },
  {
    key: 'agency_admin',
    label: 'Agency Admin',
    icon: '🛡️',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
    desc: 'All clients and campaigns. Can invite team members. Cannot manage billing.',
  },
  {
    key: 'campaign_manager',
    label: 'Campaign Manager',
    icon: '🚀',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    desc: 'Create and manage campaigns for assigned clients. Cannot access settings.',
  },
  {
    key: 'client_view',
    label: 'Client View',
    icon: '👁',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10 border-gray-500/30',
    desc: 'Read-only access to client portal. For external client contacts only.',
  },
];

function getRoleConfig(role: string) {
  return ROLES.find(r => r.key === role) || ROLES[2];
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [callerRole, setCallerRole] = useState('');
  const [callerId, setCallerId] = useState('');

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('campaign_manager');
  const [inviting, setInviting] = useState(false);

  // Edit modal state
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTeam(); }, []);

  async function loadTeam() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCallerId(user.id);

      const res = await fetch('/api/team');
      if (!res.ok) throw new Error('Failed to load team');
      const data = await res.json();
      setMembers(data.members || []);

      // Get own role from the loaded members
      const self = data.members?.find((m: TeamMember) => m.id === user.id);
      if (self) setCallerRole(self.role);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail) { toast.error('Email is required'); return; }
    setInviting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, full_name: inviteName, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setShowInvite(false);
      setInviteEmail(''); setInviteName(''); setInviteRole('campaign_manager');
      loadTeam();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editMember) return;
    setSaving(true);
    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editMember.id, role: editRole, full_name: editName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Member updated');
      setEditMember(null);
      loadTeam();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(member: TeamMember) {
    if (!confirm(`Remove ${member.full_name || member.email} from the team?\n\nThis will revoke their access immediately.`)) return;
    try {
      const res = await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Member removed');
      loadTeam();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const canInvite = ['super_admin', 'agency_admin'].includes(callerRole);
  const canEdit = (member: TeamMember) => {
    if (member.id === callerId) return false; // Can't edit yourself
    if (callerRole === 'super_admin') return true;
    if (callerRole === 'agency_admin') return member.role !== 'super_admin';
    return false;
  };
  const canRemove = (member: TeamMember) =>
    callerRole === 'super_admin' && member.id !== callerId;

  // Role counts
  const roleCounts = ROLES.map(r => ({
    ...r,
    count: members.filter(m => m.role === r.key).length,
  }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'Settings', href: '/settings' }, { label: 'Team' }]} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-400 mt-1">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {canInvite && (
          <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
            + Invite Team Member
          </button>
        )}
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roleCounts.map(r => (
          <div key={r.key} className={`card border ${r.bg} space-y-1`}>
            <div className="flex items-center gap-2">
              <span>{r.icon}</span>
              <span className={`text-sm font-semibold ${r.color}`}>{r.label}</span>
            </div>
            <p className="text-2xl font-black">{r.count}</p>
          </div>
        ))}
      </div>

      {/* Team Table */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-dark-700">
          <h2 className="font-bold">Team Members</h2>
        </div>
        <div className="divide-y divide-dark-700">
          {members.map(member => {
            const roleConfig = getRoleConfig(member.role);
            const isSelf = member.id === callerId;
            return (
              <div key={member.id} className="flex items-center justify-between p-4 hover:bg-dark-800 transition-colors">
                {/* Avatar + Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {(member.full_name || member.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{member.full_name || '—'}</p>
                      {isSelf && <span className="text-xs text-gray-500 bg-dark-700 px-2 py-0.5 rounded-full">You</span>}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{member.email}</p>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${roleConfig.bg} ${roleConfig.color} flex items-center gap-1`}>
                    <span>{roleConfig.icon}</span>
                    <span>{roleConfig.label}</span>
                  </span>

                  {/* Actions */}
                  {(canEdit(member) || canRemove(member)) && (
                    <div className="flex gap-2">
                      {canEdit(member) && (
                        <button
                          onClick={() => {
                            setEditMember(member);
                            setEditRole(member.role);
                            setEditName(member.full_name || '');
                          }}
                          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded bg-dark-700 hover:bg-dark-600"
                        >
                          Edit
                        </button>
                      )}
                      {canRemove(member) && (
                        <button
                          onClick={() => handleRemove(member)}
                          className="text-xs text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded bg-dark-700 hover:bg-dark-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Permissions Reference */}
      <div className="card space-y-4">
        <h3 className="font-bold">Role Permissions Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ROLES.map(r => (
            <div key={r.key} className={`p-3 rounded-xl border ${r.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <span>{r.icon}</span>
                <span className={`font-semibold text-sm ${r.color}`}>{r.label}</span>
              </div>
              <p className="text-xs text-gray-400">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── INVITE MODAL ── */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="input"
                  placeholder="colleague@company.com"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name <span className="text-gray-500 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="input"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role <span className="text-red-400">*</span></label>
                <div className="space-y-2">
                  {ROLES.filter(r => {
                    if (callerRole === 'agency_admin') return r.key !== 'super_admin';
                    return true;
                  }).map(r => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setInviteRole(r.key)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        inviteRole === r.key
                          ? 'border-neon-purple bg-neon-purple/10'
                          : 'border-dark-600 hover:border-dark-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span>{r.icon}</span>
                        <span className={`font-semibold text-sm ${r.color}`}>{r.label}</span>
                      </div>
                      <p className="text-xs text-gray-400">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowInvite(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {inviting ? 'Sending…' : '📧 Send Invite'}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              They'll receive an email to set their password and join the platform.
              If they already have an account, their role will be updated immediately.
            </p>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editMember && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Edit Team Member</h3>
              <button onClick={() => setEditMember(null)} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center font-bold text-white">
                {(editMember.full_name || editMember.email)[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{editMember.full_name || '—'}</p>
                <p className="text-sm text-gray-400">{editMember.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="input"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <div className="space-y-2">
                  {ROLES.filter(r => {
                    if (callerRole === 'agency_admin') return r.key !== 'super_admin';
                    return true;
                  }).map(r => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setEditRole(r.key)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        editRole === r.key
                          ? 'border-neon-purple bg-neon-purple/10'
                          : 'border-dark-600 hover:border-dark-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{r.icon}</span>
                        <span className={`font-semibold text-sm ${r.color}`}>{r.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditMember(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
