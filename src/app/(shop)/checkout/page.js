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
import { lookupPincode } from '@/lib/pincode';
import {
  FiPlus,
  FiMapPin,
  FiCreditCard,
  FiTruck,
  FiCheck,
  FiAlertCircle,
  FiUser,
  FiUserPlus,
  FiArrowRight,
  FiLoader,
  FiMessageSquare,
} from 'react-icons/fi';
import { toWhatsAppLink } from '@/lib/zod-utils';
import PhoneInput from '@/components/ui/PhoneInput';
import FieldError from '@/components/ui/FieldError';
import Script from 'next/script';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { formatCurrency } from '@/lib/utils';

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

  // checkoutMode: 'account' | 'prompt' | 'guest'
  const [checkoutMode, setCheckoutMode] = useState('prompt');

  const [guestForm, setGuestForm] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Pincode auto-fill states
  const [guestPincodeLoading, setGuestPincodeLoading] = useState(false);
  const [guestPincodeNote, setGuestPincodeNote] = useState('');
  const [addrPincodeLoading, setAddrPincodeLoading] = useState(false);
  const [addrPincodeNote, setAddrPincodeNote] = useState('');

  const [storeSettings, setStoreSettings] = useState({
    codEnabled: true,
    shippingFee: 0,
    minFreeShipping: 50,
    whatsappNumber: '',
    codAdvanceAmount: 99,
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
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
    if (user) {
      setCheckoutMode('account');
      fetchAddresses();
    } else {
      setCheckoutMode((prev) => (prev === 'account' ? 'prompt' : prev));
    }
    fetchStoreSettings();
  }, [user, authLoading, items.length]);

  useEffect(() => {
    if (!isCodAvailable && paymentMethod === 'cod') {
      setPaymentMethod('razorpay');
    }
  }, [isCodAvailable, paymentMethod]);

  // Debounced Pincode Lookup for Guest Form
  useEffect(() => {
    const pincode = guestForm.pincode.trim();
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setGuestPincodeNote('');
      return;
    }

    const timer = setTimeout(async () => {
      setGuestPincodeLoading(true);
      setGuestPincodeNote('');
      const res = await lookupPincode(pincode);
      setGuestPincodeLoading(false);
      if (res && (res.city || res.state)) {
        setGuestForm((prev) => ({
          ...prev,
          city: res.city || prev.city,
          state: res.state || prev.state,
        }));
      } else {
        setGuestPincodeNote("Couldn't auto-detect city/state. Please enter manually.");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [guestForm.pincode]);

  // Debounced Pincode Lookup for Logged-in Add Address Form
  useEffect(() => {
    const pincode = addrForm.pincode.trim();
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setAddrPincodeNote('');
      return;
    }

    const timer = setTimeout(async () => {
      setAddrPincodeLoading(true);
      setAddrPincodeNote('');
      const res = await lookupPincode(pincode);
      setAddrPincodeLoading(false);
      if (res && (res.city || res.state)) {
        setAddrForm((prev) => ({
          ...prev,
          city: res.city || prev.city,
          state: res.state || prev.state,
        }));
      } else {
        setAddrPincodeNote("Couldn't auto-detect city/state. Please enter manually.");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [addrForm.pincode]);

  async function fetchStoreSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok && data.settings) {
        setStoreSettings({
          codEnabled: data.settings.codEnabled ?? true,
          shippingFee: Number(data.settings.shippingFee || 0),
          minFreeShipping: Number(data.settings.minFreeShipping || 50),
          whatsappNumber: data.settings.whatsappNumber || '',
          codAdvanceAmount: Number(data.settings.codAdvanceAmount || 99),
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
    const isGuestOrder = !user || checkoutMode === 'guest';

    if (isGuestOrder) {
      if (!guestForm.name || !guestForm.email || !guestForm.line1 || !guestForm.city || !guestForm.state || !guestForm.pincode) {
        toast.error('Please fill all required guest & shipping details');
        return;
      }
    } else {
      if (!selectedAddress) {
        toast.error('Please select a delivery address');
        return;
      }
    }

    // Handle WhatsApp Direct Handoff (No DB order created)
    if (paymentMethod === 'whatsapp') {
      let custName = '';
      let custPhone = '';
      let addrText = '';

      if (isGuestOrder) {
        custName = guestForm.name;
        custPhone = guestForm.phone || '';
        addrText = `${guestForm.line1}${guestForm.line2 ? ', ' + guestForm.line2 : ''}, ${guestForm.city}, ${guestForm.state} - ${guestForm.pincode}`;
      } else {
        const addr = addresses.find((a) => a.id === selectedAddress);
        custName = user?.name || 'Valued Customer';
        custPhone = user?.phone || addr?.phone || '';
        addrText = addr ? `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.city}, ${addr.state} - ${addr.pincode}` : '';
      }

      const itemsText = items
        .map((i) => {
          let line = `• ${i.name} x${i.quantity} — ₹${((i.discountPrice || i.price) * i.quantity).toFixed(2)}`;
          if (Array.isArray(i.selectedAddons) && i.selectedAddons.length > 0) {
            const addonsList = i.selectedAddons.map((a) => `+ ${a.name} (₹${a.price})`).join(', ');
            line += `\n   Addons: ${addonsList}`;
          }
          return line;
        })
        .join('\n');

      const waText = `🛍️ *New Order Request from HodaHub*
----------------------------------
*Customer:* ${custName} ${custPhone ? `(${custPhone})` : ''}
*Delivery Address:* ${addrText}

*Items:*
${itemsText}

*Subtotal:* ₹${subtotal.toFixed(2)}
*Shipping Fee:* ₹${shippingFee.toFixed(2)}
${discount > 0 ? `*Discount:* -₹${discount.toFixed(2)}\n` : ''}*Total Amount:* ₹${total.toFixed(2)}
----------------------------------
Hi! I'd like to place this order via WhatsApp. Please confirm item availability and send payment details.`;

      const waNumber = storeSettings?.whatsappNumber?.trim();
      if (!waNumber) {
        toast.error('WhatsApp checkout is currently unavailable.');
        return;
      }
      const waUrl = toWhatsAppLink(waNumber, waText);
      window.open(waUrl, '_blank');
      toast.success('WhatsApp opened with your complete order details!');
      return;
    }

    setPaying(true);
    try {
      const cartItems = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        selectedAddonIds: Array.isArray(i.selectedAddons) ? i.selectedAddons.map((a) => a.id) : [],
      }));

      const payload = isGuestOrder
        ? {
            items: cartItems,
            couponCode: coupon?.code || null,
            paymentMethod,
            isGuest: true,
            guestName: guestForm.name,
            guestEmail: guestForm.email,
            guestPhone: guestForm.phone,
            shippingAddress: {
              line1: guestForm.line1,
              line2: guestForm.line2,
              city: guestForm.city,
              state: guestForm.state,
              pincode: guestForm.pincode,
              phone: guestForm.phone,
            },
          }
        : {
            items: cartItems,
            couponCode: coupon?.code || null,
            addressId: selectedAddress,
            paymentMethod,
          };

      const createRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        toast.error(createData.error || 'Failed to create order');
        setPaying(false);
        return;
      }

      // Pure COD without online advance required
      if (createData.isCod && !createData.requiresAdvance) {
        dispatch(clearCart());
        toast.success('Order placed successfully via Cash on Delivery!');
        const redirectUrl = `/orders/${createData.orderId}${createData.accessCode ? `?accessCode=${createData.accessCode}` : ''}`;
        router.push(redirectUrl);
        return;
      }

      // Online Razorpay Payment (Either full payment OR COD Advance token payment)
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: createData.amount,
        currency: 'INR',
        name: 'HodaHub',
        description: createData.requiresAdvance ? `COD Advance Payment (₹${createData.codAdvanceAmount})` : 'Order Payment',
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
              toast.success(createData.requiresAdvance ? 'COD advance paid! Order confirmed.' : 'Payment successful! Order placed.');
              const accessCode = verifyData.accessCode || createData.accessCode;
              const redirectUrl = `/orders/${verifyData.orderId}${accessCode ? `?accessCode=${accessCode}` : ''}`;
              router.push(redirectUrl);
            } else {
              toast.error(verifyData.error || 'Payment verification failed');
            }
          } catch {
            toast.error('Payment verification error');
          }
          setPaying(false);
        },
        prefill: {
          name: isGuestOrder ? guestForm.name : user?.name,
          email: isGuestOrder ? guestForm.email : user?.email,
        },
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
        toast.error('Payment failed. Please try again.');
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

  if (items.length === 0) return null;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayLoaded(true)} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} />

        {/* DECISION SCREEN FOR UNAUTHENTICATED USERS */}
        {!user && checkoutMode === 'prompt' ? (
          <div className="max-w-2xl mx-auto py-6">
            <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-1.5">
                <h1 className="text-lg sm:text-xl font-bold text-warm-900 tracking-tight">How would you like to check out?</h1>
                <p className="text-[12px] text-warm-500 max-w-md mx-auto">
                  Select an option below to proceed. You can log in to your account, register a new account, or check out as a guest.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                {/* Option 1: Log In */}
                <div className="flex flex-col justify-between p-4.5 rounded-xl border-2 border-warm-200 hover:border-warm-900 bg-white transition-all shadow-2xs hover:shadow-md group">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-warm-100 text-warm-900 flex items-center justify-center font-bold group-hover:bg-warm-900 group-hover:text-white transition-colors">
                      <FiUser className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-warm-900">Log In</h3>
                    <p className="text-[11px] text-warm-500 leading-relaxed">
                      Use your saved addresses & track past orders.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/login?redirect=/checkout')}
                    className="mt-4 w-full py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-lg hover:bg-warm-800 transition-colors shadow-2xs"
                  >
                    Log In
                  </button>
                </div>

                {/* Option 2: Create Account */}
                <div className="flex flex-col justify-between p-4.5 rounded-xl border-2 border-warm-200 hover:border-brand-600 bg-white transition-all shadow-2xs hover:shadow-md group">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold group-hover:bg-brand-600 group-hover:text-white transition-colors">
                      <FiUserPlus className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-warm-900">Create Account</h3>
                    <p className="text-[11px] text-warm-500 leading-relaxed">
                      Sign up with email OTP verification.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/signup?redirect=/checkout')}
                    className="mt-4 w-full py-2 bg-brand-600 text-white text-[11px] font-semibold rounded-lg hover:bg-brand-700 transition-colors shadow-2xs"
                  >
                    Create Account
                  </button>
                </div>

                {/* Option 3: Continue as Guest */}
                <div className="flex flex-col justify-between p-4.5 rounded-xl border-2 border-warm-200 hover:border-emerald-600 bg-white transition-all shadow-2xs hover:shadow-md group">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                      <FiArrowRight className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-warm-900">Continue as Guest</h3>
                    <p className="text-[11px] text-warm-500 leading-relaxed">
                      Instant checkout without creating an account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutMode('guest')}
                    className="mt-4 w-full py-2 bg-emerald-700 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-800 transition-colors shadow-2xs"
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <h1 className="text-md font-bold text-warm-900 tracking-tight">Checkout</h1>
              {!user && checkoutMode === 'guest' && (
                <div className="flex items-center gap-2 bg-warm-100 p-1 rounded-md text-[11px] font-semibold">
                  <span className="text-warm-700 px-2">Checking out as Guest</span>
                  <button
                    type="button"
                    onClick={() => setCheckoutMode('prompt')}
                    className="px-2.5 py-1 bg-white text-warm-900 rounded border border-warm-200 hover:bg-warm-50 transition-colors"
                  >
                    Change / Sign In
                  </button>
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              {/* Left: Address & Payment Selection */}
              <div className="lg:col-span-2 space-y-4">
                {/* Delivery Address / Guest Details Section */}
                {checkoutMode === 'guest' || !user ? (
                  <div className="p-4 bg-white rounded-lg border border-warm-200 shadow-xs space-y-3">
                    <div className="border-b border-warm-100 pb-2 flex items-center justify-between">
                      <div>
                        <h2 className="text-[13px] font-bold text-warm-900 flex items-center gap-1.5">
                          <FiMapPin className="w-3.5 h-3.5 text-warm-900" /> Guest Details & Shipping Address
                        </h2>
                        <p className="text-[10px] text-warm-500 mt-0.5">
                          Enter your contact and delivery information below.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={guestForm.name}
                        onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                        placeholder="Full Name *"
                        className="col-span-2 sm:col-span-1 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                        required
                      />
                      <input
                        type="email"
                        value={guestForm.email}
                        onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                        placeholder="Email Address (for order tracking) *"
                        className="col-span-2 sm:col-span-1 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                        required
                      />
                      <input
                        type="tel"
                        maxLength={10}
                        value={guestForm.phone}
                        onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10-digit Phone Number (Optional)"
                        className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                      />
                      <input
                        type="text"
                        value={guestForm.line1}
                        onChange={(e) => setGuestForm({ ...guestForm, line1: e.target.value })}
                        placeholder="Address Line 1 *"
                        className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                        required
                      />
                      <input
                        type="text"
                        value={guestForm.line2}
                        onChange={(e) => setGuestForm({ ...guestForm, line2: e.target.value })}
                        placeholder="Address Line 2 (Apartment, Suite, etc.)"
                        className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                      />

                      {/* Pincode Field with Loader */}
                      <div className="col-span-2 relative">
                        <input
                          type="text"
                          maxLength={6}
                          value={guestForm.pincode}
                          onChange={(e) => setGuestForm({ ...guestForm, pincode: e.target.value })}
                          placeholder="6-Digit Pincode * (Auto-fills City & State)"
                          className="w-full px-2.5 py-1.5 pr-8 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                          required
                        />
                        {guestPincodeLoading && (
                          <FiLoader className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-500 animate-spin" />
                        )}
                      </div>

                      {guestPincodeNote && (
                        <p className="col-span-2 text-[10px] text-amber-700 font-medium">
                          {guestPincodeNote}
                        </p>
                      )}

                      <input
                        type="text"
                        value={guestForm.city}
                        onChange={(e) => setGuestForm({ ...guestForm, city: e.target.value })}
                        placeholder="City *"
                        className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                        required
                      />
                      <input
                        type="text"
                        value={guestForm.state}
                        onChange={(e) => setGuestForm({ ...guestForm, state: e.target.value })}
                        placeholder="State *"
                        className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                        required
                      />
                    </div>
                  </div>
                ) : (
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

                        {/* Logged in Pincode with Loader */}
                        <div className="col-span-2 relative">
                          <input
                            type="text"
                            maxLength={6}
                            value={addrForm.pincode}
                            onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })}
                            placeholder="6-Digit Pincode * (Auto-fills City & State)"
                            className="w-full px-2.5 py-1.5 pr-8 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                            required
                          />
                          {addrPincodeLoading && (
                            <FiLoader className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-500 animate-spin" />
                          )}
                        </div>

                        {addrPincodeNote && (
                          <p className="col-span-2 text-[10px] text-amber-700 font-medium">
                            {addrPincodeNote}
                          </p>
                        )}

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
                          type="tel"
                          maxLength={10}
                          value={addrForm.phone}
                          onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          placeholder="10-digit Phone"
                          className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
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
                )}

                {/* Payment Method Selection */}
                <div className="p-4 bg-white rounded-lg border border-warm-200 shadow-xs">
                  <h2 className="text-[13px] font-bold text-warm-900 flex items-center gap-1.5 mb-3">
                    <FiCreditCard className="w-3.5 h-3.5 text-warm-900" /> Payment Method
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Razorpay Online Option */}
                    <label
                      className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                        paymentMethod === 'razorpay'
                          ? 'border-warm-900 bg-warm-50/50 shadow-xs ring-1 ring-warm-900/10'
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
                        <p className="text-[10px] text-warm-500 mt-0.5">UPI, Cards, NetBanking</p>
                      </div>
                    </label>

                    {/* Cash on Delivery Option */}
                    {isCodAvailable && (
                      <label
                        className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                          paymentMethod === 'cod'
                            ? 'border-warm-900 bg-warm-50/50 shadow-xs ring-1 ring-warm-900/10'
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
                          <p className="text-[10px] text-warm-500 mt-0.5">₹{storeSettings.codAdvanceAmount || 99} advance online</p>
                        </div>
                      </label>
                    )}

                    {/* WhatsApp Checkout Option */}
                    {storeSettings?.whatsappNumber && storeSettings.whatsappNumber.trim() !== '' && (
                      <label
                        className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                          paymentMethod === 'whatsapp'
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600/10'
                            : 'border-warm-200 hover:border-warm-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="whatsapp"
                          checked={paymentMethod === 'whatsapp'}
                          onChange={() => setPaymentMethod('whatsapp')}
                          className="accent-emerald-600 w-3.5 h-3.5"
                        />
                        <div>
                          <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                            <FiMessageSquare className="w-3 h-3 text-emerald-700" /> WhatsApp Order
                          </p>
                          <p className="text-[10px] text-emerald-700/80 mt-0.5">Manual order handoff</p>
                        </div>
                      </label>
                    )}
                  </div>

                  {/* COD Advance Breakdown Notice */}
                  {paymentMethod === 'cod' && isCodAvailable && (
                    <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-md text-[11px] text-amber-900 space-y-1">
                      <div className="flex justify-between font-medium text-[10px] text-amber-800">
                        <span>Total Order Amount:</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-700 text-[11px]">
                        <span>Upfront Online Token Advance:</span>
                        <span>{formatCurrency(Math.min(storeSettings.codAdvanceAmount, total))}</span>
                      </div>
                      <div className="flex justify-between font-bold text-amber-900 text-[11px] border-t border-amber-200/80 pt-1">
                        <span>Balance Cash Due on Delivery:</span>
                        <span>{formatCurrency(Math.max(0, total - Math.min(storeSettings.codAdvanceAmount, total)))}</span>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Info Notice */}
                  {paymentMethod === 'whatsapp' && (
                    <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-md text-[11px] text-emerald-900 space-y-1">
                      <p className="font-bold flex items-center gap-1 text-emerald-900">
                        <FiMessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Direct WhatsApp Checkout
                      </p>
                      <p className="text-[10px] text-emerald-800 leading-relaxed">
                        Your cart summary and shipping details will be sent directly to our store WhatsApp team. No online payment required right now!
                      </p>
                    </div>
                  )}

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
                      <div key={item.itemKey || item.productId} className="flex justify-between text-[11px]">
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
                    className={`mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 text-white font-bold text-[11px] rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer ${
                      paymentMethod === 'whatsapp'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-warm-900 hover:bg-warm-800'
                    }`}
                  >
                    {paying ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {paymentMethod === 'whatsapp' ? (
                          <>
                            <FiMessageSquare className="w-3.5 h-3.5" /> Checkout via WhatsApp
                          </>
                        ) : paymentMethod === 'cod' ? (
                          <>
                            <FiTruck className="w-3.5 h-3.5" /> Pay ₹{Math.min(storeSettings.codAdvanceAmount, total)} Advance & Place COD Order
                          </>
                        ) : (
                          <>
                            <FiCreditCard className="w-3.5 h-3.5" /> Pay {formatCurrency(total)} Online
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}