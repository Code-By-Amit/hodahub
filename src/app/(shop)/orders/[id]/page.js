'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/store/authSlice';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { formatCurrency } from '@/lib/utils';
import { Frown, Package } from 'lucide-react';
import Script from 'next/script';
import {
  FiPackage,
  FiCheck,
  FiTruck,
  FiMapPin,
  FiPrinter,
  FiXCircle,
  FiRotateCcw,
  FiCreditCard,
} from 'react-icons/fi';

const statusSteps = ['pending', 'confirmed', 'shipped', 'delivered'];
const statusIcons = { pending: FiPackage, confirmed: FiCheck, shipped: FiTruck, delivered: FiMapPin };

export default function OrderDetailPage() {
  const { id } = useParams();
  const user = useSelector(selectUser);
  const router = useRouter();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals & Action States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returning, setReturning] = useState(false);

  const [retryingPayment, setRetryingPayment] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      setRazorpayLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchOrder();
  }, [user, id]);

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (res.ok) {
        setOrder(data.order);
        setItems(data.items || []);
        setHistory(data.history || []);
        setAddress(data.address);
      }
    } catch {}
    setLoading(false);
  }

  async function handleCancelOrder(e) {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Order cancelled!');
        setShowCancelModal(false);
        fetchOrder();
      } else {
        toast.error(data.error || 'Failed to cancel order');
      }
    } catch {
      toast.error('Network error');
    }
    setCancelling(false);
  }

  async function handleReturnOrder(e) {
    e.preventDefault();
    if (!returnReason.trim()) {
      toast.error('Please provide a return reason');
      return;
    }
    setReturning(true);
    try {
      const res = await fetch(`/api/orders/${id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: returnReason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Return request submitted!');
        setShowReturnModal(false);
        fetchOrder();
      } else {
        toast.error(data.error || 'Failed to submit return');
      }
    } catch {
      toast.error('Network error');
    }
    setReturning(false);
  }

  const isPaymentEligibleForRetry =
    order?.paymentMethod === 'razorpay' &&
    order?.paymentStatus === 'pending' &&
    order?.status !== 'cancelled';

  async function handleRetryPayment() {
    setRetryingPayment(true);
    try {
      const res = await fetch(`/api/payment/retry/${order.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to start payment retry');
        setRetryingPayment(false);
        return;
      }

      const options = {
        key: data.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: 'INR',
        name: 'HodaHub',
        description: `Payment for Order #${order.id.slice(0, 8)}`,
        order_id: data.razorpayOrderId,
        handler: async function (response) {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: order.id,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              toast.success('Payment successful!');
              fetchOrder();
            } else {
              toast.error(verifyData.error || 'Payment verification failed');
            }
          } catch {
            toast.error('Payment verification error');
          }
          setRetryingPayment(false);
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#18181b' },
        modal: {
          ondismiss: () => {
            toast.warning('Payment window closed');
            setRetryingPayment(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setRetryingPayment(false);
      });
      rzp.open();
    } catch {
      toast.error('Error opening payment window');
      setRetryingPayment(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="h-40 rounded-md shimmer" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Frown className="w-10 h-10 mx-auto text-warm-300 mb-3" />
        <h2 className="text-base font-bold text-warm-900 mb-2">Order not found</h2>
        <Link href="/orders" className="text-warm-900 text-[11px] font-semibold hover:underline">
          Back to orders →
        </Link>
      </div>
    );
  }

  const currentStepIndex = statusSteps.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'My Orders', href: '/orders' },
          { label: `Order #${order.id.slice(0, 8)}` },
        ]}
      />

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-base font-bold text-warm-900 tracking-tight">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-[10px] text-warm-500 mt-0.5">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPaymentEligibleForRetry && (
            <button
              onClick={handleRetryPayment}
              disabled={retryingPayment || !razorpayLoaded}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors shadow-xs disabled:opacity-60"
            >
              <FiCreditCard className="w-3.5 h-3.5 text-amber-400" />
              {retryingPayment ? 'Opening Payment...' : 'Pay Now'}
            </button>
          )}

          <Link
            href={`/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-warm-200 text-warm-800 text-[11px] font-semibold rounded-md hover:bg-warm-50 transition-colors shadow-xs"
          >
            <FiPrinter className="w-3.5 h-3.5 text-warm-600" /> Printable Invoice
          </Link>

          {(order.status === 'pending' || order.status === 'confirmed') && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-md hover:bg-rose-100 transition-colors"
            >
              <FiXCircle className="w-3.5 h-3.5" /> Cancel Order
            </button>
          )}

          {order.status === 'delivered' && order.returnStatus === 'none' && (
            <button
              onClick={() => setShowReturnModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold rounded-md hover:bg-amber-100 transition-colors"
            >
              <FiRotateCcw className="w-3.5 h-3.5" /> Request Return
            </button>
          )}
        </div>
      </div>

      {/* Return Status Banner */}
      {order.returnStatus !== 'none' && (
        <div className={`p-3 rounded-md border text-[11px] font-medium mb-4 flex items-center justify-between ${
          order.returnStatus === 'requested' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          order.returnStatus === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div>
            <p className="font-bold text-[10px] uppercase tracking-wider">Return Status: {order.returnStatus}</p>
            {order.returnReason && <p className="text-[10px] mt-1 text-warm-700">Reason: {order.returnReason}</p>}
          </div>
        </div>
      )}

      {/* Payment Retry Banner */}
      {isPaymentEligibleForRetry && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-amber-900 text-[11px]">Payment Pending for Order #{order.id.slice(0, 8)}</h3>
            <p className="text-[10px] text-amber-700 mt-0.5">
              Your order is placed, but online payment is incomplete. Click &quot;Complete Payment&quot; below to finish paying via Razorpay.
            </p>
          </div>
          <button
            onClick={handleRetryPayment}
            disabled={retryingPayment || !razorpayLoaded}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-bold rounded-md hover:bg-warm-800 transition-colors shrink-0 disabled:opacity-60 shadow-xs"
          >
            <FiCreditCard className="w-3.5 h-3.5 text-amber-400" />
            {retryingPayment ? 'Opening Payment...' : `Complete Payment (${formatCurrency(order.totalAmount)})`}
          </button>
        </div>
      )}

      {/* Status Timeline */}
      {order.status !== 'cancelled' && (
        <div className="p-4 bg-white rounded-md border border-warm-200 shadow-xs mb-4">
          <h2 className="text-[13px] font-bold text-warm-900 mb-5">Order Status</h2>
          <div className="flex items-center justify-between relative px-2">
            <div className="absolute top-4 left-8 right-8 h-0.5 bg-warm-200" />
            <div
              className="absolute top-4 left-8 h-0.5 bg-warm-900 transition-all"
              style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 88}%` }}
            />

            {statusSteps.map((step, i) => {
              const Icon = statusIcons[step];
              const isCompleted = i <= currentStepIndex;
              return (
                <div key={step} className="relative flex flex-col items-center z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted ? 'bg-warm-900 text-white' : 'bg-warm-100 text-warm-400 border border-warm-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 capitalize font-semibold ${
                      isCompleted ? 'text-warm-900' : 'text-warm-400'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-[11px] font-medium mb-4">
          <p className="font-bold">This order has been cancelled.</p>
          {order.cancelReason && <p className="mt-0.5">Reason: {order.cancelReason}</p>}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Order Items */}
        <div className="p-4 bg-white rounded-md border border-warm-200 shadow-xs">
          <h2 className="text-[13px] font-bold text-warm-900 mb-3 pb-2 border-b border-warm-100">Ordered Items</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="w-14 h-14 rounded-md overflow-hidden bg-warm-50 shrink-0 relative border border-warm-200">
                  {item.productImage?.[0] ? (
                    <Image src={item.productImage[0]} alt="" fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-warm-300"><Package className="w-5 h-5" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="text-[11px] font-medium text-warm-900 hover:underline line-clamp-1"
                  >
                    {item.productName || 'Product'}
                  </Link>
                  <p className="text-[10px] text-warm-500 mt-0.5">
                    Qty: {item.quantity} × {formatCurrency(item.priceAtPurchase)}
                  </p>
                  <p className="text-[11px] font-semibold text-warm-900 mt-1">
                    {formatCurrency(item.quantity * Number(item.priceAtPurchase))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary + Address */}
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-md border border-warm-200 shadow-xs">
            <h2 className="text-[13px] font-bold text-warm-900 mb-3 pb-2 border-b border-warm-100">Summary</h2>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-warm-500">Order ID</span>
                <span className="text-warm-900 font-mono text-[10px]">{order.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-500">Date</span>
                <span className="text-warm-900">{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-500">Payment Method</span>
                <span className="text-warm-900 uppercase font-semibold text-[10px]">
                  {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-500">Payment Status</span>
                <span className="font-semibold uppercase text-[10px] text-warm-900">{order.paymentStatus}</span>
              </div>
              {order.couponCode && (
                <div className="flex justify-between">
                  <span className="text-warm-500">Coupon</span>
                  <span className="text-emerald-700 font-semibold">{order.couponCode}</span>
                </div>
              )}
              {Number(order.shippingCharge) > 0 && (
                <div className="flex justify-between">
                  <span className="text-warm-500">Shipping</span>
                  <span className="text-warm-900">{formatCurrency(order.shippingCharge)}</span>
                </div>
              )}
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-warm-500">Discount</span>
                  <span className="text-emerald-700">-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-warm-200 pt-2 font-bold text-[13px] text-warm-900">
                <span>Total Amount</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {address && (
            <div className="p-4 bg-white rounded-md border border-warm-200 shadow-xs">
              <h2 className="text-[13px] font-bold text-warm-900 mb-2 pb-2 border-b border-warm-100">Delivery Address</h2>
              {address.label && (
                <p className="text-[10px] font-bold text-warm-900 uppercase tracking-wider mb-1">{address.label}</p>
              )}
              <p className="text-[11px] text-warm-800 font-medium">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
              </p>
              <p className="text-[10px] text-warm-500 mt-1">
                {address.city}, {address.state} — {address.pincode}
              </p>
            </div>
          )}
          {/* Status History */}
          {history.length > 0 && (
            <div className="p-4 bg-white rounded-md border border-warm-200 shadow-xs">
              <h2 className="text-[13px] font-bold text-warm-900 mb-3 pb-2 border-b border-warm-100">Timeline</h2>
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-warm-900 mt-1" />
                      {i < history.length - 1 && <div className="w-0.5 flex-1 bg-warm-200 mt-1" />}
                    </div>
                    <div className="pb-2">
                      <p className="text-[10px] font-bold text-warm-900 capitalize">{h.status}</p>
                      {h.note && <p className="text-[10px] text-warm-500 mt-0.5">{h.note}</p>}
                      <p className="text-[10px] text-warm-400 mt-0.5">{new Date(h.changedAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Order Modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Order">
        <form onSubmit={handleCancelOrder} className="space-y-3">
          <p className="text-[11px] text-warm-600">
            Are you sure you want to cancel Order #{order.id.slice(0, 8)}? Items will be returned to stock.
          </p>
          <div>
            <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
              Reason for Cancellation *
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="e.g. Changed my mind, ordered by mistake"
              className="w-full px-3 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="px-3 py-1.5 border border-warm-200 text-[11px] font-semibold rounded-md text-warm-700 hover:bg-warm-100 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={cancelling}
              className="px-3 py-1.5 bg-rose-600 text-white text-[11px] font-semibold rounded-md hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Return Modal */}
      <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="Request Return / Refund">
        <form onSubmit={handleReturnOrder} className="space-y-3">
          <p className="text-[11px] text-warm-600">
            Submit a return request for Order #{order.id.slice(0, 8)}. Our team will review your request.
          </p>
          <div>
            <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
              Reason for Return *
            </label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={3}
              placeholder="e.g. Defective product, wrong item delivered"
              className="w-full px-3 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowReturnModal(false)}
              className="px-3 py-1.5 border border-warm-200 text-[11px] font-semibold rounded-md text-warm-700 hover:bg-warm-100 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={returning}
              className="px-3 py-1.5 bg-amber-600 text-white text-[11px] font-semibold rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {returning ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayLoaded(true)} />
    </div>
  );
}