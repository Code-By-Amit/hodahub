import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/;
const phoneValidation = z
  .string()
  .refine((val) => !val || phoneRegex.test(val), {
    message: 'Must be a valid 10-digit Indian mobile number (e.g. 9876543210)',
  })
  .optional()
  .nullable();

// --- Auth Validations ---
export const signupSchema = z.object({
  name: z.string().max(255).optional().nullable(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: phoneValidation,
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
  name: z.string().min(2, 'Name must be at least 2 characters').max(255).optional().nullable(),
  phone: phoneValidation,
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export const addressSchema = z.object({
  label: z.string().max(100).optional().nullable(),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be a 6-digit number'),
  phone: phoneValidation,
});

// --- Products & Categories ---
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(500),
  slug: z.string().min(1, 'Slug is required').max(500),
  description: z.string().optional().nullable(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  discountPrice: z.coerce.number().positive('Discount price must be greater than 0').optional().nullable(),
  categoryId: z.string().uuid('Category selection is required'),
  stock: z.coerce.number().int('Stock must be an integer').min(0, 'Stock cannot be negative'),
  isOutOfStock: z.boolean().default(false),
  images: z.array(z.string().url()).default([]),
  isActive: z.boolean().default(true),
  codAvailable: z.boolean().default(true),
});

export const productStatusToggleSchema = z.object({
  isActive: z.boolean().optional(),
  isOutOfStock: z.boolean().optional(),
});

export const productAddonSchema = z.object({
  name: z.string().min(1, 'Add-on name is required').max(255),
  price: z.coerce.number().min(0, 'Price cannot be negative').default(0),
  isFree: z.boolean().default(false),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
  imageUrl: z.string().url().optional().nullable(),
  parentIds: z.array(z.string().uuid()).optional().default([]),
});

export const couponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  type: z.enum(['flat', 'percent']),
  value: z.coerce.number().positive('Value must be greater than 0'),
  minOrderAmount: z.coerce.number().min(0, 'Minimum order amount cannot be negative').default(0),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// --- Reviews ---
export const reviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional().nullable(),
    comment: z.string().max(2000).optional().nullable(),
    imageUrl: z.string().url().optional().nullable().or(z.literal('')),
    mediaUrls: z.array(z.string().url()).max(5, 'Maximum 5 media attachments allowed').optional().default([]),
  })
  .refine(
    (data) => (data.rating && data.rating >= 1 && data.rating <= 5) || (data.comment && data.comment.trim().length > 0),
    { message: 'Please provide either a star rating or a review comment.' }
  );

export const adminReviewSchema = z
  .object({
    productId: z.string().uuid('Invalid product ID'),
    userName: z.string().min(1, 'Author display name is required').max(255),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    comment: z.string().max(2000).optional().nullable(),
    mediaUrls: z.array(z.string().url()).max(5, 'Maximum 5 media attachments allowed').optional().default([]),
  })
  .refine(
    (data) => (data.rating && data.rating >= 1 && data.rating <= 5) || (data.comment && data.comment.trim().length > 0),
    { message: 'Please provide either a star rating or a review comment.' }
  );

// --- Orders & Checkout ---
export const orderItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  selectedAddonIds: z.array(z.string().uuid()).optional(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Cart cannot be empty'),
  addressId: z.string().uuid('Invalid address ID').optional().nullable(),
  paymentMethod: z.enum(['razorpay', 'cod']).default('razorpay'),
  couponCode: z.string().max(50).optional().nullable(),
  isGuest: z.boolean().optional(),
  guestName: z.string().max(255).optional().nullable(),
  guestEmail: z.string().email('Invalid email address').optional().nullable(),
  guestPhone: phoneValidation,
  shippingAddress: z
    .object({
      line1: z.string().min(1, 'Address line 1 is required'),
      line2: z.string().optional().nullable(),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      pincode: z.string().regex(/^\d{6}$/, 'Pincode must be a 6-digit number'),
      phone: phoneValidation,
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
  status: z.enum(['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  reason: z.string().optional(),
});

export const packOrderSchema = z.object({
  packageWeight: z.coerce.number().positive('Package weight must be greater than 0 kg'),
  packageLength: z.coerce.number().positive('Package length must be greater than 0 cm'),
  packageWidth: z.coerce.number().positive('Package width must be greater than 0 cm'),
  packageHeight: z.coerce.number().positive('Package height must be greater than 0 cm'),
});

// --- Store Settings & Contact ---
export const storeSettingsSchema = z.object({
  storeName: z.string().min(1).max(255).default('HodaHub'),
  contactEmail: z.string().email().optional().nullable().or(z.literal('')),
  contactPhone: phoneValidation,
  whatsappNumber: phoneValidation,
  address: z.string().max(1000).optional().nullable().or(z.literal('')),
  businessHours: z.string().max(255).optional().nullable().or(z.literal('')),
  instagramUrl: z.string().url().optional().nullable().or(z.literal('')),
  facebookUrl: z.string().url().optional().nullable().or(z.literal('')),
  twitterUrl: z.string().url().optional().nullable().or(z.literal('')),
  youtubeUrl: z.string().url().optional().nullable().or(z.literal('')),
  codEnabled: z.boolean().default(true),
  shippingFee: z.coerce.number().min(0).default(0),
  minFreeShipping: z.coerce.number().min(0).default(50),
  codAdvanceAmount: z.coerce.number().min(0).default(99),
  orderExpirationMinutes: z.coerce.number().int().min(1).max(1440).default(15),
});

export const contactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(2, 'Subject is required').max(255),
  message: z.string().min(5, 'Message must be at least 5 characters').max(5000),
});

