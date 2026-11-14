# HodaHub implementation plan — proposed, awaiting approval

Read with `2026-11-14-bug-report.md`. Finding IDs below refer to that report. This plan preserves the current visual direction and incrementally makes the store reliable, consistent, and credible.

## Working rules

- No implementation begins until the owner approves the plan/scope.
- Before writing Next.js code, read the relevant installed guides in `node_modules/next/dist/docs/` as required by `AGENTS.md`; use this installed version's APIs and deprecation notices.
- Preserve the pre-existing `src/lib/metaPixel.js` modification; inspect it when analytics work is approved and avoid overwriting the owner's work.
- Use a staging/test database and provider test credentials for transactional verification. Do not make real charges, refund real payments, send customer messages, or create live shipments as test steps.
- Deliver focused changes with acceptance evidence. Treat database migrations, data repair, and deployment as explicit rollout work; do not run corrective mutations on historical orders based only on this static audit.

## Phase 0 — Agree policy and establish a reproducible test environment

**Deliverables:** approved policy sheet, fixture data, route/browser test setup, baseline screenshots, documented environment requirements.

1. Confirm store currency (proposed INR), shipping fee/threshold, service areas, support hours, COD confirmation/advance rules, exchange window/evidence, refund versus store-credit handling, and WhatsApp inquiry workflow.
2. Confirm business identity, real product positioning, warranty/authenticity wording, and customer-review provenance. Obtain actual policy decisions instead of inventing them during coding.
3. Establish isolated database fixtures and Razorpay/MSG91/Delhivery/mail test setup. Record configuration presence without exposing values.
4. Capture mobile/desktop baselines for home, listings, product detail, cart, checkout, auth, order detail, invoice, and representative admin screens. Verify the report's browser-only risks here.
5. Record lint/build/test baselines and define release gates.

**Acceptance:** test environment cannot accidentally charge or ship real orders; key policies are written and consistent; current flows can be reproduced without touching production data.

## Phase 1 — Repair order, payment, and inventory integrity

**Findings:** F01–F05, F13, F17, F37–F38. Highest priority; complete before cosmetic rollout.

1. Define permitted transitions for order, payment attempt, inventory reservation, shipment, and return separately. Preserve fulfillment progress when recording payments.
2. Add durable payment-attempt records and idempotency keys. Keep historical gateway order IDs; enforce uniqueness where appropriate.
3. Persist order, items, price snapshots, and inventory reservation atomically. Handle provider calls through recoverable steps with compensation and reconciliation.
4. Implement exactly-once reservation release/consume using transactional claims. Route timeout, customer cancel, admin cancel, failed payment, and late events through the same service.
5. Restrict expiry to eligible online reservations. Keep COD pending confirmation distinct from payment expiry.
6. Unify client verification and webhook processing. Deduplicate events, handle event ordering, verify trusted payment amount/currency/capture state as required, and queue late/orphaned payments for reconciliation.
7. Make payment retries reservation-aware and preserve all attempts. Prevent duplicate shipment creation and unpaid prepaid fulfillment.
8. Add request bounds/rate controls, reliable bounded cleanup/tracking jobs, required production maintenance auth, and operational alerts.
9. Separate reserved stock, completed sales, collections, refunds, and COD receivables in metrics.

**Acceptance tests:** two concurrent purchases of the last unit; failure at each checkout persistence/provider boundary; duplicate request/event; concurrent cleanup/cancel/capture; failed then successful retry; paid old browser tab; refunded/cancelled order receiving capture; old COD survives expiry. Inventory and settled amounts remain correct after every scenario.

## Phase 2 — Repair identity, authorization, and guest journeys

**Findings:** F06–F12, F14, F27–F28, F39.

1. Separate email verification, verified phone identity, and pending phone changes. Normalize phones and plan collision resolution before adding uniqueness constraints.
2. Use one real phone verification flow; remove the fake send-success endpoint behavior. Add challenge limits, cryptographic codes, and secret-safe logging.
3. Bind Google callbacks with single-use state and verified provider identity.
4. Add session revocation/rotation, password-reset invalidation, and current-role enforcement for admin operations. Return safe user fields consistently.
5. Validate saved-address ownership; snapshot complete recipient/destination at purchase; require fulfillable guest details server-side.
6. Make guest order, invoice, tracking, and approved post-purchase actions use consistent scoped authorization without weakening account ownership.
7. Fix one-submit-per-code OTP behavior, partial profile updates, and private-state cleanup/account scoping on logout.

**Acceptance:** another user's address cannot be attached/read; incorrect guest codes do not authorize; guest confirmation/invoice works while logged out; duplicate/unverified phone cannot become login identity; reset revokes old sessions; wrong OTP makes one attempt; account A's wishlist never merges into B.

## Phase 3 — Make prices, delivery, returns, and communication match reality

**Findings:** F15–F26, F29, F33, plus business decisions in the report.

1. Introduce one server quote for effective product prices, valid add-ons, coupon eligibility, shipping, serviceability, and payment methods. Bind checkout to a validated quote/version and show changed terms before payment.
2. Enforce exact product/add-on links, percentage/price bounds, pagination bounds, complete phone/address requirements, and zero-total handling.
3. Sort/filter by payable prices; handle inactive/sold-out products consistently; make cart stock/price changes understandable instead of surprising the customer at payment.
4. Model courier serviceability honestly, including unknown/manual delivery. Normalize recipient phones/names and prohibit mock/staging success from fulfilling live orders.
5. Implement the approved after-sales flow: request, evidence, eligibility, approval, receipt/inspection, exchange or credit/refund settlement. Keep inventory and payment status tied to actual actions.
6. Add reliable deduplicated customer/admin notifications with correct recipients and provider failure handling. Contact form success must correspond to accepted delivery/queued work.
7. Make WhatsApp wording and staff order capture traceable; distinguish an inquiry from a confirmed order.
8. Cancel/ignore stale search/product requests and reset product-specific selections on route changes.

**Acceptance:** displayed final total equals committed/charged amount; expired coupon requires a visible correction; unrelated add-ons reject; unavailable delivery cannot masquerade as confirmed service; no false shipment/refund/message success; policy window and evidence rules match all entry points.

## Phase 4 — Apply a consistent, accessible storefront design system

**Findings:** F31–F33, F35, plus browser findings from Phase 0.

**Proposed direction:** retain warm neutrals, orange accents, existing logo, and straightforward merchandising. Improve consistency and readable density; avoid a full redesign unless the owner requests one after reviewing baseline screens.

| Element | Proposed standard |
| --- | --- |
| Typography | Defined heading/body/label scale; readable primary body text around 14–16px, smaller secondary labels used sparingly |
| Containers | Shared responsive page container; explicit narrow reading/checkout variants; aligned section/header/footer edges |
| Spacing | Shared 4px-based spacing scale, repeatable section gaps and card padding |
| Controls | Shared primary/secondary/destructive buttons, consistent field heights, labels, errors, disabled/loading behavior |
| Cards/status | Consistent radius, borders, shadows, price/discount/stock presentation, status vocabulary |
| Interaction | Accessible dialog/dropdown/search/filter primitives; visible focus, Escape behavior, focus restoration, usable touch targets |
| Content | One source for shipping, support, COD, exchange policy, currency, and store identity |
| Trust | Real seller/support details, accurate availability, transparent review provenance, clear order/payment status |

**Sequence:** shared primitives and page shell → header/footer/search → listing/cards/filter → product detail → cart/checkout → auth/profile/orders/invoice → policy/contact pages → admin consistency.

**Acceptance:** review 360/390px mobile, tablet, desktop, 200% zoom, keyboard-only navigation, long copy, loading/error/empty states, broken media, and print output. Keep the approved product hierarchy and brand direction coherent throughout.

## Phase 5 — Restore rendering, discovery, performance, and truthful analytics

**Findings:** F23, F30, F34–F38 and additional performance risks.

1. Remove full-page persistence gating; retain SSR for public content and hydrate only persisted interactions that need it.
2. Add product-specific metadata, canonical URLs, accurate social previews and structured product/breadcrumb information where appropriate. Use proper unavailable/not-found responses.
3. Measure image transfer sizes and choose Cloudinary transforms/Next optimization deliberately; tune responsive images, media loading, and bundle boundaries using measured results.
4. Make analytics consent and preference changes match the banner's promise. Redact secrets/tokens/PII in URLs and referrers; track purchases from actual server totals/events with deduplication.
5. Show explicit recoverable errors for catalog/provider failures; clamp changing carousel indices and verify all navigation links.
6. Resolve lint errors and review warnings based on impact; avoid broad rule suppression. Add CI for lint, unit/integration tests, and production build.

**Acceptance:** public content exists in server response; product previews are specific; rejecting optional tracking prevents it; preferences can be reopened; order access codes never appear in stored telemetry; performance is measured on representative mobile conditions; required CI checks pass.

## Phase 6 — Release verification and controlled rollout

1. Run the complete validation matrix in the bug report with test identities/providers.
2. Review schema migration reversibility and any existing inconsistent orders/phones in a read-only reconciliation report before proposing data repairs.
3. Verify deployed provider modes, dedicated webhook configuration, schedule availability, mail sender, monitoring, backup/restore, and rollback path.
4. Review final UI screenshots and purchase/auth journeys with the owner.
5. Prepare a concrete deployment and migration checklist for approval; deploy only within the scope the owner authorizes.

**Release gate:** no unresolved P0 findings; approved disposition for each P1; no duplicate stock release/charge/shipment in concurrency tests; guest and account purchase journeys pass; lint/build pass; policy/price claims agree; rollback and reconciliation procedures are ready.

## Suggested approval choice

Approve **Phase 0 and Phase 1 first**, then review their results before progressing through the remaining phases. Alternatively approve the full phased scope, with business-policy decisions recorded in Phase 0 and visual review before broad UI changes. No timing promise is made until browser reproduction, provider test setup, and schema/data condition are known.
