'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser, selectAuthLoading } from '@/lib/store/authSlice';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { formatCurrency } from '@/lib/utils';
import { FiPackage, FiChevronRight } from 'react-icons/fi';

const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  packed: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

export default function OrdersPage() {
  const user = useSelector(selectUser);
  const authLoading = useSelector(selectAuthLoading);
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchOrders();
  }, [user, authLoading]);

  async function fetchOrders() {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
    } catch {}
    setLoading(false);
  }

  if (loading || authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'My Orders' }]} />

      <h1 className="text-2xl font-bold text-warm-900 tracking-tight mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-warm-200 p-8 shadow-xs">
          <FiPackage className="w-12 h-12 text-warm-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-warm-900 mb-1">No orders yet</h3>
          <p className="text-warm-500 text-sm mb-6">Start shopping to see your orders here.</p>
          <Link href="/products" className="inline-flex items-center px-5 py-2.5 bg-warm-900 text-white text-sm font-medium rounded-lg hover:bg-warm-800 transition-colors">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block p-5 bg-white rounded-xl border border-warm-200 hover:border-warm-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-warm-500 mb-1">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-base font-bold text-warm-900">{formatCurrency(order.totalAmount)}</p>
                  <p className="text-xs text-warm-500 mt-1">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[order.status] || 'bg-warm-100 text-warm-600'}`}>
                    {order.status}
                  </span>
                  <FiChevronRight className="w-4 h-4 text-warm-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
