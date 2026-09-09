import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { db } from '@/lib/db';
import { products, coupons, orders, orderItems, orderStatusHistory, storeSettings } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { createOrderSchema } from '@/lib/validations';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from '@/lib/email';

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
    const user = await requireAuth(request);
    const body = await request.json();

    console.log("Request reaching here: ", body,user)

    const result = createOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { items, addressId, paymentMethod = 'razorpay', couponCode } = result.data;

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

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = dbProducts.find((p) => p.id === item.productId);
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }
      if (!product.isActive) {
        return NextResponse.json({ error: `${product.name} is currently unavailable` }, { status: 400 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Only ${product.stock} left in stock.` },
          { status: 400 }
        );
      }

      const unitPrice = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
      subtotal += unitPrice * item.quantity;

      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: unitPrice.toFixed(2),
        name: product.name,
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

    // Handle COD Order Creation
    if (paymentMethod === 'cod') {
      // Decrement stock upon order confirmation
      for (const item of validatedItems) {
        await db
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      const [order] = await db
        .insert(orders)
        .values({
          userId: user.id,
          status: 'confirmed',
          paymentStatus: 'pending',
          paymentMethod: 'cod',
          shippingCharge: shippingCharge.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          addressId,
          couponCode: validCouponCode,
          discountAmount: discount.toFixed(2),
        })
        .returning();

      // Insert Order Items
      await db.insert(orderItems).values(
        validatedItems.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
        }))
      );

      // Status History
      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: 'confirmed',
        note: 'COD order placed and confirmed.',
      });

      // Send Emails
      sendOrderConfirmationEmail(user.email, order, validatedItems);
      if (settings?.contactEmail) {
        sendAdminNewOrderEmail(settings.contactEmail, order, validatedItems);
      }

      return NextResponse.json({
        orderId: order.id,
        isCod: true,
        totalAmount,
        message: 'COD Order confirmed!',
      });
    }

    // Handle Razorpay Order Creation
    if (!razorpay) {
      return NextResponse.json(
        { error: 'Razorpay keys not configured on server' },
        { status: 500 }
      );
    }

    const amountInPaise = Math.round(totalAmount * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `order_${Date.now().toString().slice(-10)}`,
    });

    // Decrement stock only after Razorpay order creation succeeds
    for (const item of validatedItems) {
      await db
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }

    const [order] = await db
      .insert(orders)
      .values({
        userId: user.id,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'razorpay',
        shippingCharge: shippingCharge.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        addressId,
        couponCode: validCouponCode,
        discountAmount: discount.toFixed(2),
        razorpayOrderId: rzpOrder.id,
      })
      .returning();

    // Insert Order Items
    await db.insert(orderItems).values(
      validatedItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
      }))
    );

    // Status History
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: 'pending',
      note: 'Razorpay order initialized. Awaiting payment.',
    });

    return NextResponse.json({
      orderId: order.id,
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
