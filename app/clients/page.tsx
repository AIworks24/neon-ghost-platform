'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Client } from '@/types';
import { formatDate } from '@/lib/utils';
import Breadcrumb from '@/components/layout/Breadcrumb';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Clients</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Clients' }]} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Clients</h1>
          <p className="text-gray-400">Manage your client accounts and brand guidelines</p>
        </div>
        <Link href="/clients/new" className="btn-primary">
          ➕ Add New Client
        </Link>
      </div>

      {/* Search */}
      <div className="card">
        <input
          type="text"
          placeholder="Search clients by name or industry..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Total Clients</p>
          <p className="text-3xl font-bold gradient-text">{clients.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Active This Month</p>
          <p className="text-3xl font-bold gradient-text">{clients.length}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">New This Month</p>
          <p className="text-3xl font-bold gradient-text">
            {clients.filter(c => {
              const created = new Date(c.created_at);
              const now = new Date();
              return created.getMonth() === now.getMonth();
            }).length}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Industries</p>
          <p className="text-3xl font-bold gradient-text">
            {new Set(clients.map(c => c.industry).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Client Grid */}
      {filteredClients.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-bold mb-2">No Clients Yet</h3>
          <p className="text-gray-400 mb-6">
            {searchTerm
              ? 'No clients match your search.'
              : 'Get started by adding your first client.'}
          </p>
          {!searchTerm && (
            <Link href="/clients/new" className="btn-primary inline-block">
              Add Your First Client
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="card-neon hover:scale-105 transition-transform cursor-pointer"
            >
              {/* Client Logo/Initial */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-gradient-neon rounded-lg flex items-center justify-center">
                  {client.logo_url ? (
                    <img
                      src={client.logo_url}
                      alt={client.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-white font-bold text-2xl">
                      {client.name[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {client.industry && (
                  <span className="badge bg-neon-purple/20 text-neon-purple">
                    {client.industry}
                  </span>
                )}
              </div>

              {/* Client Info */}
              <h3 className="text-xl font-bold mb-2">{client.name}</h3>
              
              {client.website && (
                <p className="text-sm text-gray-400 mb-2 truncate">
                  🌐 {client.website}
                </p>
              )}

              {client.notes && (
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {client.notes}
                </p>
              )}

              {/* Brand Guidelines Indicator */}
              <div className="flex items-center gap-2 text-xs">
                {client.brand_guidelines_text || client.brand_guidelines_url ? (
                  <span className="badge bg-green-500/20 text-green-400">
                    ✓ Brand Guidelines
                  </span>
                ) : (
                  <span className="badge bg-gray-500/20 text-gray-400">
                    ⚠ No Guidelines
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-dark-600 text-xs text-gray-500">
                Added {formatDate(client.created_at)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}