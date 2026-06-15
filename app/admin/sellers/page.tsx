'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';
import type { Seller } from '@/lib/supabase-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, XCircle, Loader2, Users, Edit, Trash2, AlertTriangle } from 'lucide-react';

const FILTER_TABS = ['all', 'pending', 'approved', 'rejected'] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      const response = await authFetch('/api/admin/sellers');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load sellers');
      }
      const data = await response.json();
      setSellers(data.sellers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveReject = async (sellerId: string, approve: boolean) => {
    setActionLoading(sellerId);
    setError(null);
    try {
      const response = await authFetch('/api/admin/approve-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, approve }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update seller');
      }
      loadSellers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSeller = (seller: Seller) => {
    setEditingSeller(seller);
  };

  const handleSaveSeller = async (updatedSeller: Partial<Seller>) => {
    if (!editingSeller) return;
    
    setActionLoading(editingSeller.id);
    setError(null);
    try {
      const response = await authFetch('/api/admin/update-seller', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId: editingSeller.id, ...updatedSeller }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update seller');
      }
      loadSellers();
      setEditingSeller(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSeller = async (sellerId: string, sellerEmail: string) => {
    // Confirm deletion
    const confirmed = confirm(
      `⚠️ WARNING: This will permanently delete seller ${sellerEmail} and ALL associated data including:\n\n` +
      `• Stream sessions\n` +
      `• Products\n` +
      `• Platform connections\n` +
      `• Sales records\n` +
      `• Referrals\n` +
      `• User account\n\n` +
      `This action cannot be undone. Are you sure?`
    );

    if (!confirmed) return;

    setActionLoading(sellerId);
    setError(null);
    try {
      const response = await authFetch('/api/admin/delete-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete seller');
      }
      
      loadSellers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSellers = sellers.filter((s) => {
    const matchesSearch = searchTerm === '' || 
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.includes(searchTerm) ||
      s.approval_status?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return filter === 'all' 
      ? matchesSearch
      : s.approval_status === filter && matchesSearch;
  });

  const counts = {
    all: sellers.length,
    pending: sellers.filter((s) => s.approval_status === 'pending').length,
    approved: sellers.filter((s) => s.approval_status === 'approved').length,
    rejected: sellers.filter((s) => s.approval_status === 'rejected').length,
  };

  const getApprovalPill = (status: string) => {
    switch (status) {
      case 'approved': return <span className="pill pill-approved">Approved</span>;
      case 'pending':  return <span className="pill pill-pending">Pending</span>;
      case 'rejected': return <span className="pill pill-suspended">Rejected</span>;
      default:         return <span className="pill" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent-primary)' }}>{status}</span>;
    }
  };

  const getStripePill = (status: string) => {
    switch (status) {
      case 'active':  return <span className="pill pill-success">Active</span>;
      case 'pending': return <span className="pill pill-pending">Pending</span>;
      default:        return <span className="pill pill-suspended">{status || 'N/A'}</span>;
    }
  };

  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(124,58,237,0.12)] flex items-center justify-center">
            <Users className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sellers Management</h2>
            <p className="text-xs text-[var(--text-muted)]">{sellers.length} total sellers</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search sellers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium pl-10 pr-4 w-64"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg border border-[var(--accent-danger)] bg-[rgba(239,68,68,0.08)] text-[var(--accent-danger)] text-sm">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] w-fit">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
              filter === tab
                ? 'bg-[var(--accent-primary)] text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <span className="capitalize">{tab}</span>
            <span
              className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
                filter === tab ? 'bg-white/20 text-white' : 'bg-[var(--bg-raised)] text-[var(--text-muted)]'
              }`}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="card-premium !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-default)] hover:bg-transparent">
                {['Seller', 'Phone', 'Stripe', 'Approval', 'Joined', 'Actions'].map((h) => (
                  <TableHead
                    key={h}
                    className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-raised)] font-medium px-5 py-3"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    {/* Empty state */}
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-xl bg-[rgba(124,58,237,0.12)] flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-[var(--accent-primary)]" />
                      </div>
                      <p className="text-base font-semibold text-[var(--text-primary)] mb-1">No sellers found</p>
                      <p className="text-sm text-[var(--text-muted)]">Try a different filter tab above.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSellers.map((seller) => (
                  <TableRow
                    key={seller.id}
                    className="border-b border-[var(--border-default)] hover:bg-[var(--row-hover)] transition-colors"
                  >
                    {/* Seller identity */}
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[rgba(124,58,237,0.15)] flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-[var(--accent-primary)]">
                            {getInitials(seller.email || 'U')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[180px]">{seller.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 text-sm text-[var(--text-secondary)]">{seller.phone || '—'}</TableCell>
                    <TableCell className="px-5">{getStripePill(seller.stripe_onboarding_status)}</TableCell>
                    <TableCell className="px-5">{getApprovalPill(seller.approval_status)}</TableCell>
                    <TableCell className="px-5 text-sm text-[var(--text-muted)]">
                      {new Date(seller.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-5">
                      <div className="flex items-center gap-2">
                        {seller.approval_status === 'pending' && (
                          <>
                            <button
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--accent-success)] text-[var(--accent-success)] hover:bg-[rgba(16,185,129,0.12)] transition-colors disabled:opacity-40"
                              title="Approve"
                              onClick={() => handleApproveReject(seller.id, true)}
                              disabled={actionLoading === seller.id}
                            >
                              {actionLoading === seller.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--accent-danger)] text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.12)] transition-colors disabled:opacity-40"
                              title="Reject"
                              onClick={() => handleApproveReject(seller.id, false)}
                              disabled={actionLoading === seller.id}
                            >
                              {actionLoading === seller.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <XCircle className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[rgba(124,58,237,0.12)] transition-colors disabled:opacity-40"
                          title="Edit"
                          onClick={() => handleEditSeller(seller)}
                          disabled={actionLoading === seller.id}
                        >
                          {actionLoading === seller.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Edit className="w-4 h-4" />}
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--accent-danger)] text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.12)] transition-colors disabled:opacity-40"
                          title="Delete Seller"
                          onClick={() => handleDeleteSeller(seller.id, seller.email)}
                          disabled={actionLoading === seller.id}
                        >
                          {actionLoading === seller.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Seller Modal */}
      {editingSeller && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-surface)] rounded-xl p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Seller</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Email</label>
                <input
                  type="email"
                  className="input-premium mt-1"
                  value={editingSeller.email || ''}
                  disabled
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Phone</label>
                <input
                  type="tel"
                  className="input-premium mt-1"
                  placeholder="Enter phone number"
                  defaultValue={editingSeller.phone || ''}
                  id="edit-phone"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Approval Status</label>
                <select 
                  className="input-premium mt-1"
                  defaultValue={editingSeller.approval_status || 'pending'}
                  id="edit-status"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Stripe Status</label>
                <select 
                  className="input-premium mt-1"
                  defaultValue={editingSeller.stripe_onboarding_status || 'pending'}
                  id="edit-stripe-status"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const phone = (document.getElementById('edit-phone') as HTMLInputElement)?.value;
                  const status = (document.getElementById('edit-status') as HTMLSelectElement)?.value;
                  const stripeStatus = (document.getElementById('edit-stripe-status') as HTMLSelectElement)?.value;
                  handleSaveSeller({
                    phone,
                    approval_status: status,
                    stripe_onboarding_status: stripeStatus
                  });
                }}
                className="btn-primary text-sm px-4 py-2"
                disabled={actionLoading === editingSeller.id}
              >
                {actionLoading === editingSeller.id ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingSeller(null)}
                className="btn-secondary text-sm px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
