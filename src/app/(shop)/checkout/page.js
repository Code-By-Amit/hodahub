'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartCoupon,
  clearCart,
} from '@/lib/store/cartSlice';
import { selectUser, selectAuthLoading } from '@/lib/store/authSlice';
import { useToast } from '@/components/ui/Toast';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import Script from 'next/script';
import { formatCurrency } from '@/lib/utils';
import { FiPlus, FiMapPin, FiCreditCard, FiTruck, FiCheck, FiAlertCircle } from 'react-icons/fi';

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const toast = useToast();
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const coupon = useSelector(selectCartCoupon);
  const user = useSelector(selectUser);
  const authLoading = useSelector(selectAuthLoading);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });
  const [addrLoading, setAddrLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const [storeSettings, setStoreSettings] = useState({
    codEnabled: true,
    shippingFee: 0,
    minFreeShipping: 50,
  });

  const nonCodItems = items.filter((item) => item.codAvailable === false);
  const isCodAvailable = storeSettings.codEnabled && nonCodItems.length === 0;

  const discount = coupon
    ? coupon.type === 'percent'
      ? (subtotal * coupon.value) / 100
      : Math.min(coupon.value, subtotal)
    : 0;

  const shippingFee =
    subtotal >= storeSettings.minFreeShipping ? 0 : storeSettings.shippingFee;
  const total = Math.max(0, subtotal - discount + shippingFee);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      setRazorpayLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
    fetchAddresses();
    fetchStoreSettings();
  }, [user, authLoading]);

  useEffect(() => {
    if (!isCodAvailable && paymentMethod === 'cod') {
      setPaymentMethod('razorpay');
    }
  }, [isCodAvailable, paymentMethod]);

  async function fetchStoreSettings() {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok && data.settings) {
        setStoreSettings({
          codEnabled: data.settings.codEnabled ?? true,
          shippingFee: Number(data.settings.shippingFee || 0),
          minFreeShipping: Number(data.settings.minFreeShipping || 50),
        });
      }
    } catch {}
  }

  async function fetchAddresses() {
    try {
      const res = await fetch('/api/addresses');
      const data = await res.json();
      if (res.ok) {
        setAddresses(data.addresses || []);
        const def = data.addresses?.find((a) => a.isDefault);
        if (def) setSelectedAddress(def.id);
        else if (data.addresses?.length > 0) setSelectedAddress(data.addresses[0].id);
      }
    } catch {}
  }

  async function handleAddAddress(e) {
    e.preventDefault();
    if (!addrForm.line1 || !addrForm.city || !addrForm.state || !addrForm.pincode) {
      toast.error('Please fill all required fields');
      return;
    }
    setAddrLoading(true);
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addrForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Address added!');
        setAddrForm({ label: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' });
        setShowAddForm(false);
        fetchAddresses();
        setSelectedAddress(data.address.id);
      } else toast.error(data.error);
    } catch {
      toast.error('Failed to add address');
    }
    setAddrLoading(false);
  }

  async function handleCheckout() {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setPaying(true);
    try {
      const cartItems = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

      const createRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          couponCode: coupon?.code || null,
          addressId: selectedAddress,
          paymentMethod,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        toast.error(createData.error || 'Failed to create order');
        setPaying(false);
        return;
      }

      if (createData.isCod) {
        dispatch(clearCart());
        toast.success('Order placed successfully via Cash on Delivery!');
        router.push(`/orders/${createData.orderId}`);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: createData.amount,
        currency: 'INR',
        name: 'HodaHub',
        description: 'Order Payment',
        order_id: createData.razorpayOrderId,
        handler: async function (response) {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: createData.orderId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              dispatch(clearCart());
              toast.success('Payment successful! Order placed.');
              router.push(`/orders/${verifyData.orderId}`);
            } else {
              toast.error(verifyData.error || 'Payment verification failed');
            }
          } catch {
            toast.error('Payment verification error');
          }
          setPaying(false);
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#18181b' },
        modal: {
          ondismiss: () => {
            toast.warning('Payment window closed. Order is pending.');
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again or choose COD.');
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      toast.error('Checkout error. Please try again.');
      setPaying(false);
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
        <div className="w-6 h-6 border-2 border-warm-900/20 border-t-warm-900 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-warm-500 text-[11px] font-medium">Loading checkout details...</p>
      </div>
    );
  }

  if (!user || items.length === 0) return null;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayLoaded(true)} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} />

        <h1 className="text-md font-bold text-warm-900 tracking-tight mb-4">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: Address & Payment Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Delivery Address Section */}
            <div className="p-4 bg-white rounded-lg border border-warm-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-warm-900 flex items-center gap-1.5">
                  <FiMapPin className="w-3.5 h-3.5 text-warm-900" /> Delivery Address
                </h2>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="text-[11px] font-semibold text-warm-900 hover:underline flex items-center gap-1"
                >
                  <FiPlus className="w-3 h-3" /> Add New Address
                </button>
              </div>

              {/* Add Address Form */}
              {showAddForm && (
                <form onSubmit={handleAddAddress} className="grid grid-cols-2 gap-2 mb-4 p-3 bg-warm-50/70 border border-warm-200 rounded-md">
                  <input
                    value={addrForm.label}
                    onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                    placeholder="Label (Home, Office)"
                    className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  />
                  <input
                    value={addrForm.line1}
                    onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                    placeholder="Address Line 1 *"
                    className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                    required
                  />
                  <input
                    value={addrForm.line2}
                    onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })}
                    placeholder="Address Line 2"
                    className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  />
                  <input
                    value={addrForm.city}
                    onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                    placeholder="City *"
                    className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                    required
                  />
                  <input
                    value={addrForm.state}
                    onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                    placeholder="State *"
                    className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                    required
                  />
                  <input
                    value={addrForm.pincode}
                    onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })}
                    placeholder="Pincode *"
                    className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                    required
                  />
                  <input
                    value={addrForm.phone}
                    onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                    placeholder="Phone"
                    className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  />
                  <div className="col-span-2 flex gap-2 pt-0.5">
                    <button
                      type="submit"
                      disabled={addrLoading}
                      className="px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 disabled:opacity-50 transition-colors"
                    >
                      {addrLoading ? 'Saving...' : 'Save Address'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 border border-warm-200 text-[11px] font-semibold rounded-md text-warm-600 hover:bg-warm-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Address List */}
              <div className="space-y-2">
                {addresses.length === 0 ? (
                  <p className="text-warm-400 text-[11px] py-3 text-center border border-dashed border-warm-200 rounded-md">
                    No saved addresses. Click above to add one.
                  </p>
                ) : (
                  addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                        selectedAddress === addr.id
                          ? 'border-warm-900 bg-warm-50/50 shadow-xs'
                          : 'border-warm-200 hover:border-warm-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress === addr.id}
                        onChange={() => setSelectedAddress(addr.id)}
                        className="mt-1 accent-warm-900 w-3.5 h-3.5"
                      />
                      <div>
                        {addr.label && (
                          <span className="text-[10px] font-bold text-warm-900 uppercase tracking-wider block mb-0.5">
                            {addr.label}
                          </span>
                        )}
                        <p className="text-[11px] text-warm-900 font-medium">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ''}
                        </p>
                        <p className="text-[10px] text-warm-500 mt-0.5">
                          {addr.city}, {addr.state} — {addr.pincode}
                        </p>
                        {addr.phone && <p className="text-[10px] text-warm-400 mt-0.5">Phone: {addr.phone}</p>}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="p-4 bg-white rounded-lg border border-warm-200 shadow-xs">
              <h2 className="text-[13px] font-bold text-warm-900 flex items-center gap-1.5 mb-3">
                <FiCreditCard className="w-3.5 h-3.5 text-warm-900" /> Payment Method
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Razorpay Online Option */}
                <label
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                    paymentMethod === 'razorpay'
                      ? 'border-warm-900 bg-warm-50/50 shadow-xs'
                      : 'border-warm-200 hover:border-warm-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="accent-warm-900 w-3.5 h-3.5"
                  />
                  <div>
                    <p className="text-[11px] font-bold text-warm-900 flex items-center gap-1">
                      <FiCreditCard className="w-3 h-3 text-warm-700" /> Online Payment
                    </p>
                    <p className="text-[10px] text-warm-500 mt-0.5">UPI, Cards, NetBanking via Razorpay</p>
                  </div>
                </label>

                {/* Cash on Delivery Option */}
                {isCodAvailable && (
                  <label
                    className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-warm-900 bg-warm-50/50 shadow-xs'
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-warm-900 w-3.5 h-3.5"
                    />
                    <div>
                      <p className="text-[11px] font-bold text-warm-900 flex items-center gap-1">
                        <FiTruck className="w-3 h-3 text-warm-700" /> Cash on Delivery
                      </p>
                      <p className="text-[10px] text-warm-500 mt-0.5">Pay in cash upon package delivery</p>
                    </div>
                  </label>
                )}
              </div>

              {nonCodItems.length > 0 && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200/80 rounded-md flex items-start gap-2 text-amber-800 text-[10px] leading-relaxed">
                  <FiAlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-900">Cash on Delivery unavailable</span>
                    <p className="mt-0.5 text-amber-700">
                      Cash on Delivery isn't available for: <span className="font-semibold">{nonCodItems.map((i) => i.name).join(', ')}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div>
            <div className="sticky top-20 p-4 bg-white rounded-lg border border-warm-200 shadow-xs">
              <h2 className="text-[13px] font-bold text-warm-900 mb-3 pb-2 border-b border-warm-100">Order Summary</h2>

              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-[11px]">
                    <span className="text-warm-600 truncate max-w-[150px]">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-semibold text-warm-900 shrink-0">
                      {formatCurrency((item.discountPrice || item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-[11px] border-t border-warm-200 pt-3">
                <div className="flex justify-between text-warm-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-warm-900">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({coupon?.code})</span>
                    <span className="font-medium">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-warm-600">
                  <span>Shipping</span>
                  <span className="font-medium">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 font-semibold">Free</span>
                    ) : (
                      formatCurrency(shippingFee)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-warm-900 font-bold text-[13px] border-t border-warm-200 pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={paying || (paymentMethod === 'razorpay' && !razorpayLoaded)}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-warm-900 text-white font-medium text-[11px] rounded-md hover:bg-warm-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paying ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {paymentMethod === 'cod' ? (
                      <>
                        <FiCheck className="w-2.5 h-2.5" /> Confirm Order (COD)
                      </>
                    ) : (
                      <>
                        <FiCreditCard className="w-2.5 h-2.5" /> Pay {formatCurrency(total)}
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}