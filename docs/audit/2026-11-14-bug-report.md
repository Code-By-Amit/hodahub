# HodaHub ecommerce audit — 14 November 2026

## Executive assessment

The storefront has useful foundations: shared product cards, brand/category navigation, server-side product pricing, conditional stock decrements, signed payment verification, guest order access codes, admin authorization helpers, and some regression tests. However, the order lifecycle is not reliable enough for professional ecommerce operation yet. Several independent paths disagree about payment, inventory, cancellation, delivery, and returns.

Prioritize transaction correctness and account identity before a broad visual refresh. Keep the existing warm neutral/orange direction, but establish consistent typography, page widths, controls, spacing, and customer-facing promises.

## Scope and evidence

- Project inventory: 273 files under `src`, including 78 API route files. Reviewed the architecture and major customer/admin flows, with detailed manual tracing of checkout, payment, inventory, authentication, fulfillment, returns, catalog queries, persistence, analytics, and shared UI. This is not a claim that every line has been manually inspected.
- Ran `npm run test:units`: **29 passed, 0 failed**.
- Ran `npm run lint`: **77 findings: 34 errors and 43 warnings**, exit code 1.
- Ran isolated, non-mutating schema checks: guest checkout without contact/address, account checkout without an address, a 150% coupon, discount price greater than regular price, and a profile patch without a name all pass their current schemas.
- Ran an isolated `react-dom/server` render with the installed `PersistGate`, `loading: null`, and sample storefront children: output was an empty string. This confirms the wrapper's server-render behavior; the deployed page response was not tested.
- No application source was changed. A pre-existing modification in `src/lib/metaPixel.js` was present before this audit and was left untouched.
- No local listener was found on ports 3000–3002. No browser automation package was found in the project. Browser rendering, mobile screenshots, keyboard journeys, live gateway behavior, production configuration, database contents/migrations, and load performance remain unverified.
- No real orders, payments, messages, refunds, shipments, database writes, migrations, or deployments were performed. A production build was not run.

Findings below distinguish **code-confirmed** behavior from **code-supported risks**. Reproduction steps are proposed for an isolated test environment; they have not been executed against the live store. Severity: P0 = release blocker involving order/money/inventory integrity; P1 = high customer, security, or operational impact; P2 = quality, consistency, or resilience issue.

## Order, payment, and inventory

### F01 — P0 — COD orders are treated as abandoned online payments

**Code-confirmed.** `src/lib/order-cleanup.js:17–25` selects every pending order with pending payment, without filtering payment method. COD creation stores exactly those statuses in `src/app/api/payment/create-order/route.js`.

**Trigger/impact:** Leave a valid COD order pending past the configured timeout (default 15 minutes), then run cleanup. It is cancelled and inventory is restored even though cash is expected at delivery. A new checkout also starts cleanup opportunistically.

**Expected/fix:** Separate COD confirmation from online payment expiry. Only expire eligible online stock reservations; protect the transition atomically. Verify that an old unpaid online order expires while an equally old COD order survives.

### F02 — P0 — Stock reservation and order creation can partially succeed

**Code-confirmed failure path.** `src/app/api/payment/create-order/route.js:224` commits the stock transaction before gateway order creation, order insertion, item insertion, and history insertion. The remainder is not one database transaction and has no compensation.

**Trigger/impact:** A gateway rejection after stock decrement leaves stock consumed without an order to clean up. An item/add-on insert failure can leave a partial order. Repeated checkout requests also have no idempotency key and can create duplicate orders/reservations.

**Expected/fix:** Use a durable checkout attempt and idempotency key; atomically persist order/items/reservation, handle gateway calls with explicit compensation/reconciliation. Test failure at each boundary and repeated requests.

### F03 — P0 — Stock restoration is not exactly once

**Code-confirmed missing guards; concurrent outcome requires integration testing.** `src/lib/order-cleanup.js`, `src/app/api/payment/webhook/route.js`, `src/app/api/orders/[id]/cancel/route.js`, and `src/app/api/admin/orders/[id]/action/route.js` restore stock through independent read/update sequences.

**Trigger/impact:** Two cleanup workers can select the same order and both restore stock. Repeating admin cancellation or return approval restores stock again without checking the previous state. A failed-payment restoration followed by cancellation also restores the same reservation twice.

**Expected/fix:** Persist reservation disposition and use a conditional claim plus one transaction for transition, stock, and history. Repeated and concurrent events must change inventory only once.

### F04 — P0 — Webhooks can resurrect cancelled/refunded orders and regress fulfillment

**Code-confirmed.** `src/app/api/payment/webhook/route.js:58` accepts capture whenever payment status is not `paid`, then unconditionally writes `status: confirmed` and `paymentStatus: paid`. It does not use the safer claim rules in the client verification endpoint.

**Trigger/impact:** Capture arriving after cancellation can confirm an order whose inventory was released. Capture on a refunded order changes it back to paid. Concurrent failed/captured events can restore stock while the order becomes paid. Two workers can both process an event from the same stale row.

**Expected/fix:** Share one monotonic payment/fulfillment state machine across verify, webhook, expiry, cancellation, and refunds. Persist event identities and reconcile late payments into a support/refund workflow rather than silently reactivating the order.

### F05 — P1 — Payment retry loses attempt history and does not reserve released stock

**Code-confirmed.** `src/app/api/payment/retry/[orderId]/route.js:72` replaces the only Razorpay order ID. It does not reacquire stock released by `payment.failed`. The verify endpoint itself comments on older tabs becoming orphaned; the webhook acknowledges unknown order IDs with success.

**Trigger/impact:** Fail payment, retry, then succeed: the order can be paid without reserved stock. Pay in an older tab after retry: money may arrive without being associated with the store order.

**Expected/fix:** Store all payment attempts with unique gateway IDs; define attempt expiry and reservation rules; reconcile every valid late capture. Test two tabs, concurrent retries, webhook-first completion, and sold-out retry.

### F06 — P1 — Guest order confirmation and invoice access are broken across layers

**Code-confirmed.** `src/proxy.js:13` protects all `/orders` paths. Checkout redirects guests to `/orders/{id}?accessCode=...`, but the proxy requires a login and preserves only the pathname in its login redirect. The invoice page calls `ordersApi.getById(id)` without the access code and the invoice link also drops it. Cancel/return/retry APIs require account ownership.

**Trigger/impact:** Complete guest COD/online checkout while logged out. The supposed confirmation URL redirects to login; invoice access cannot use the supplied guest credential. Guests lack the equivalent post-purchase actions offered to account customers.

**Expected/fix:** Support scoped guest authorization consistently on order detail, invoice, tracking, and approved actions; keep ownership checks. Test fresh browser sessions and forwarded/incorrect access codes.

### F07 — P1 — Checkout does not validate address ownership or require a fulfillable address

**Code-confirmed.** `createOrderSchema` makes all contact/address fields optional; `isGuest: true` bypasses the route's guest-details condition. Logged-in checkout accepts any syntactically valid `addressId` without querying its owner. The route stores that ID; order detail later returns its address.

**Trigger/impact:** Submit guest COD with only items and `isGuest: true`: an order can lack contact and destination. A logged-in caller supplying another customer's known address UUID can attach it to their own order and retrieve that address through order detail.

**Expected/fix:** Require complete guest identity/destination; resolve saved addresses using both address ID and current user ID; snapshot recipient/address at purchase. Address deletion or edits must not alter historical fulfillment records.

## Identity and account safety

### F08 — P1 — Email verification is incorrectly treated as phone verification

**Code-confirmed identity model defect.** `src/app/api/profile/route.js` derives phone verification from `users.isVerified`, which also means email verification. A verified email account can initially save a phone without proving ownership; subsequent reads treat it as verified. Phone-login handlers find users by that stored phone. `users.phone` has an index but no unique constraint.

**Trigger/impact:** Set an unverified phone on an email account, reload the profile, then use phone sign-in. Unverified phone associations and duplicate numbers can route login to the wrong account; exact collision behavior depends on stored rows/query order.

**Expected/fix:** Separate email/phone verification timestamps, store pending phone separately, enforce canonical unique verified phones, and require OTP before making a phone a login identity. Audit existing phone associations before migration.

### F09 — P1 — Profile phone OTP endpoint never sends an SMS

**Code-confirmed.** `src/app/api/user/phone/send-otp/route.js` generates/stores a code and responds “OTP sent successfully,” but calls no SMS provider. Production does not receive the development-only demo code. Its verify handler can also short-circuit because of F08.

**Expected/fix:** Use the verified MSG91 flow consistently, report actual send failures, and add per-user/per-phone verification attempt limits. Prove that an SMS is delivered in provider test mode before showing success.

### F10 — P1 — Verification and password-reset codes are logged in production

**Code-confirmed.** `src/lib/email.js:16` and `:66` log full email/code pairs without an environment guard. `src/lib/auth.js` generates codes using `Math.random()`.

**Impact/fix:** Operational logs expose active authentication secrets. Remove/redact codes, use cryptographic randomness, and avoid storing reusable plaintext challenges where practical. Verify production logs never contain codes.

### F11 — P1 — Google OAuth lacks request-to-callback binding

**Code-confirmed missing protection; exploitability not live-tested.** `src/app/api/auth/google/route.js` creates the authorization URL without a state value, and the callback validates no state/session binding. The callback also links by email without checking the provider's verified-email flag.

**Expected/fix:** Add short-lived, single-use state bound to the initiating browser, validate callback origin/redirect configuration and provider email verification, and consider PKCE. Reject unsolicited, mismatched, or replayed callbacks.

### F12 — P1 — Password reset/logout cannot revoke issued sessions

**Code-confirmed.** Access/refresh tokens contain no server-side session identity/version. Logout clears only this browser's cookies; password reset/change changes only the password hash. `getAuthUser` accepts refresh tokens directly and falls back to token roles if the database lookup fails.

**Impact/fix:** A copied refresh token remains usable after password reset/logout until its expiry. Add revocable sessions or token versioning and rotation; fail closed for admin authorization when current role cannot be checked. Test reset, role demotion, revoked refresh reuse, and database outage.

### F13 — P1 — Checkout can be abused to reserve inventory without payment

**Code-confirmed missing controls.** `src/app/api/payment/create-order/route.js` permits unauthenticated checkout and has no rate limit, bounded cart size, or idempotency key. Stock is deducted before payment; F07 permits nearly empty guest COD payloads.

**Impact/fix:** Automated requests can consume availability and create operational noise. Add bounded payloads, per-identity/IP controls, reservation quotas, and duplicate-submission handling. Use measured limits suitable for shared networks.

### F14 — P2 — Admin user mutation responses expose authentication fields

**Code-confirmed, admin-only exposure.** `src/app/api/admin/users/route.js` POST/PATCH return complete `.returning()` user rows, including password hashes and OTP/reset fields, although GET explicitly selects a safe response.

**Expected/fix:** Return one safe user DTO for every handler; do not send authentication secrets to browser state or API inspection tools. This is not an unauthenticated data leak.

## Fulfillment, returns, and communications

### F15 — P1 — Return approval claims a refund without moving money

**Code-confirmed.** `src/app/api/admin/orders/[id]/action/route.js:93` sets `paymentStatus: refunded` and restores stock on approval. There is no refund provider call, store-credit ledger, return receipt, inspection, or refund reconciliation in that path.

**Trigger/impact:** Approve a return: the application says refunded although no refund has been initiated, and makes returned goods available before receipt. It conflicts with the public exchange/store-credit policy.

**Expected/fix:** Separate request approval, goods received/inspected, exchange/store-credit issuance, and monetary refund completion. Record the actual settlement reference and restock only when appropriate.

### F16 — P1 — The public 48-hour exchange policy is not implemented

**Code-confirmed.** `src/components/storefront/ReturnPolicyContent.js` promises a 48-hour exchange window and evidence conditions. `src/app/api/orders/[id]/return/route.js` checks only delivered status and absence of a previous request; it accepts just a reason. The order schema has no delivered timestamp or return evidence fields.

**Impact/fix:** Old deliveries remain eligible indefinitely, evidence cannot be recorded, and the UI says return/refund while policy says exchange/store credit. Agree the business policy, record delivery time, and enforce eligibility server-side with a support exception process.

### F17 — P1 — Admin fulfillment allows invalid transitions and unpaid prepaid shipments

**Code-confirmed.** The generic admin action route permits any enumerated status/payment status without transition constraints. Shipment creation checks cancellation and package dimensions, but not paid status for Razorpay orders or existing AWB. It unconditionally marks the order shipped.

**Impact/fix:** An unpaid online order can be shipped; repeated requests can submit multiple shipments; completed states can regress. Enforce a transition matrix, payment requirements, shipment idempotency, and audited reasons for overrides.

### F18 — P1 — Missing courier credentials silently create fake shipments

**Code-confirmed conditional behavior.** `src/lib/delhivery.js:133` returns `success: true` and a fabricated AWB when no token is configured, with no production guard. The shipment route accepts it and marks the order shipped. Default courier environment is staging.

**Expected/fix:** Permit mocks only in explicit development/test mode; reject production misconfiguration. Never mark a real order shipped from a mock/staging result. Verify deployment readiness without revealing credential values.

### F19 — P1 — Delivery checker reports availability regardless of courier results

**Code-confirmed.** `src/lib/delhivery.js` returns serviceable for unconfirmed pincodes and provider failures. `src/app/api/pincode/check/route.js` always responds `serviceable: true` after syntax validation and on exceptions. Checkout does not enforce delivery/COD serviceability. The India Post fallback expects `success/details`, but `lookupPincode` returns `{city, state}` or null.

**Impact/fix:** Customers can pay for destinations/methods the courier cannot support. If alternative shipping is intentional, represent it explicitly as manual confirmation, not a verified delivery promise. Use available/unavailable/unknown states and validate the selected method at checkout.

### F20 — P1 — Courier phone normalization truncates country-coded numbers incorrectly

**Code-confirmed.** `src/lib/delhivery.js:156` strips non-digits then takes the first ten digits. For `+919876543210`, it sends `9198765432` instead of `9876543210`.

**Expected/fix:** Use a shared Indian-phone canonicalizer and carry recipient name/phone snapshots for account as well as guest orders. Test ten-digit, +91, 91, and invalid inputs.

### F21 — P1 — Order/contact emails can fail while the UI reports success

**Code-confirmed paths; delivery not live-tested.** Admin actions pass `{email: ...}` to `sendOrderStatusEmail`, whose contract expects a string, and omit guest recipients. Several handlers fire email promises without awaiting/durable scheduling. Contact ignores the mail helper's `success` result. Missing Resend configuration returns mocked success even outside development. Webhook-only capture sends a payment receipt but not the complete customer/admin order-confirmation workflow.

**Expected/fix:** Use a durable, deduplicated notification queue/outbox, correct recipient DTOs, consistent event-driven notifications, real delivery status, and safe production configuration checks. Verification should use the order's recipient, not whichever user happens to submit a valid payment signature.

## Catalog, cart, and checkout accuracy

### F22 — P1 — Add-ons can use a different product's eligibility/price override

**Code-confirmed.** `src/app/api/payment/create-order/route.js:163` first looks for a matching product/add-on link, then falls back to any matching add-on link. The query fetches selected add-on IDs across all products.

**Trigger/impact:** Submit an add-on ID that exists for another product: the route can apply that other link's price/free override to the requested product. Invalid selections with no match are silently omitted.

**Expected/fix:** Require the exact active product/add-on relationship; reject invalid selections with a cart repair response. Never silently alter paid choices.

### F23 — P1 — Displayed checkout totals can differ from the actual charge

**Code-confirmed.** Cart persists product prices and coupons. Availability checks return stock only. Checkout displays those saved prices, while create-order recomputes current prices and silently ignores expired/ineligible coupons. The payment popup uses the server amount, but purchase tracking uses the earlier client total. Coupon minimums are not revalidated in the UI when quantity changes.

**Trigger/impact:** Apply a minimum-spend coupon, reduce quantity, or change product pricing before checkout. The displayed promise can survive while the actual order has a different total.

**Expected/fix:** Fetch one server quote for all items, add-ons, coupon, shipping, and payment eligibility. Require acknowledgment of material changes before charging. Use the committed server totals for receipts and analytics.

### F24 — P2 — Pricing and pagination validation are incomplete

**Code-confirmed, including isolated schema checks.** `src/lib/validations.js` accepts percentage values above 100 and discount prices above regular prices. Several API routes directly `parseInt` page/limit without finite bounds; product price filters are forwarded without numeric validation.

**Expected/fix:** Constrain percentages, related prices, supported decimal precision, input lengths, finite page numbers, and maximum limits. Define zero-total online order behavior; do not let over-discount configuration unexpectedly produce zero-value gateway requests.

### F25 — P2 — Price sorting and filtering use regular rather than payable prices

**Code-confirmed.** `src/services/product.service.js:117–141` filters/sorts `products.price`; cards display `discountPrice || price`.

**Example:** A ₹1,000 item discounted to ₹500 sorts after a ₹600 item under low-to-high sorting and can be excluded by a ₹600 budget.

**Expected/fix:** Use a consistent effective-price expression for display, sorting, filtering, and pricing tests. The sale link currently sorts all products by discount rather than restricting results to discounted items; clarify its label/intent.

### F26 — P2 — Inactive products remain publicly accessible and appear purchasable

**Code-confirmed.** Product detail API queries by slug/ID without requiring `isActive`. Product detail UI checks stock/out-of-stock but not active status. Checkout eventually rejects the inactive product.

**Expected/fix:** Return an appropriate unavailable response for inactive products; distinguish unavailable, sold out, and deleted states consistently in detail, wishlist, quick view, cart, and checkout.

### F27 — P1 — Completed email OTP inputs repeatedly resubmit verification

**Code-confirmed effect loop.** `src/app/(auth)/verify-otp/page.js:108` submits when all six fields are populated and `loading` is false. `performVerification` always resets loading to false, including errors, while the code remains populated.

**Trigger/impact:** Enter one incorrect complete OTP. Finishing the request retriggers the effect without another user action, consuming rate limits. Success can also resubmit before delayed navigation.

**Expected/fix:** Submit once per new complete code or explicit action; latch success and stop automatic retries after failure. Test wrong code, correct code, paste, slow response, and retry after editing.

### F28 — P2 — Wishlist state can cross account boundaries on a shared browser

**Code-confirmed state path.** Logout in `src/components/storefront/Header.js` clears auth but not persisted wishlist. `syncWishlistOnAuth` treats the remaining local items as guest items and merges them into the next login.

**Impact/fix:** Account A's saved products can appear in account B. Scope persisted account state by user; clear private caches on logout; keep truly guest additions separate and test account switching.

### F29 — P2 — Search responses can overwrite newer searches

**Code-supported asynchronous race.** `src/components/storefront/SearchOverlay.js` debounces requests but does not abort or ignore an in-flight response when query changes. Product detail fetching has a similar route-change race and does not reset all product-specific selections.

**Expected/fix:** Use request identity/cancellation or keyed query state. Test slow search A followed by fast search B, clearing a pending query, and navigating between products while requests are running.

## Rendering, consistency, privacy choices, and operations

### F30 — P1 — Persistence gate blocks the entire server-rendered storefront

**Code-confirmed gating; production HTML/performance needs browser/build verification.** `src/components/providers/ReduxProvider.js:10` wraps all children in `PersistGate loading={null}`. The installed package initializes `bootstrapped: false` and changes it in `componentDidMount`; its render returns loading until then.

**Impact/fix:** Main content is withheld until browser JavaScript mounts and persistence completes, undermining server-rendered content and first paint. Restrict persistence gates to state-dependent cart/wishlist widgets and keep storefront content renderable on the server. Product pages are also client-only and lack product-specific metadata/structured data.

### F31 — P2 — UI scale and components are inconsistent

**Code-confirmed style differences; subjective visual impact requires screenshots.** Catalog/checkout use many 10–11px labels and compact controls, while shipping/legal pages use large headings, 64px vertical padding, and different card radii. Catalog widens to `xl:max-w-6xl`; most storefront sections remain `max-w-4xl`. Shared buttons/forms coexist with many bespoke implementations. `text-md` is used without a corresponding custom text-size definition in the inspected theme.

**Expected/fix:** Agree a single type/spacing/container/radius system; use shared page headers, buttons, fields, badges, and state panels. Keep density appropriate for mobile readability and purchasing confidence; assess actual contrast and target sizes in a browser rather than assuming compliance from code.

### F32 — P2 — Dialog/dropdown accessibility is incomplete and backdrop dismissal is broken

**Code-confirmed.** `src/components/ui/Modal.js` lacks dialog semantics, focus trapping/restoration, and background inert behavior. Its visible backdrop is a child div, while dismissal checks whether the clicked target equals the outer wrapper, so clicking the backdrop does not satisfy that check. Quick view/search have their own differing behavior. `CustomSelect` lacks combobox/listbox semantics and arrow-key/Escape handling.

**Expected/fix:** Consolidate accessible primitives with labelled controls, predictable Escape/backdrop handling, focus management, and keyboard navigation; verify using keyboard and a screen reader.

### F33 — P2 — Currency, support, brand, and COD promises conflict

**Code-confirmed content mismatches.** Shipping page and root metadata say free shipping over `$50`; trust badges use hardcoded ₹50 while checkout uses configurable settings. Support badges say 24/7; contact says responses usually within 24 hours and displays configurable business hours. Brand spelling varies between HodaHub and Hodahub. COD copy says an advance may be required, while creation always uses zero advance and admin still exposes an advance setting.

**Expected/fix:** Centralize store facts and approved policy text. Show one currency, shipping threshold, support promise, COD policy, and brand name across pages, metadata, emails, and invoices. Verify claims such as express delivery against actual operations; no conclusion is made here about their real-world truth.

### F34 — P2 — First-party analytics ignores the displayed cookie choice

**Code-confirmed.** Root `AnalyticsTracker` runs regardless of consent. `/api/analytics/track` sets a one-year `hh_visitor_id` cookie without consulting consent, whereas the banner says cookies stay off unless accepted. It stores the request Referer, which can contain the current page's query string, including a guest access code. The client deliberately submits full paths before the server strips the path query.

**Expected/fix:** Define necessary versus optional tracking accurately, apply the choice consistently, and redact sensitive query parameters from all telemetry/referrers. This finding concerns product behavior and privacy promises, not a jurisdiction-specific legal conclusion.

### F35 — P2 — Customers cannot reopen cookie settings through the storefront

**Code-confirmed.** `CookieSettingsButton` exists in `src/components/analytics/CookieConsent.js` but is never rendered elsewhere; the footer has no settings control although the banner says the choice can be changed any time.

**Expected/fix:** Render the settings action persistently and verify accept, reject, reload, and preference changes.

### F36 — P2 — Quality checks fail and critical workflows lack regression coverage

**Executed evidence.** Lint exits 1 with 34 errors and 43 warnings. Errors include state updates in effects, render-time ref writes, and impure render logic. Passing tests cover helpers and some route source contracts, not full checkout/payment/inventory/return workflows.

**Expected/fix:** Resolve lint errors without indiscriminately suppressing rules; distinguish style warnings from actual runtime defects. Add meaningful integration/concurrency tests for F01–F07 and browser journeys for purchase/auth. Lint failure alone does not prove the production build fails.

### F37 — P2 — Dashboard revenue and sales counters conflate reservations with sales

**Code-confirmed.** `src/app/api/admin/stats/route.js` totals every non-cancelled order as total revenue, including pending/failed payments. `unitsSold` increases at stock reservation time. Best-seller ranking uses the greater of that value and computed valid sales. COD delivery tracking does not itself reconcile payment collection.

**Expected/fix:** Separate order value, paid collections, COD receivables, refunds/store credit, and delivered net sales. Count completed sales at the agreed milestone; reservations must not promote best-seller rankings.

### F38 — P2 — Expiration scheduling and maintenance authorization are unreliable by default

**Code-confirmed configuration risk.** `vercel.json` schedules payment cleanup once daily despite a default 15-minute expiration. Opportunistic cleanup depends on new checkout traffic and runs outside awaited work. Cleanup and tracking routes authorize anyone when `CRON_SECRET` is absent. Tracking processes every active shipment sequentially in one invocation.

**Expected/fix:** Use a reliable bounded worker schedule compatible with the host's actual limits; require maintenance credentials in production; claim jobs safely and batch tracking work. Verify deployment schedule and worker runtime rather than assuming the desired timeout is guaranteed.

### F39 — P2 — Valid partial profile updates fail with a server error

**Code-confirmed, schema checked.** `updateProfileSchema` permits missing/null name, but `src/app/api/profile/route.js:95` always calls `name.trim()`.

**Trigger/impact:** Submit a valid avatar-only update or null name: the handler throws and returns 500.

**Expected/fix:** Define full-update versus partial-update semantics and make schema/handler agree. Verify name-only, phone-only, avatar-only, null, and blank inputs.

## Additional business and launch decisions, not confirmed bugs

- Confirm the actual catalog positioning. Copy describes a broad lifestyle store while exchange conditions specifically reference watches. Decide the intended audience, product authenticity/warranty claims, and consistent photography direction.
- Admin-created reviews are published in the same list as buyer reviews without an origin distinction. This does not establish that reviews are fabricated; define provenance, consent, and verified-purchase labeling so genuine evidence is presented transparently.
- Decide whether WhatsApp is an inquiry or a checkout. It currently creates no store order/reservation and uses client prices; define how staff create a traceable order and reconcile payment afterward.
- The invoice is a purchase summary; seller identity, invoice numbering, tax fields, and credit-note requirements need review against the actual registered business and tax setup. No legal/tax compliance conclusion is made in this audit.
- Confirm production gateway capture settings, dedicated webhook secret, courier production credentials/pickup location, mail sender verification, Redis availability, backup/restore, migration history, and monitoring. No secret values were inspected or copied into this report.
- Global image optimization is disabled (`next.config.mjs`), and several components use original remote images. Measure transferred sizes and Core Web Vitals before choosing Cloudinary transformations or Next image optimization.
- Review account-role administration for last-admin protection and audit attribution. The current mutation routes allow role changes without a dedicated audit log.
- Inspect empty/error behavior: homepage data errors can produce a normal-looking empty store; catalog ignores the hook's error state. Add clear retry/error states rather than treating all failures as zero results.
- Review carousel data refresh: `currentIndex` is not clamped when the banner list shrinks, so `currentBanner.title` can fail if the retained index becomes invalid.

## Outstanding validation matrix

| Area | Required checks before release |
| --- | --- |
| Storefront | Home, products, search, brands, nested categories, sold-out/inactive detail, empty/error states, back/forward navigation |
| Cart/checkout | Guest/account, saved/new address, coupon minimum/expiry, price changes, add-on restrictions, shipping changes, stock limits, duplicate clicks |
| Payments | Success, failure, dismissal, retry, multi-tab, webhook-first, duplicates, concurrent expiry/cancel, late capture, orphan reconciliation, refund settlement |
| Identity | Email/phone/Google, wrong OTP, resend, account linking, duplicate phones, password reset revocation, logout/account switching, role changes |
| Post-purchase | Guest links, invoice/print, tracking, cancellation, exchange evidence/window, return inspection, credit/refund receipt |
| Admin | Product/category/brand/add-on edits, coupons, settings, review provenance, payment gating, packing, shipment retries, failure recovery |
| UI | 360/390px mobile, tablet, desktop; zoom 200%; long names; slow/failed images; keyboard, focus, contrast, touch targets, reduced motion |
| Operations | Production build, deployment config, migrations, provider sandbox integration, secret presence, scheduled workers, metrics, backups, recovery |

## Approval boundary

This report and the accompanying plan are the deliverables for the current inspection request. No fixes are approved or implemented. Obtain the owner's approval of scope and business-policy choices before application changes.
