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
  index,
} from 'drizzle-orm/pg-core';

// --- Enums ---
export const roleEnum = pgEnum('role', ['customer', 'admin']);
export const couponTypeEnum = pgEnum('coupon_type', ['flat', 'percent']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['razorpay', 'cod']);
export const returnStatusEnum = pgEnum('return_status', ['none', 'requested', 'approved', 'rejected']);

// --- Users ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }),
  passwordHash: text('password_hash'),
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

// --- Accounts (OAuth Providers) ---
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('account_provider_unique').on(table.provider, table.providerAccountId),
  ]
);

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Category Relations (Multi-Parent Join Table) ---
export const categoryRelations = pgTable(
  'category_relations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('category_parent_unique').on(table.categoryId, table.parentId),
  ]
);

// --- Products ---
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  discountPrice: decimal('discount_price', { precision: 10, scale: 2 }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, {
      onDelete: 'restrict',
    }),
  stock: integer('stock').default(0).notNull(),
  isOutOfStock: boolean('is_out_of_stock').default(false).notNull(),
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
},
(table) => [
  index('products_category_id_idx').on(table.categoryId),
]
);

// --- Add-ons Library ---
export const addons = pgTable('addons', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).default('0.00').notNull(),
  isFree: boolean('is_free').default(false).notNull(),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Product Add-ons (Join Table with Per-Product Overrides) ---
export const productAddons = pgTable(
  'product_addons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    addonId: uuid('addon_id')
      .notNull()
      .references(() => addons.id, { onDelete: 'cascade' }),
    priceOverride: decimal('price_override', { precision: 10, scale: 2 }),
    isFreeOverride: boolean('is_free_override'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('product_addon_unique').on(table.productId, table.addonId),
    index('product_addons_product_id_idx').on(table.productId),
    index('product_addons_addon_id_idx').on(table.addonId),
  ]
);

// --- Reviews ---
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  userName: varchar('user_name', { length: 255 }),
  rating: integer('rating'),
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
  codAdvanceAmount: decimal('cod_advance_amount', {
    precision: 10,
    scale: 2,
  }).default('0.00'),
  codAdvancePaymentId: varchar('cod_advance_payment_id', { length: 255 }),
  codAdvancePaidAt: timestamp('cod_advance_paid_at'),
  cancelReason: text('cancel_reason'),
  returnReason: text('return_reason'),
  returnStatus: returnStatusEnum('return_status').default('none').notNull(),
  courierProvider: varchar('courier_provider', { length: 50 }).default('delhivery'),
  awbNumber: varchar('awb_number', { length: 100 }),
  courierStatus: varchar('courier_status', { length: 100 }),
  courierStatusUpdatedAt: timestamp('courier_status_updated_at'),
  packageWeight: decimal('package_weight', { precision: 10, scale: 3 }),
  packageLength: decimal('package_length', { precision: 10, scale: 2 }),
  packageWidth: decimal('package_width', { precision: 10, scale: 2 }),
  packageHeight: decimal('package_height', { precision: 10, scale: 2 }),
  packedAt: timestamp('packed_at'),
  accessCode: varchar('access_code', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
(table) => [
  index('orders_user_id_idx').on(table.userId),
  index('orders_razorpay_order_id_idx').on(table.razorpayOrderId),
]
);

// --- Order Items ---
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    productName: varchar('product_name', { length: 500 }),
    productImage: text('product_image'),
    quantity: integer('quantity').notNull(),
    priceAtPurchase: decimal('price_at_purchase', {
      precision: 10,
      scale: 2,
    }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('order_items_order_id_idx').on(table.orderId),
    index('order_items_product_id_idx').on(table.productId),
  ]
);

// --- Order Item Add-ons ---
export const orderItemAddons = pgTable('order_item_addons', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderItemId: uuid('order_item_id')
    .notNull()
    .references(() => orderItems.id, { onDelete: 'cascade' }),
  addonId: uuid('addon_id').references(() => addons.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  priceAtPurchase: decimal('price_at_purchase', {
    precision: 10,
    scale: 2,
  }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Shipment Tracking Events ---
export const shipmentTrackingEvents = pgTable('shipment_tracking_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }),
  remark: text('remark'),
  eventTimestamp: timestamp('event_timestamp'),
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
  address: text('address'),
  businessHours: varchar('business_hours', { length: 255 }),
  instagramUrl: varchar('instagram_url', { length: 500 }),
  facebookUrl: varchar('facebook_url', { length: 500 }),
  twitterUrl: varchar('twitter_url', { length: 500 }),
  youtubeUrl: varchar('youtube_url', { length: 500 }),
  codEnabled: boolean('cod_enabled').default(true).notNull(),
  shippingFee: decimal('shipping_fee', { precision: 10, scale: 2 }).default('0.00').notNull(),
  minFreeShipping: decimal('min_free_shipping', { precision: 10, scale: 2 }).default('50.00').notNull(),
  whatsappNumber: varchar('whatsapp_number', { length: 50 }),
  codAdvanceAmount: decimal('cod_advance_amount', { precision: 10, scale: 2 }).default('99.00').notNull(),
  orderExpirationMinutes: integer('order_expiration_minutes').default(15).notNull(),
  maxOtpRequestsPerDay: integer('max_otp_requests_per_day').default(4).notNull(),
  otpResendCooldownSeconds: integer('otp_resend_cooldown_seconds').default(45).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Phone OTPs (MSG91 & Mobile Auth Rate Limiting) ---
export const phoneOtps = pgTable(
  'phone_otps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phone: varchar('phone', { length: 20 }).notNull(),
    otpHash: text('otp_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    lastSentAt: timestamp('last_sent_at').defaultNow().notNull(),
    dailyCount: integer('daily_count').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('phone_otps_phone_idx').on(table.phone),
  ]
);

// --- Promotional Banners ---
export const banners = pgTable('banners', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }),
  subtitle: varchar('subtitle', { length: 500 }),
  imageUrl: text('image_url'),
  bgColor: varchar('bg_color', { length: 50 }),
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



