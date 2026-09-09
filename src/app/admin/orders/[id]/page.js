'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { Package } from 'lucide-react';
import { FiArrowLeft, FiSend, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';

const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const paymentStatusOptions = ['pending', 'paid', 'failed', 'refunded'];
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [address, setAddress] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      if (res.ok) {
        setOrder(data.order);
        setItems(data.items || []);
        setHistory(data.history || []);
        setAddress(data.address);
        setCustomer(data.customer);
        setNewStatus(data.order.status);
        setNewPaymentStatus(data.order.paymentStatus || 'pending');
      }
    } catch {}
    setLoading(false);
  }

  async function handleAdminAction(actionType, extraData = {}) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason,
          ...extraData,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Action executed successfully');
        setActionReason('');
        fetchOrder();
      } else {
        toast.error(data.error || 'Failed to execute action');
      }
    } catch {
      toast.error('Network error');
    }
    setUpdating(false);
  }

  if (loading) return <div className="h-40 shimmer rounded-md" />;
  if (!order) return <p className="text-warm-500 text-[11px]">Order not found</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Link href="/admin/orders" className="p-1.5 hover:bg-warm-100 rounded-md">
            <FiArrowLeft className="w-4 h-4 text-warm-600" />
          </Link>
          <h1 className="text-base font-bold text-warm-900">Order #{order.id.slice(0, 8)}</h1>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full capitalize ${statusColors[order.status]}`}>
            {order.status}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-50 text-brand-700 uppercase">
            Payment: {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Return Request Banner / Action Panel */}
      {order.returnStatus === 'requested' && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md mb-4">
          <h3 className="font-bold text-amber-900 text-[12px] mb-1">Return / Refund Requested by Customer</h3>
          <p className="text-[11px] text-amber-700 mb-2">Reason: {order.returnReason || 'No reason provided'}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAdminAction('approve_return')}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[11px] font-bold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <FiCheck className="w-3.5 h-3.5" /> Approve Return & Refund Stock
            </button>
            <button
              onClick={() => handleAdminAction('reject_return')}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <FiX className="w-3.5 h-3.5" /> Reject Return
            </button>
          </div>
        </div>
      )}

      {/* Cancellation Banner */}
      {order.status === 'cancelled' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-[11px] mb-4">
          <p className="font-bold">Order Cancelled</p>
          {order.cancelReason && <p className="text-[10px] mt-0.5">Reason: {order.cancelReason}</p>}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Items */}
        <div className="p-3.5 bg-white rounded-md border border-warm-100">
          <h2 className="font-semibold text-warm-900 text-[13px] mb-3">Items</h2>
          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.id} className="flex gap-2.5">
                <div className="w-10 h-10 rounded-md bg-warm-50 shrink-0 relative overflow-hidden">
                  {item.productImage?.[0] ? (
                    <Image src={item.productImage[0]} alt="" fill className="object-cover" sizes="40px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-warm-400"><Package className="w-4 h-4" /></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-warm-900">{item.productName || 'Product'}</p>
                  <p className="text-[10px] text-warm-500">
                    Qty: {item.quantity} × {formatCurrency(item.priceAtPurchase)}
                  </p>
                  {item.productLink && (
                    <a
                      href={item.productLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-brand-600 font-bold hover:underline mt-0.5"
                    >
                      Supplier Link ↗
                    </a>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-warm-900">
                  ${(item.quantity * Number(item.priceAtPurchase)).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-warm-100 mt-3 pt-2.5 space-y-1 text-[10px] text-warm-600">
            <div className="flex justify-between">
              <span>Payment Method</span>
              <span className="font-bold uppercase text-warm-900">{order.paymentMethod}</span>
            </div>
            {Number(order.shippingCharge) > 0 && (
              <div className="flex justify-between">
                <span>Shipping Fee</span>
                <span>${order.shippingCharge}</span>
              </div>
            )}
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({order.couponCode})</span>
                <span>-${order.discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px] font-bold text-warm-900 border-t border-warm-100 pt-1.5">
              <span>Total Amount</span>
              <span>${order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Action Controls + Details */}
        <div className="space-y-4">
          {/* Status Updates */}
          <div className="p-3.5 bg-white rounded-md border border-warm-100">
            <h2 className="font-semibold text-warm-900 text-[13px] mb-3">Manage Order Status</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-warm-600 uppercase mb-1">Order Status</label>
                <div className="flex gap-1.5">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none bg-white capitalize"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAdminAction('update_status', { status: newStatus })}
                    disabled={updating}
                    className="px-3 py-1.5 bg-brand-500 text-white text-[10px] font-bold rounded-md hover:bg-brand-600 disabled:opacity-50"
                  >
                    Save Status
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-600 uppercase mb-1">Payment Status</label>
                <div className="flex gap-1.5">
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none bg-white capitalize"
                  >
                    {paymentStatusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAdminAction('update_payment_status', { paymentStatus: newPaymentStatus })}
                    disabled={updating}
                    className="px-3 py-1.5 bg-warm-900 text-white text-[10px] font-bold rounded-md hover:bg-warm-800 disabled:opacity-50"
                  >
                    Save Payment
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-600 uppercase mb-1">Action Note / Reason</label>
                <input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Optional note sent in email"
                  className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none focus:border-brand-400"
                />
              </div>
            </div>
          </div>

          {/* Customer Details */}
          {customer && (
            <div className="p-3.5 bg-white rounded-md border border-warm-100 space-y-1">
              <h2 className="font-semibold text-warm-900 text-[13px] mb-1.5 flex items-center justify-between">
                <span>Customer Contact Details</span>
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-[10px] text-brand-600 font-bold hover:underline"
                  >
                    Call Customer 📞
                  </a>
                )}
              </h2>
              <p className="text-[11px] font-bold text-warm-900">{customer.name}</p>
              <p className="text-[11px] text-warm-600">
                Email: <a href={`mailto:${customer.email}`} className="text-brand-600 hover:underline">{customer.email}</a>
              </p>
              {customer.phone ? (
                <p className="text-[11px] text-warm-700">Phone: <span className="font-mono font-semibold">{customer.phone}</span></p>
              ) : (
                <p className="text-[10px] text-warm-400">Phone: Not provided in profile</p>
              )}
            </div>
          )}

          {/* Delivery Address */}
          {address && (
            <div className="p-3.5 bg-white rounded-md border border-warm-100">
              <h2 className="font-semibold text-warm-900 text-[13px] mb-1.5">Delivery Address</h2>
              <p className="text-[11px] text-warm-700">{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
              <p className="text-[11px] text-warm-500">
                {address.city}, {address.state} — {address.pincode}
              </p>
              {address.phone && <p className="text-[10px] text-warm-400 mt-0.5">Phone: {address.phone}</p>}
            </div>
          )}

          {/* Timeline */}
          {history.length > 0 && (
            <div className="p-3.5 bg-white rounded-md border border-warm-100">
              <h2 className="font-semibold text-warm-900 text-[13px] mb-3">Timeline</h2>
              <div className="space-y-2.5">
                {history.map((h) => (
                  <div key={h.id} className="flex gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-1 shrink-0" />
                    <div>
                      <p className="text-[11px] font-medium text-warm-900 capitalize">{h.status}</p>
                      {h.note && <p className="text-[10px] text-warm-500">{h.note}</p>}
                      <p className="text-[10px] text-warm-400">{new Date(h.changedAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}