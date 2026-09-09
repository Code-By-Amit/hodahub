'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import { FiCheck, FiX, FiShield, FiUser } from 'react-icons/fi';

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, [pagination.page]);

  async function fetchUsers() {
    try {
      const res = await fetch(`/api/admin/users?page=${pagination.page}`);
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination || pagination);
    } catch {}
    setLoading(false);
  }

  async function toggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'customer' : 'admin';
    if (!confirm(`Change user role to ${newRole}?`)) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        toast.success('Role updated successfully');
        fetchUsers();
      }
    } catch {
      toast.error('Error updating user role');
    }
  }

  return (
    <div>
      <h1 className="text-base font-bold text-warm-900 tracking-tight mb-4">Users</h1>

      <div className="bg-white rounded-md border border-warm-200 shadow-xs overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/70 border-b border-warm-200 text-warm-600 text-[10px] uppercase tracking-wider font-semibold">
              <th className="px-3 py-2.5 text-left">User</th>
              <th className="px-3 py-2.5 text-left">Email</th>
              <th className="px-3 py-2.5 text-left">Role</th>
              <th className="px-3 py-2.5 text-left">Verified</th>
              <th className="px-3 py-2.5 text-left">Joined</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-warm-400 text-[11px]">Loading users...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-warm-50/50 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-warm-900 text-white flex items-center justify-center text-[10px] font-bold">
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="font-semibold text-warm-900 text-[11px]">{u.name || '—'}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-warm-500 text-[11px]">{u.email}</td>
                <td className="px-3 py-2.5">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-warm-900 text-white' : 'bg-warm-100 text-warm-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {u.isVerified ? <FiCheck className="text-emerald-600 w-3.5 h-3.5" /> : <FiX className="text-rose-400 w-3.5 h-3.5" />}
                </td>
                <td className="px-3 py-2.5 text-warm-500 text-[11px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => toggleRole(u.id, u.role)}
                    className="px-2.5 py-1 border border-warm-200 rounded-md text-[10px] font-semibold text-warm-700 hover:bg-warm-100 transition-colors"
                    title="Toggle role"
                  >
                    {u.role === 'admin' ? <FiUser className="w-3 h-3 inline mr-1" /> : <FiShield className="w-3 h-3 inline mr-1" />}
                    {u.role === 'admin' ? 'Make Customer' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => setPagination({ ...pagination, page: p })} />
        </div>
      )}
    </div>
  );
}