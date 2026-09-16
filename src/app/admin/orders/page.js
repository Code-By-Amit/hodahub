'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import CustomSelect from '@/components/ui/CustomSelect';

import { formatCurrency } from '@/lib/utils';

const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'payment_pending', label: 'Payment Pending' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchOrders(); }, [pagination.page, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/orders?${params}`); const data = await res.json();
      setOrders(data.orders || []); setPagination(data.pagination || pagination);
    } catch {} setLoading(false);
  }

  async function handleMarkPaid(e, orderId) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_payment_status', paymentStatus: 'paid' }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-warm-900 tracking-tight">Orders</h1>
        <div className="w-40">
          <CustomSelect
            options={statusOptions}
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setPagination({ ...pagination, page: 1 }); }}
            placeholder="All Statuses"
          />
        </div>
      </div>

      <div className="bg-white rounded-md border border-warm-200 shadow-xs overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/70 border-b border-warm-200 text-warm-600 text-[10px] uppercase tracking-wider font-semibold">
              <th className="px-3 py-2.5 text-left">Order ID</th>
              <th className="px-3 py-2.5 text-left">Customer</th>
              <th className="px-3 py-2.5 text-left">Amount</th>
              <th className="px-3 py-2.5 text-left">Status</th>
              <th className="px-3 py-2.5 text-left">Date</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-warm-400 text-[11px]">Loading orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-warm-400 text-[11px]">No orders found.</td></tr>
            ) : orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => router.push(`/admin/orders/${o.id}`)}
                className="hover:bg-warm-50/50 transition-colors cursor-pointer"
              >
                <td className="px-3 py-2.5 font-mono text-[10px] text-warm-900 font-medium">{o.id.slice(0,8)}</td>
                <td className="px-3 py-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-warm-900 font-medium text-[11px]">
                        {o.userName || o.guestName || 'Guest Customer'}
                      </p>
                      {!o.userName && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-purple-100 text-purple-800 uppercase">
                          Guest
                        </span>
                      )}
                    </div>
                    <p className="text-warm-400 text-[10px]">{o.userEmail || o.guestEmail}</p>
                    {(o.userPhone || o.guestPhone) && (
                      <p className="text-warm-500 text-[10px] font-mono">📞 {o.userPhone || o.guestPhone}</p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-bold text-warm-900">{formatCurrency(o.totalAmount)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${statusColors[o.status] || 'bg-warm-100 text-warm-600'}`}>
                      {o.status}
                    </span>
                    {o.paymentStatus === 'pending' ? (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-900 uppercase border border-amber-300">
                        Payment Pending ({o.paymentMethod || 'COD'})
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800 uppercase border border-emerald-300">
                        Paid ({o.paymentMethod || 'Online'})
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-warm-500 text-[10px]">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {o.paymentMethod?.toLowerCase() === 'cod' && o.paymentStatus !== 'paid' && o.status !== 'cancelled' && (
                      <button
                        onClick={(e) => handleMarkPaid(e, o.id)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded transition-colors"
                        title="Mark COD Cash Collected as Paid"
                      >
                        Mark Paid
                      </button>
                    )}
                    <span className="text-warm-900 font-semibold text-[10px] hover:underline">
                      Details →
                    </span>
                  </div>
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