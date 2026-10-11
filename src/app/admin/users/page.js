'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import UserAvatar from '@/components/ui/UserAvatar';
import DataTable from '@/components/ui/DataTable';
import ActionButton from '@/components/ui/ActionButton';
import { RoleBadge, VerifiedBadge, AuthProviderBadge } from '@/components/ui/Badges';
import useAdminUsers from '@/hooks/useAdminUsers';
import { FiSearch, FiShield, FiUser, FiX, FiPlus } from 'react-icons/fi';

export default function AdminUsersPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Add Admin modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1); // Reset page when query changes
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const {
    users,
    pagination,
    isLoading,
    isFetching,
    updateRole,
    createAdmin,
    isCreatingAdmin,
  } = useAdminUsers({
    page,
    limit: 20,
    search: debouncedSearch,
  });

  async function handleCreateAdmin(e) {
    e.preventDefault();
    if (!addForm.email || !addForm.password || addForm.password.length < 6) {
      toast.error('Valid email and password (min 6 chars) are required');
      return;
    }
    try {
      const data = await createAdmin(addForm);
      toast.success(data.message || 'Admin account created successfully!');
      setShowAddModal(false);
      setAddForm({ name: '', email: '', password: '', role: 'admin' });
    } catch (err) {
      toast.error(err.message || 'Failed to create admin user');
    }
  }

  async function handleToggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'customer' : 'admin';
    try {
      await updateRole({ userId, role: newRole });
      toast.success(`Role changed to ${newRole}`);
    } catch (err) {
      toast.error(err.message || 'Error updating user role');
    }
  }

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (_, row) => {
        const displayName =
          row.name && row.name !== 'User'
            ? row.name
            : row.phone
            ? `User (${row.phone.slice(-4)})`
            : row.email
            ? row.email.split('@')[0]
            : 'Customer';

        return (
          <div className="flex items-center gap-2.5">
            <UserAvatar name={row.name} phone={row.phone} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-warm-900 text-[11px] truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-warm-400 font-mono">
                ID: {row.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (_, row) => (
        <span className="text-warm-600 text-[11px] font-mono select-all">
          {row.email || row.phone || '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (phone) => (
        <span className="text-warm-700 text-[11px] font-mono">
          {phone || <span className="text-warm-300 font-sans">—</span>}
        </span>
      ),
    },
    {
      key: 'authProvider',
      header: 'Auth Provider',
      render: (provider) => <AuthProviderBadge provider={provider} />,
    },
    {
      key: 'role',
      header: 'Role',
      render: (role) => <RoleBadge role={role} />,
    },
    {
      key: 'isVerified',
      header: 'Verified',
      align: 'center',
      render: (verified) => <VerifiedBadge isVerified={Boolean(verified)} />,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (date) => (
        <span className="text-warm-500 text-[11px] whitespace-nowrap">
          {new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => {
        const targetRole = row.role === 'admin' ? 'customer' : 'admin';
        return (
          <ActionButton
            size="xs"
            variant="outline"
            confirmMessage={`Change ${row.name || row.email || row.phone || 'this user'} to ${targetRole}?`}
            onClick={() => handleToggleRole(row.id, row.role)}
            icon={row.role === 'admin' ? <FiUser className="w-3 h-3" /> : <FiShield className="w-3 h-3" />}
            title={`Toggle role to ${targetRole}`}
          >
            {row.role === 'admin' ? 'Make Customer' : 'Make Admin'}
          </ActionButton>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-warm-900 tracking-tight">
            User Management
          </h1>
          <p className="text-[11px] text-warm-500">
            Manage registered customers, verify identities, and manage admin roles
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-bold rounded-md hover:bg-warm-800 transition-colors cursor-pointer shadow-2xs shrink-0"
        >
          <FiPlus className="w-3.5 h-3.5" />
          <span>Add Admin Account</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-2 bg-white p-2.5 rounded-md border border-warm-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by phone, email, or name..."
            className="w-full pl-8 pr-7 py-1.5 bg-warm-50/50 border border-warm-200 rounded-md text-[11px] text-warm-900 outline-none focus:bg-white focus:border-warm-900 transition-all placeholder:text-warm-400"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <FiX className="w-3 h-3" />
            </button>
          )}
        </div>

        {isFetching && (
          <span className="text-[10px] text-warm-400 font-medium animate-pulse ml-auto sm:ml-2">
            Updating...
          </span>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        skeletonRows={8}
        emptyState={
          debouncedSearch
            ? `No users matched "${debouncedSearch}". Try a different phone or email.`
            : 'No users registered yet.'
        }
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[11px] text-warm-500 font-medium">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} users
          </span>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Add Admin Account Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-lg border border-warm-200 shadow-xl max-w-md w-full p-5 space-y-4 relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <h3 className="font-bold text-warm-900 text-sm">
                Create Admin / User Account
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-warm-400 hover:text-warm-700 p-1 rounded-md cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Admin Manager"
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 outline-none focus:border-warm-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="admin@hodahub.in"
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 outline-none focus:border-warm-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Password * (Min. 6 characters)
                </label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Set secure password"
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 outline-none focus:border-warm-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Assigned Account Role *
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 outline-none focus:border-warm-900"
                >
                  <option value="admin">Admin (Full Access)</option>
                  <option value="customer">Customer (Storefront Only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-warm-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 border border-warm-200 text-warm-600 text-[11px] font-semibold rounded-md hover:bg-warm-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAdmin}
                  className="px-4 py-1.5 bg-warm-900 text-white text-[11px] font-bold rounded-md hover:bg-warm-800 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {isCreatingAdmin ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}