import { NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { db } from '@/lib/db';
import { products, coupons, orders, orderItems, orderStatusHistory, storeSettings, productAddons, orderItemAddons, addons, addresses } from '@/lib/db/schema';
import { eq, and, inArray, sql, gte } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { createOrderSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from '@/lib/email';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

import { resolveAddonPricing } from '@/lib/addon-utils';
import { checkPincodeServiceability } from '@/lib/delhivery';

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
}

export async function POST(request) {
  try {
    const limit = await checkRateLimit(`checkout:${getClientIP(request)}`, 10, 60);
    if (!limit.success) return NextResponse.json({ error: "Too many checkout attempts. Please wait a minute." }, { status: 429 });

    const user = await getAuthUser(request);
    const body = await request.json();

    const result = createOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        formatZodErrorResponse(result, 'Invalid input data'),
        { status: 400 }
      );
    }

    const {
      items,
      addressId,
      paymentMethod = 'razorpay',
      couponCode,
      isGuest,
      guestName,
      guestEmail,
      guestPhone,
      shippingAddress: submittedAddress,
      checkoutKey,
      expectedTotal,
    } = result.data;

    let shippingAddress = submittedAddress;
    if (!user && (!isGuest || !guestName?.trim() || !guestEmail || !guestPhone || !shippingAddress)) {
      return NextResponse.json({ error: 'Complete guest contact and delivery details are required.' }, { status: 400 });
    }
    if (addressId) {
      if (!user) return NextResponse.json({ error: 'Please sign in to use a saved address.' }, { status: 401 });
      const [saved] = await db.select().from(addresses).where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id))).limit(1);
      if (!saved) return NextResponse.json({ error: 'Delivery address not found.' }, { status: 400 });
      shippingAddress = { line1: saved.line1, line2: saved.line2, city: saved.city, state: saved.state, pincode: saved.pincode, phone: saved.phone || user.phone, name: user.name };
    }
    if (!shippingAddress?.phone || !shippingAddress?.line1 || !shippingAddress?.city || !shippingAddress?.state || !shippingAddress?.pincode) return NextResponse.json({ error: 'A complete delivery address and phone number are required.' }, { status: 400 });

    // Fetch store settings for shipping & COD toggle
    const [settings] = await db.select().from(storeSettings).limit(1);
    const codEnabled = settings ? settings.codEnabled : true;
    const defaultShippingFee = settings ? Number(settings.shippingFee) : 0;
    const minFreeShipping = settings ? Number(settings.minFreeShipping) : 50;

    if (paymentMethod === 'cod' && !codEnabled) {
      return NextResponse.json(
        { error: 'Cash on Delivery (COD) is currently disabled by store settings' },
        { status: 400 }
      );
    }

    const delivery = await checkPincodeServiceability(shippingAddress.pincode);
    if (delivery.serviceable !== true || (process.env.NODE_ENV === 'production' && delivery.environment !== 'production')) return NextResponse.json({ error: delivery.serviceable === false ? 'Delivery is unavailable for this address.' : 'Delivery availability could not be verified. Contact support before ordering.' }, { status: delivery.serviceable === false ? 400 : 503 });
    if (paymentMethod === 'cod' && delivery.codAvailable !== true) return NextResponse.json({ error: 'Cash on Delivery is unavailable for this pincode. Choose online payment.' }, { status: 400 });
    // Re-verify product details and pricing server-side
    const productIds = items.map((i) => i.productId);
    const dbProducts = await db.select().from(products).where(inArray(products.id, productIds));

    // Check per-product COD availability
    if (paymentMethod === 'cod') {
      const nonCodProduct = dbProducts.find((p) => p.codAvailable === false);
      if (nonCodProduct) {
        return NextResponse.json(
          { error: `Cash on Delivery is not available for: ${nonCodProduct.name}` },
          { status: 400 }
        );
      }
    }

    // Fetch selected add-ons from DB with per-product link overrides
    const allAddonIds = items.flatMap((i) => {
      if (i.selectedAddon?.addonId || i.selectedAddon?.id) {
        return [i.selectedAddon.addonId || i.selectedAddon.id];
      }
      if (i.selectedAddonId) {
        return [i.selectedAddonId];
      }
      if (Array.isArray(i.selectedAddons) && i.selectedAddons.length > 0) {
        return [i.selectedAddons[0].addonId || i.selectedAddons[0].id].filter(Boolean);
      }
      if (Array.isArray(i.selectedAddonIds) && i.selectedAddonIds.length > 0) {
        return [i.selectedAddonIds[0]].filter(Boolean);
      }
      return [];
    });

    let dbAddonLinks = [];
    if (allAddonIds.length > 0) {
      dbAddonLinks = await db
        .select({
          id: addons.id,
          name: addons.name,
          price: addons.price,
          isFree: addons.isFree,
          imageUrl: addons.imageUrl,
          isActive: addons.isActive,
          productId: productAddons.productId,
          priceOverride: productAddons.priceOverride,
          isFreeOverride: productAddons.isFreeOverride,
        })
        .from(productAddons)
        .innerJoin(addons, eq(productAddons.addonId, addons.id))
        .where(and(inArray(addons.id, allAddonIds), eq(addons.isActive, true)));
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = dbProducts.find((p) => p.id === item.productId);
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }
      if (!product.isActive || product.isOutOfStock) {
        return NextResponse.json({ error: `"${product.name}" is currently unavailable or out of stock.` }, { status: 400 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}". Only ${product.stock} left in stock.` },
          { status: 400 }
        );
      }

      const unitPrice = product.discountPrice ? Number(product.discountPrice) : Number(product.price);

      // Calculate selected add-on price with resolved per-product link overrides (max 1 add-on per product item)
      const itemAddons = [];
      let itemAddonsTotal = 0;

      let singleSelection = null;
      if (item.selectedAddon?.addonId || item.selectedAddon?.id) {
        singleSelection = item.selectedAddon;
      } else if (item.selectedAddonId) {
        singleSelection = { addonId: item.selectedAddonId, quantity: 1 };
      } else if (Array.isArray(item.selectedAddons) && item.selectedAddons.length > 0) {
        singleSelection = item.selectedAddons[0];
      } else if (Array.isArray(item.selectedAddonIds) && item.selectedAddonIds.length > 0) {
        singleSelection = { addonId: item.selectedAddonIds[0], quantity: 1 };
      }

      if (singleSelection) {
        const addonId = singleSelection.addonId || singleSelection.id;
        const requestedAddonQty = Math.max(1, Number(singleSelection.quantity || 1));
        // Server-side clamping: add-on quantity can never exceed attached product quantity
        const addonQty = Math.min(requestedAddonQty, item.quantity);

        const rawAddon = dbAddonLinks.find(
          (a) => a.id === addonId && a.productId === item.productId
        );

        if (!rawAddon) return NextResponse.json({ error: 'A selected add-on is no longer available for this product. Please update your cart.' }, { status: 409 });
        if (rawAddon) {
          const resolved = resolveAddonPricing(rawAddon, {
            priceOverride: rawAddon.priceOverride,
            isFreeOverride: rawAddon.isFreeOverride,
          });

          const addonUnitPrice = Number(resolved.price);
          itemAddonsTotal += addonUnitPrice * addonQty;
          itemAddons.push({
            addonId: resolved.id,
            name: resolved.name,
            priceAtPurchase: addonUnitPrice.toFixed(2),
            quantity: addonQty,
            imageUrl: resolved.imageUrl || null,
          });
        }
      }

      const itemTotal = unitPrice * item.quantity + itemAddonsTotal;
      subtotal += itemTotal;

      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: unitPrice.toFixed(2),
        name: product.name,
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
        addons: itemAddons,
      });
    }

    // Server-side coupon verification
    let discount = 0;
    let validCouponCode = null;
    if (couponCode) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, couponCode.toUpperCase()), eq(coupons.isActive, true)))
        .limit(1);

      if (coupon && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date())) {
        if (!coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount)) {
          discount =
            coupon.type === 'percent'
              ? (subtotal * Number(coupon.value)) / 100
              : Math.min(Number(coupon.value), subtotal);
          validCouponCode = coupon.code;
        }
      }
    }

    if (couponCode && !validCouponCode) return NextResponse.json({ error: 'Your coupon is no longer eligible. Review the updated total before ordering.', invalidCoupon: true }, { status: 409 });
    // Calculate shipping charge
    const shippingCharge = subtotal >= minFreeShipping ? 0 : defaultShippingFee;
    const totalAmount = Math.max(0, subtotal - discount + shippingCharge);

    if (expectedTotal !== undefined && Math.abs(expectedTotal - totalAmount) > 0.009) {
      return NextResponse.json({ error: 'Prices or shipping changed. Your cart has been refreshed; review the total before ordering.', cartUpdates: dbProducts.map((product) => ({ productId: product.id, price: product.price, discountPrice: product.discountPrice, codAvailable: product.codAvailable, addons: dbAddonLinks.filter((link) => link.productId === product.id).map((link) => resolveAddonPricing(link, link)) })), totalAmount }, { status: 409 });
    }
    const amountInPaise = Math.round(totalAmount * 100);
    if (paymentMethod === 'razorpay' && (!razorpay || amountInPaise < 100)) return NextResponse.json({ error: 'Online payment is unavailable for this order. Please contact support.' }, { status: 400 });
    // Creating an unpaid gateway order does not reserve stock. All store writes commit together.
    const gatewayOrder = paymentMethod === 'razorpay' ? await razorpay.orders.create({ amount: amountInPaise, currency: 'INR', receipt: 'checkout_' + crypto.randomBytes(10).toString('hex') }) : null;
    let createdNow = false;
    const order = await db.transaction(async (tx) => {
      if (checkoutKey) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${checkoutKey}))`);
        const [existing] = await tx.select().from(orders).where(eq(orders.checkoutKey, checkoutKey)).limit(1);
        if (existing) {
          if (existing.userId !== (user?.id || null)) throw new Error('Invalid checkout attempt.');
          if (existing.status === 'cancelled' || existing.paymentStatus === 'paid') throw new Error('This checkout is already completed. Check your orders before paying again.');
          return existing;
        }
      }
      for (const item of [...validatedItems].sort((a, b) => a.productId.localeCompare(b.productId))) {
        const updated = await tx.update(products).set({ stock: sql`${products.stock} - ${item.quantity}`, unitsSold: sql`${products.unitsSold} + ${item.quantity}`, isOutOfStock: sql`CASE WHEN ${products.stock} - ${item.quantity} <= 0 THEN true ELSE ${products.isOutOfStock} END` }).where(and(eq(products.id, item.productId), eq(products.isActive, true), eq(products.isOutOfStock, false), gte(products.stock, item.quantity))).returning();
        if (!updated.length) throw new Error('Insufficient stock for ' + item.name + '. Please update your cart.');
      }
      const [created] = await tx.insert(orders).values({ userId: user?.id || null, guestName: guestName || user?.name || null, guestEmail: guestEmail || user?.email || null, guestPhone: guestPhone || shippingAddress.phone, shippingAddress, status: 'pending', paymentStatus: 'pending', paymentMethod, shippingCharge: shippingCharge.toFixed(2), totalAmount: totalAmount.toFixed(2), addressId: addressId || null, couponCode: validCouponCode, discountAmount: discount.toFixed(2), codAdvanceAmount: '0.00', razorpayOrderId: gatewayOrder?.id || null, accessCode: !user ? crypto.randomBytes(24).toString('hex') : null, checkoutKey: checkoutKey || null }).returning();
      for (const item of validatedItems) {
        const [inserted] = await tx.insert(orderItems).values({ orderId: created.id, productId: item.productId, productName: item.name, productImage: item.image, quantity: item.quantity, priceAtPurchase: item.priceAtPurchase }).returning();
        if (item.addons.length) await tx.insert(orderItemAddons).values(item.addons.map((addon) => ({ ...addon, orderItemId: inserted.id })));
      }
      await tx.insert(orderStatusHistory).values({ orderId: created.id, status: 'pending', note: paymentMethod === 'cod' ? 'COD order placed; awaiting store confirmation.' : 'Checkout initialized; stock reserved while awaiting payment.' });
      createdNow = true;
      return created;
    });
    if (createdNow && paymentMethod === 'cod') {
      await Promise.allSettled([order.guestEmail ? sendOrderConfirmationEmail(order.guestEmail, order, validatedItems, shippingAddress) : Promise.resolve(), settings?.contactEmail ? sendAdminNewOrderEmail(settings.contactEmail, order, validatedItems) : Promise.resolve()]);
    }
    return NextResponse.json({ orderId: order.id, accessCode: order.accessCode, razorpayOrderId: order.razorpayOrderId, amount: Math.round(Number(order.totalAmount) * 100), totalAmount: Number(order.totalAmount), subtotal, discount, shippingCharge, isCod: paymentMethod === 'cod', requiresAdvance: false });

  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please login to checkout' }, { status: 401 });
    }
    console.error('Create order error:', error);

    let errorMessage =
      error?.error?.description ||
      error?.description ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to create order');

    if (error?.statusCode === 401 || errorMessage === 'Authentication failed') {
      errorMessage =
        'Razorpay Authentication Failed: Invalid NEXT_PUBLIC_RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env.local. Please provide valid Razorpay API keys.';
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
