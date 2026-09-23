'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { Package, Phone } from 'lucide-react';
import { FiArrowLeft, FiSend, FiCheck, FiX, FiRefreshCw, FiBox, FiCheckCircle, FiAlertTriangle, FiEdit3 } from 'react-icons/fi';
import { formatCurrency } from '@/lib/utils';

const statusOptions = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
const paymentStatusOptions = ['pending', 'paid', 'failed', 'refunded'];
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-indigo-100 text-indigo-700',
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

  // Status updates state
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  // Part 1: Packing Step State (Persists across user actions)
  const [packageWeight, setPackageWeight] = useState('');
  const [packageLength, setPackageLength] = useState('');
  const [packageWidth, setPackageWidth] = useState('');
  const [packageHeight, setPackageHeight] = useState('');
  const [packing, setPacking] = useState(false);
  const [isEditingPackage, setIsEditingPackage] = useState(false);

  // Shipment Creation State
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState(null);

  // Manual AWB State
  const [showManualAwbModal, setShowManualAwbModal] = useState(false);
  const [manualAwbNumber, setManualAwbNumber] = useState('');
  const [savingManualAwb, setSavingManualAwb] = useState(false);

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

        // Populate packing state from order data if available
        if (data.order.packageWeight) setPackageWeight(data.order.packageWeight);
        if (data.order.packageLength) setPackageLength(data.order.packageLength);
        if (data.order.packageWidth) setPackageWidth(data.order.packageWidth);
        if (data.order.packageHeight) setPackageHeight(data.order.packageHeight);

        if (data.order?.awbNumber) {
          fetchTracking(id);
        }
      }
    } catch { }
    setLoading(false);
  }

  async function fetchTracking(orderId) {
    try {
      const res = await fetch(`/api/orders/${orderId}/tracking`);
      const data = await res.json();
      if (res.ok) {
        setTrackingInfo(data);
      }
    } catch { }
  }

  // Part 1: Handle Submit Packing Details
  async function handlePackOrder(e) {
    if (e) e.preventDefault();

    if (!packageWeight || parseFloat(packageWeight) <= 0) {
      toast.error('Please enter a valid package weight in kg (e.g. 0.5)');
      return;
    }
    if (
      !packageLength ||
      !packageWidth ||
      !packageHeight ||
      parseFloat(packageLength) <= 0 ||
      parseFloat(packageWidth) <= 0 ||
      parseFloat(packageHeight) <= 0
    ) {
      toast.error('Please enter valid package dimensions in cm (Length, Width, Height)');
      return;
    }

    setPacking(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageWeight,
          packageLength,
          packageWidth,
          packageHeight,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Order packed successfully! Real shipment creation enabled.');
        setIsEditingPackage(false);
        fetchOrder();
      } else {
        toast.error(data.error || 'Failed to pack order');
      }
    } catch {
      toast.error('Network error during order packing');
    }
    setPacking(false);
  }



  // Real Shipment Creation (Uses DELHIVERY_ENV setting)
  async function handleCreateShipment() {
    if (!order?.packageWeight && (!packageWeight || !packageLength || !packageWidth || !packageHeight)) {
      toast.error('Please complete order packing first!');
      return;
    }

    setCreatingShipment(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/shipment`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Shipment created successfully! AWB: ${data.order.awbNumber}`);
        fetchOrder();
      } else {
        toast.error(data.error || 'Failed to create shipment');
      }
    } catch {
      toast.error('Network error during shipment creation');
    }
    setCreatingShipment(false);
  }

  // Handle Save Manual AWB Tracking Number
  async function handleSaveManualAwb(e) {
    if (e) e.preventDefault();
    if (!manualAwbNumber.trim()) {
      toast.error('Please enter a valid tracking/AWB number');
      return;
    }
    setSavingManualAwb(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/manual-awb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awbNumber: manualAwbNumber.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Tracking number saved! Order marked as shipped.');
        setShowManualAwbModal(false);
        setManualAwbNumber('');
        fetchOrder();
      } else {
        toast.error(data.error || 'Failed to save tracking number');
      }
    } catch {
      toast.error('Network error while saving tracking number');
    }
    setSavingManualAwb(false);
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

  const isPacked =
    order.status === 'packed' ||
    order.status === 'shipped' ||
    order.status === 'delivered' ||
    Boolean(order.packageWeight && parseFloat(order.packageWeight) > 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Link href="/admin/orders" className="p-1.5 hover:bg-warm-100 rounded-md">
            <FiArrowLeft className="w-4 h-4 text-warm-600" />
          </Link>
          <h1 className="text-base font-bold text-warm-900">Order #{order.id.slice(0, 8)}</h1>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full capitalize ${statusColors[order.status] || 'bg-warm-100 text-warm-700'}`}>
            {order.status}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-50 text-brand-700 uppercase">
            Payment: {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Return Request Banner */}
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

      {/* PART 1 & PART 3: Packing & Delhivery Integration Panel */}
      {order.status !== 'cancelled' && (
        <div className="p-4 bg-white border border-warm-200 rounded-md mb-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
            <h3 className="font-bold text-warm-900 text-[13px] flex items-center gap-2">
              <FiBox className="w-4 h-4 text-indigo-600" /> Delhivery Order Fulfillment & Packing Workflow
            </h3>
            {isPacked ? (
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full uppercase border border-indigo-200 flex items-center gap-1">
                <FiCheckCircle className="w-3 h-3" /> Order Packed
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-full uppercase border border-amber-200 flex items-center gap-1">
                <FiAlertTriangle className="w-3 h-3" /> Packing Required
              </span>
            )}
          </div>

          {/* STEP 1: Package Dimensions Form / Details Card */}
          <div className="p-3 bg-warm-50/70 border border-warm-200 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-warm-900 flex items-center gap-1.5">
                Step 1: Package Details (Weight & Dimensions)
              </span>
              {isPacked && !isEditingPackage && (
                <button
                  type="button"
                  onClick={() => setIsEditingPackage(true)}
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  Edit Package Details
                </button>
              )}
            </div>

            {isPacked && !isEditingPackage ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-2.5 rounded border border-warm-200 text-[11px]">
                <div>
                  <span className="text-[10px] text-warm-500 block uppercase font-semibold">Weight</span>
                  <span className="font-bold text-warm-900">{order.packageWeight || packageWeight} kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-warm-500 block uppercase font-semibold">Length</span>
                  <span className="font-bold text-warm-900">{order.packageLength || packageLength} cm</span>
                </div>
                <div>
                  <span className="text-[10px] text-warm-500 block uppercase font-semibold">Width</span>
                  <span className="font-bold text-warm-900">{order.packageWidth || packageWidth} cm</span>
                </div>
                <div>
                  <span className="text-[10px] text-warm-500 block uppercase font-semibold">Height</span>
                  <span className="font-bold text-warm-900">{order.packageHeight || packageHeight} cm</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePackOrder} className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
                      Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={packageWeight}
                      onChange={(e) => setPackageWeight(e.target.value)}
                      placeholder="e.g. 0.5"
                      className="w-full px-2.5 py-1.5 border border-warm-200 rounded text-[11px] bg-white outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
                      Length (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={packageLength}
                      onChange={(e) => setPackageLength(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full px-2.5 py-1.5 border border-warm-200 rounded text-[11px] bg-white outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
                      Width (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={packageWidth}
                      onChange={(e) => setPackageWidth(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full px-2.5 py-1.5 border border-warm-200 rounded text-[11px] bg-white outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
                      Height (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={packageHeight}
                      onChange={(e) => setPackageHeight(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full px-2.5 py-1.5 border border-warm-200 rounded text-[11px] bg-white outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={packing}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {packing ? 'Saving & Packing...' : 'Save Package & Pack Order'}
                  </button>
                  {isEditingPackage && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPackage(false)}
                      className="px-3 py-1.5 border border-warm-300 text-[11px] font-semibold text-warm-700 rounded hover:bg-warm-100"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* STEP 2: Delhivery Shipment Actions & Waybill Status */}
          <div>
            <span className="text-[11px] font-bold text-warm-900 block mb-2">
              Step 2: Courier Waybill & Dispatch
            </span>

            {order.awbNumber ? (
              <div className="p-3 bg-brand-50/60 border border-brand-200 rounded-md">
                <p className="text-[11px] text-warm-800 font-mono">
                  Waybill / AWB Number: <span className="font-bold text-brand-700 text-[12px]">{order.awbNumber}</span>
                </p>
                <p className="text-[11px] text-warm-600 mt-1">
                  Courier Status: <span className="font-bold text-warm-900">{trackingInfo?.courierStatus || order.courierStatus || 'Manifested'}</span>
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-warm-200 rounded-md">
                <div>
                  <p className="text-[11px] text-warm-700 font-medium">
                    {isPacked
                      ? 'Package details confirmed. Ready to create live shipment or enter tracking number.'
                      : 'Please enter package weight & dimensions in Step 1 above to enable shipment creation.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Manual AWB Entry Button */}
                  <button
                    type="button"
                    onClick={() => setShowManualAwbModal(true)}
                    className="px-3 py-1.5 bg-white text-warm-800 border border-warm-300 hover:bg-warm-50 text-[11px] font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Manually enter an AWB generated externally or directly via Delhivery panel"
                  >
                    <FiEdit3 className="w-3.5 h-3.5 text-warm-600" />
                    <span>Enter AWB Manually</span>
                  </button>

                  {/* Real Create Shipment Button */}
                  <button
                    type="button"
                    onClick={handleCreateShipment}
                    disabled={creatingShipment || !isPacked}
                    className="px-3.5 py-1.5 bg-warm-900 hover:bg-warm-800 text-white text-[11px] font-bold rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {creatingShipment ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiSend className="w-3.5 h-3.5" />
                    )}
                    <span>Create Shipment</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tracking Movement Timeline */}
            {order.awbNumber && trackingInfo?.events && trackingInfo.events.length > 0 && (
              <div className="mt-3 pt-3 border-t border-warm-100 space-y-2">
                <p className="text-[10px] font-bold text-warm-700 uppercase tracking-wider">Shipment Movement History</p>
                <div className="space-y-2">
                  {trackingInfo.events.map((evt, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-[10px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-warm-900">{evt.status}</span>
                        {evt.location && <span className="text-warm-500 font-medium ml-1.5">({evt.location})</span>}
                        {evt.remark && <p className="text-warm-500 italic text-[9px]">{evt.remark}</p>}
                        <p className="text-warm-400 text-[9px]">{new Date(evt.eventTimestamp || evt.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {/* COD Payment Collection Banner */}
      {order.paymentMethod?.toLowerCase() === 'cod' && order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-emerald-900 text-[12px] flex items-center gap-1.5">
              💵 Cash on Delivery (COD) Order — Payment Pending
            </h3>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Total collection amount: <span className="font-bold">{formatCurrency(order.totalAmount)}</span>. Mark as paid once cash is collected upon delivery.
            </p>
          </div>
          <button
            onClick={() => handleAdminAction('update_payment_status', { paymentStatus: 'paid' })}
            disabled={updating}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md transition-colors shrink-0 shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FiCheck className="w-3.5 h-3.5" /> Mark COD Payment as Paid
          </button>
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
                  {(() => {
                    const rawSrc = item.productImage || (Array.isArray(item.productImages) ? item.productImages[0] : null);
                    const validSrc = typeof rawSrc === 'string' && rawSrc.trim() !== '' ? rawSrc : null;
                    return validSrc ? (
                      <Image src={validSrc} alt="" fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-warm-400"><Package className="w-4 h-4" /></div>
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-warm-900">{item.productName || item.name || 'Product'}</p>

                  {/* Add-ons rendering */}
                  {Array.isArray(item.addons) && item.addons.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {item.addons.map((addon) => {
                        const aQty = addon.quantity || 1;
                        const aPrice = Number(addon.priceAtPurchase || 0);
                        return (
                          <div key={addon.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-brand-50 text-brand-800 rounded text-[9px] font-semibold border border-brand-200">
                            {addon.imageUrl && typeof addon.imageUrl === 'string' && addon.imageUrl.trim() !== '' && (
                              <img src={addon.imageUrl} alt="" className="w-3.5 h-3.5 rounded object-cover border border-brand-300 shrink-0" />
                            )}
                            <span>+ {addon.name} × {aQty} ({aPrice === 0 ? 'Free' : formatCurrency(aPrice * aQty)})</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[10px] text-warm-500 mt-0.5">
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
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
            {order.paymentMethod === 'cod' && Number(order.codAdvanceAmount) > 0 && (
              <div className="pt-2 border-t border-dashed border-warm-200 space-y-1">
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Advance Paid Online</span>
                  <span>{formatCurrency(order.codAdvanceAmount)}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>Cash Due on Delivery</span>
                  <span>{formatCurrency(Math.max(0, Number(order.totalAmount) - Number(order.codAdvanceAmount)))}</span>
                </div>
                {order.codAdvancePaymentId && (
                  <p className="text-[9px] text-warm-400 font-mono mt-0.5">
                    Advance Payment ID: {order.codAdvancePaymentId}
                  </p>
                )}
              </div>
            )}
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
                    className="inline-flex items-center gap-1 text-[10px] text-brand-600 font-bold hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    Call Customer
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



      {/* Manual AWB Entry Modal */}
      <Modal
        isOpen={showManualAwbModal}
        onClose={() => setShowManualAwbModal(false)}
        title="Enter Tracking / AWB Number Manually"
      >
        <form onSubmit={handleSaveManualAwb} className="space-y-3 text-[11px]">
          <p className="text-warm-600">
            For shipments created directly through Delhivery&apos;s dashboard or another carrier, paste the AWB tracking number here.
          </p>
          <div>
            <label className="block text-[10px] font-bold text-warm-700 uppercase mb-1">
              AWB / Waybill Number *
            </label>
            <input
              type="text"
              value={manualAwbNumber}
              onChange={(e) => setManualAwbNumber(e.target.value)}
              placeholder="e.g. 123456789012"
              className="w-full px-3 py-2 border border-warm-200 rounded text-[11px] font-mono outline-none focus:border-warm-900"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowManualAwbModal(false)}
              className="px-3 py-1.5 border border-warm-200 text-warm-700 text-[11px] font-semibold rounded hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingManualAwb}
              className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-bold rounded hover:bg-warm-800 disabled:opacity-50"
            >
              {savingManualAwb ? 'Saving...' : 'Save & Mark Shipped'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}