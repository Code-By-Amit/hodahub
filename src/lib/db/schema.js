import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

// --- Enums ---
export const roleEnum = pgEnum('role', ['customer', 'admin']);
export const couponTypeEnum = pgEnum('coupon_type', ['flat', 'percent']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['razorpay', 'cod']);
export const returnStatusEnum = pgEnum('return_status', ['none', 'requested', 'approved', 'rejected']);

// --- Users ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').default('customer').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  otp: varchar('otp', { length: 6 }),
  otpExpiresAt: timestamp('otp_expires_at'),
  otpAttempts: integer('otp_attempts').default(0).notNull(),
  resetOtp: varchar('reset_otp', { length: 6 }),
  resetOtpExpiresAt: timestamp('reset_otp_expires_at'),
  resetOtpAttempts: integer('reset_otp_attempts').default(0).notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Addresses ---
export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 100 }),
  line1: text('line1').notNull(),
  line2: text('line2'),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  pincode: varchar('pincode', { length: 10 }).notNull(),
  phone: varchar('phone', { length: 15 }),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Categories ---
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  imageUrl: text('image_url'),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Products ---
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  discountPrice: decimal('discount_price', { precision: 10, scale: 2 }),
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  stock: integer('stock').default(0).notNull(),
  images: text('images')
    .array()
    .default([])
    .notNull(),
  ratingAvg: decimal('rating_avg', { precision: 3, scale: 2 }).default('0'),
  reviewCount: integer('review_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  codAvailable: boolean('cod_available').default(true).notNull(),
  specifications: jsonb('specifications').default([]),
  productLink: text('product_link'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Reviews ---
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  imageUrl: text('image_url'),
  mediaUrls: text('media_urls').array().default([]),
  isHidden: boolean('is_hidden').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Coupons ---
export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  type: couponTypeEnum('type').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal('min_order_amount', {
    precision: 10,
    scale: 2,
  }).default('0'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Orders ---
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  guestName: varchar('guest_name', { length: 255 }),
  guestEmail: varchar('guest_email', { length: 255 }),
  guestPhone: varchar('guest_phone', { length: 50 }),
  shippingAddress: jsonb('shipping_address'),
  status: orderStatusEnum('status').default('pending').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').default('razorpay').notNull(),
  shippingCharge: decimal('shipping_charge', { precision: 10, scale: 2 })
    .default('0.00')
    .notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  addressId: uuid('address_id').references(() => addresses.id, {
    onDelete: 'set null',
  }),
  couponCode: varchar('coupon_code', { length: 50 }),
  discountAmount: decimal('discount_amount', {
    precision: 10,
    scale: 2,
  }).default('0'),
  razorpayOrderId: varchar('razorpay_order_id', { length: 255 }),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 255 }),
  cancelReason: text('cancel_reason'),
  returnReason: text('return_reason'),
  returnStatus: returnStatusEnum('return_status').default('none').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Order Items ---
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  priceAtPurchase: decimal('price_at_purchase', {
    precision: 10,
    scale: 2,
  }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Order Status History ---
export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  status: orderStatusEnum('status').notNull(),
  note: text('note'),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
});

// --- Store Settings ---
export const storeSettings = pgTable('store_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeName: varchar('store_name', { length: 255 }).default('HodaHub').notNull(),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  codEnabled: boolean('cod_enabled').default(true).notNull(),
  shippingFee: decimal('shipping_fee', { precision: 10, scale: 2 }).default('0.00').notNull(),
  minFreeShipping: decimal('min_free_shipping', { precision: 10, scale: 2 }).default('50.00').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Promotional Banners ---
export const banners = pgTable('banners', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }),
  subtitle: varchar('subtitle', { length: 500 }),
  imageUrl: text('image_url'),
  bgColor: varchar('bg_color', { length: 50 }).default('#18181b').notNull(),
  linkUrl: varchar('link_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Page Views Analytics ---
export const pageViews = pgTable('page_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  visitorId: uuid('visitor_id').notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  userAgent: text('user_agent'),
  device: varchar('device', { length: 50 }),
  referrer: varchar('referrer', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Wishlist Items ---
export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('wishlist_user_product_unique').on(table.userId, table.productId),
  ]
);


