import { NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { db } from '@/lib/db';
import { products, coupons, orders, orderItems, orderStatusHistory, storeSettings, productAddons, orderItemAddons, addons } from '@/lib/db/schema';
import { eq, and, inArray, sql, gte } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { createOrderSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from '@/lib/email';
import { cleanupAbandonedOrders } from '@/lib/order-cleanup';

import { resolveAddonPricing } from '@/lib/addon-utils';

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
    // Non-blocking opportunistic cleanup of expired abandoned orders
    cleanupAbandonedOrders().catch(() => {});

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
      shippingAddress,
    } = result.data;

    if (!user && !isGuest && (!guestEmail || !shippingAddress)) {
      return NextResponse.json({ error: 'Please login or provide guest checkout details' }, { status: 400 });
    }

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
        ) || dbAddonLinks.find((a) => a.id === addonId);

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

    // Calculate shipping charge
    const shippingCharge = subtotal >= minFreeShipping ? 0 : defaultShippingFee;
    const totalAmount = Math.max(0, subtotal - discount + shippingCharge);

    // Atomic stock decrement helper wrapped in a single DB transaction
    async function decrementStockAtomic(itemsToDecrement) {
      try {
        await db.transaction(async (tx) => {
          for (const item of itemsToDecrement) {
            const res = await tx
              .update(products)
              .set({
                stock: sql`${products.stock} - ${item.quantity}`,
                unitsSold: sql`${products.unitsSold} + ${item.quantity}`,
                isOutOfStock: sql`CASE WHEN ${products.stock} - ${item.quantity} <= 0 THEN true ELSE ${products.isOutOfStock} END`,
              })
              .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity)))
              .returning();

            if (res.length === 0) {
              const err = new Error(`INSUFFICIENT_STOCK:${item.name}`);
              err.failedProductName = item.name;
              throw err;
            }
          }
        });
        return { success: true };
      } catch (error) {
        if (error.failedProductName || error.message?.startsWith('INSUFFICIENT_STOCK:')) {
          const failedProductName = error.failedProductName || error.message.replace('INSUFFICIENT_STOCK:', '');
          return { success: false, failedProductName };
        }
        throw error;
      }
    }

    // Handle COD Order Creation (Pure COD - No Advance Required)
    if (paymentMethod === 'cod') {
      const stockResult = await decrementStockAtomic(validatedItems);
      if (!stockResult.success) {
        return NextResponse.json(
          { error: `Insufficient stock for "${stockResult.failedProductName}". Please adjust your cart quantity.` },
          { status: 400 }
        );
      }

      const guestAccessCode = !user ? crypto.randomBytes(16).toString('hex') : null;
      const [order] = await db
        .insert(orders)
        .values({
          userId: user ? user.id : null,
          guestName: guestName || null,
          guestEmail: guestEmail || null,
          guestPhone: guestPhone || null,
          shippingAddress: shippingAddress || null,
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: 'cod',
          shippingCharge: shippingCharge.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          codAdvanceAmount: '0.00',
          addressId: addressId || null,
          couponCode: validCouponCode,
          discountAmount: discount.toFixed(2),
          accessCode: guestAccessCode,
        })
        .returning();

      for (const item of validatedItems) {
        const [insertedOrderItem] = await db
          .insert(orderItems)
          .values({
            orderId: order.id,
            productId: item.productId,
            productName: item.name,
            productImage: item.image || null,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase,
          })
          .returning();

        if (item.addons && item.addons.length > 0) {
          await db.insert(orderItemAddons).values(
            item.addons.map((addon) => ({
              orderItemId: insertedOrderItem.id,
              addonId: addon.addonId,
              name: addon.name,
              priceAtPurchase: addon.priceAtPurchase,
              quantity: addon.quantity || 1,
              imageUrl: addon.imageUrl || null,
            }))
          );
        }
      }

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: 'pending',
        note: user ? 'COD order placed by user.' : 'COD order placed by guest.',
      });

      const targetEmail = user?.email || guestEmail;
      if (targetEmail) {
        sendOrderConfirmationEmail(targetEmail, order, validatedItems);
      }
      if (settings?.contactEmail) {
        sendAdminNewOrderEmail(settings.contactEmail, order, validatedItems);
      }

      return NextResponse.json({
        orderId: order.id,
        accessCode: order.accessCode,
        isCod: true,
        requiresAdvance: false,
        totalAmount,
        message: "COD Order placed successfully! You'll receive a confirmation call from us shortly to confirm your order.",
      });
    }

    // Handle Razorpay Order Creation
    if (!razorpay) {
      return NextResponse.json(
        { error: 'Razorpay keys not configured on server' },
        { status: 500 }
      );
    }

    const stockResult = await decrementStockAtomic(validatedItems);
    if (!stockResult.success) {
      return NextResponse.json(
        { error: `Insufficient stock for "${stockResult.failedProductName}". Please adjust your cart quantity.` },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(totalAmount * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `order_${Date.now().toString().slice(-10)}`,
    });

    const guestAccessCode = !user ? crypto.randomBytes(16).toString('hex') : null;
    const [order] = await db
      .insert(orders)
      .values({
        userId: user ? user.id : null,
        guestName: guestName || null,
        guestEmail: guestEmail || null,
        guestPhone: guestPhone || null,
        shippingAddress: shippingAddress || null,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'razorpay',
        shippingCharge: shippingCharge.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        addressId: addressId || null,
        couponCode: validCouponCode,
        discountAmount: discount.toFixed(2),
        razorpayOrderId: rzpOrder.id,
        accessCode: guestAccessCode,
      })
      .returning();

    // Insert Order Items and their Add-ons
    for (const item of validatedItems) {
      const [insertedOrderItem] = await db
        .insert(orderItems)
        .values({
          orderId: order.id,
          productId: item.productId,
          productName: item.name,
          productImage: item.image || null,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
        })
        .returning();

      if (item.addons && item.addons.length > 0) {
        await db.insert(orderItemAddons).values(
          item.addons.map((addon) => ({
            orderItemId: insertedOrderItem.id,
            addonId: addon.addonId,
            name: addon.name,
            priceAtPurchase: addon.priceAtPurchase,
            quantity: addon.quantity || 1,
            imageUrl: addon.imageUrl || null,
          }))
        );
      }
    }

    // Status History
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: 'pending',
      note: 'Razorpay order initialized. Awaiting payment.',
    });

    return NextResponse.json({
      orderId: order.id,
      accessCode: order.accessCode,
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount,
      subtotal,
      discount,
      shippingCharge,
      isCod: false,
    });
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
