'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FiPrinter, FiArrowLeft } from 'react-icons/fi';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function InvoicePage() {
  const { id } = useParams();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();
        if (res.ok) setOrderData(data);
      } catch {}
      setLoading(false);
    }
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-warm-500 text-[11px]">Generating invoice...</p>
      </div>
    );
  }

  if (!orderData || !orderData.order) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <h2 className="text-base font-bold text-warm-900 mb-2">Invoice Not Found</h2>
        <Link href="/orders" className="text-brand-600 hover:underline text-[11px]">
          Return to Orders
        </Link>
      </div>
    );
  }

  const { order, items = [], address } = orderData;
  const shippingInfo = address || order.shippingAddress;
  const guestName = order.guestName;
  const guestEmail = order.guestEmail;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subtotal = Number(order.totalAmount) - Number(order.shippingCharge || 0) + Number(order.discountAmount || 0);

  return (
    <div className="min-h-screen bg-warm-50 py-6 px-4 sm:px-6 print:py-0 print:px-0 print:bg-white print:min-h-0">
      {/* Action buttons (hidden on print) */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link
          href={order.userId ? `/orders/${order.id}` : '/products'}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-warm-600 hover:text-warm-900"
        >
          <FiArrowLeft className="w-3.5 h-3.5" /> {order.userId ? 'Back to Order' : 'Back to Shop'}
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md shadow-md hover:bg-warm-800 transition-all cursor-pointer"
        >
          <FiPrinter className="w-3.5 h-3.5" /> Print / Save PDF
        </button>
      </div>

      {/* Invoice Card */}
      <div className="print-container max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-md border border-warm-200 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex flex-row justify-between items-start gap-4 pb-6 border-b border-warm-200">
          <div>
            <h1 className="text-xl font-extrabold text-warm-900 tracking-tight">
              Hoda<span className="text-brand-500">Hub</span>
            </h1>
            <p className="text-[11px] text-warm-500 mt-1">Official Purchase Invoice</p>
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold text-warm-900">INVOICE</h2>
            <p className="text-[10px] text-warm-500 mt-1 font-mono">#{order.id}</p>
            <p className="text-[10px] text-warm-500 mt-1">Date: {formattedDate}</p>
          </div>
        </div>

        {/* Bill To & Payment Info - STRICT INLINE FLEXBOX (Guaranteed Side-by-Side in all print engines) */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: '24px' }} className="py-6 border-b border-warm-200 text-[11px]">
          <div style={{ width: '48%', flex: '1 1 0%' }}>
            <h3 className="font-bold text-warm-900 uppercase tracking-wider text-[10px] mb-2">Billed To</h3>
            {guestName || guestEmail ? (
              <div className="text-warm-700 space-y-1">
                <p className="font-semibold text-brand-600">{guestName || 'Guest Customer'}</p>
                <p className="text-warm-500">{guestEmail}</p>
                {shippingInfo && (
                  <>
                    <p>{shippingInfo.line1}</p>
                    {shippingInfo.line2 && <p>{shippingInfo.line2}</p>}
                    <p>{shippingInfo.city}, {shippingInfo.state} — {shippingInfo.pincode}</p>
                    {shippingInfo.phone && <p>Phone: {shippingInfo.phone}</p>}
                  </>
                )}
              </div>
            ) : shippingInfo ? (
              <div className="text-warm-700 space-y-1">
                <p className="font-semibold text-brand-600">{order.userName || shippingInfo.label || 'Valued Customer'}</p>
                <p>{shippingInfo.line1}</p>
                {shippingInfo.line2 && <p>{shippingInfo.line2}</p>}
                <p>{shippingInfo.city}, {shippingInfo.state} — {shippingInfo.pincode}</p>
                {shippingInfo.phone && <p>Phone: {shippingInfo.phone}</p>}
              </div>
            ) : (
              <p className="text-warm-400">Address info unavailable</p>
            )}
          </div>
          <div style={{ width: '48%', flex: '1 1 0%' }}>
            <h3 className="font-bold text-warm-900 uppercase tracking-wider text-[10px] mb-2">Payment Details</h3>
            <div className="text-warm-700 space-y-1">
              <p>Method: <strong className="uppercase">{order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay'}</strong></p>
              <p>Payment Status: <span className="font-semibold uppercase text-brand-600">{order.paymentStatus}</span></p>
              <p>Order Status: <span className="font-semibold uppercase">{order.status}</span></p>
              {order.razorpayPaymentId && <p className="font-mono text-[10px] text-warm-500">Payment ID: {order.razorpayPaymentId}</p>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6 border-b border-warm-200">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-warm-500 uppercase text-[10px]">
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 text-center font-semibold">Qty</th>
                <th className="pb-2 text-right font-semibold">Price</th>
                <th className="pb-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {items.map((item) => {
                const unitPrice = Number(item.priceAtPurchase);
                const itemTotal = unitPrice * item.quantity;
                return (
                  <tr key={item.id}>
                    <td className="py-2.5 text-warm-900 font-medium">{item.productName || 'Product'}</td>
                    <td className="py-2.5 text-center text-warm-600">{item.quantity}</td>
                    <td className="py-2.5 text-right text-warm-600">{formatCurrency(unitPrice)}</td>
                    <td className="py-2.5 text-right font-bold text-warm-900">{formatCurrency(itemTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="pt-4 flex flex-col items-end text-[11px] space-y-1.5">
          <div className="flex justify-between w-56 text-warm-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {Number(order.discountAmount) > 0 && (
            <div className="flex justify-between w-56 text-green-600">
              <span>Discount ({order.couponCode})</span>
              <span>-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between w-56 text-warm-600">
            <span>Shipping</span>
            <span>{Number(order.shippingCharge) > 0 ? formatCurrency(order.shippingCharge) : 'FREE'}</span>
          </div>
          <div className="flex justify-between w-56 text-sm font-bold text-warm-900 pt-2 border-t border-warm-200">
            <span>Grand Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-warm-200 text-center text-[10px] text-warm-400">
          <p>Thank you for shopping at HodaHub!</p>
          <p className="mt-1">For support or inquiries, contact us at support@hodahub.com</p>
        </div>
      </div>
    </div>
  );
}