import { z } from 'zod';

// --- Auth Validations ---
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().max(20).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// --- Profile & Address ---
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  phone: z.string().max(20).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export const addressSchema = z.object({
  label: z.string().max(100).optional().nullable(),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(3, 'Pincode is required').max(10),
  phone: z.string().max(15).optional().nullable(),
});

// --- Products & Categories ---
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(500),
  slug: z.string().min(1, 'Slug is required').max(500),
  description: z.string().optional().nullable(),
  price: z.number().positive('Price must be greater than 0'),
  discountPrice: z.number().positive().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  images: z.array(z.string().url()).default([]),
  isActive: z.boolean().default(true),
  codAvailable: z.boolean().default(true),
});
 
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
  imageUrl: z.string().url().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

export const couponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  type: z.enum(['flat', 'percent']),
  value: z.number().positive('Value must be greater than 0'),
  minOrderAmount: z.number().min(0).default(0),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// --- Reviews ---
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

// --- Orders & Checkout ---
export const orderItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Cart cannot be empty'),
  addressId: z.string().uuid('Invalid address ID').optional().nullable(),
  paymentMethod: z.enum(['razorpay', 'cod']).default('razorpay'),
  couponCode: z.string().max(50).optional().nullable(),
  isGuest: z.boolean().optional(),
  guestName: z.string().max(255).optional().nullable(),
  guestEmail: z.string().email('Invalid email address').optional().nullable(),
  guestPhone: z.string().max(50).optional().nullable(),
  shippingAddress: z
    .object({
      line1: z.string().min(1, 'Address line 1 is required'),
      line2: z.string().optional().nullable(),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      pincode: z.string().min(3, 'Pincode is required'),
      phone: z.string().max(15).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(3, 'Please provide a reason for cancellation').max(1000),
});

export const returnOrderSchema = z.object({
  reason: z.string().min(3, 'Please provide a reason for return').max(1000),
});

export const adminOrderActionSchema = z.object({
  action: z.enum(['approve_cancel', 'reject_cancel', 'approve_return', 'reject_return', 'update_status', 'update_payment_status']),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  reason: z.string().optional(),
});

// --- Store Settings & Contact ---
export const storeSettingsSchema = z.object({
  storeName: z.string().min(1).max(255).default('HodaHub'),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  codEnabled: z.boolean().default(true),
  shippingFee: z.number().min(0).default(0),
  minFreeShipping: z.number().min(0).default(50),
});

export const contactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(2, 'Subject is required').max(255),
  message: z.string().min(5, 'Message must be at least 5 characters').max(5000),
});
