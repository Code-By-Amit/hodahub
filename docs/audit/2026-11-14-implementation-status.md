# Implementation status — 14 November 2026

## Current release status

The requested UI features and a substantial set of reliability/security fixes are implemented locally. **Verified database TLS and all three schema migrations are now complete.** Deployment still requires the final domain/hosting configuration and the provider/operational checks below. The original 39-finding audit is a historical baseline, not a list of issues all certified fixed by this change.

The three hardening migrations committed successfully using the supplied `prod-ca-2021.crt`. No live test orders, payments, shipments, customer messages, or refunds were created. The pre-existing one-line change in `src/lib/metaPixel.js` was retained.

## Latest verification and corrections

The subsequent UI regression pass is documented in `2026-11-14-ui-regressions.md`. It corrects desktop/mobile brand layouts, the duplicate `omeg-a` identity collision, admin filter layout, large-font phone clipping, dropdown page jumps, uneven field heights and tall product cards. Brand grids are now 3×3 on mobile/tablet and five across on desktop; homepage product grids use five desktop columns. The expanded suite has **46 passing unit tests**, and real admin/storefront component browser fixtures pass the reported scenarios. Final lint has zero errors and 42 existing warnings.

The final UI-pass webpack build and built-app guest checkout regression both passed. Real catalog inspection confirms 19 distinct brand URLs, working `omeg-a` detail/filter endpoints, the corrected desktop/mobile grids, and no duplicate-key/browser errors. The latest production preview runs at **http://localhost:3001**; an existing process occupies port 3000.

- Application and migration connections share `src/lib/db/connection-config.js`: strict certificate/hostname verification, root certificate or `DATABASE_SSL_CA_FILE`/`DATABASE_SSL_CA` support, exact localhost detection, and removal of URL parameters that could override the TLS policy. The built payment route trace includes the supplied certificate.
- Read-only preflight: 17 historical release candidates, zero paid cancellations, zero duplicate phone-only identity groups, zero mismatched saved-address ownership. Breakdown: 15 cancelled/pending, one delivered/refunded/approved return, one pending/failed payment. This does not independently prove historical physical inventory reconciliation.
- All three migrations committed. A targeted snapshot of original backfill fields was saved under ignored `.local-backups/`; this is not a full database backup.
- Restored password rejection and login rate limiting, which were commented out in the current login file. Regression tests verify wrong-password rejection, rate limiting before identity access, successful valid login, and unsuccessful email delivery without session issuance.
- Missing email configuration returns failure; signup/login/resend/reset handlers report delivery failures instead of claiming that a code was sent.
- Unknown courier tracking no longer invents an in-transit timeline. Only explicit delivery scans can mark delivery; undelivered/RTO/cancelled scans cannot. Shipment state/history update together and require the previous order status/AWB to still match. Tracking cron processing is bounded to 100 orders.
- Cart button reduced to 36px with a single-line label. Shared dropdowns are compact; phone selector/input both measure 40px on the live mobile preview.
- `npm run test:units`: **44 passed, zero failed** after the latest security/TLS/tracking changes.
- `npm run test:database`: actual lifecycle code against PostgreSQL connection-local temporary tables passed idempotent cancellation, fault rollback, COD/paid expiry protection, failed-payment expiry, and legacy release protection. Public customer/catalog/order tables were not modified by these tests. Concurrent multi-connection testing remains outstanding.
- Shared UI browser fixtures passed. The full built-app browser journey passed with mocked APIs: filters, saved-cart reload, guest COD checkout, order redirect, scoped invoice, and zero browser errors. A final repeat after the latest login/email/tracking build is recorded in the release checkpoint below.
- `npm run check:production` provides a secret-free configuration report. A missing local maintenance secret was generated in `.env.local`; it must also be configured in the deployed host and scheduler. Final-domain/hosting information has been requested.

Earlier verification entries below describe previous checkpoints; the latest checkpoint above supersedes the former migration/TLS and hydration blockers.

## Requested UI changes

- **Custom dropdowns:** all remaining native `<select>` usages under `src` now use the shared custom dropdown, including admin product filters, review forms, user roles, order/payment statuses, and the phone dial code. The primitive supports keyboard selection, Escape, long-list search, disabled options, form events, and a portal popup that is not clipped by table/modal containers. Phone entry is explicitly Indian, matching the server's supported number format.
- **Customer filters:** products, search, category detail, and brand detail share the redesigned panel. Selections remain drafts until one Apply action; multiple brands can be chosen before the mobile drawer closes. Price bounds are validated, URL changes reset pagination, and the form follows current URL values during back/forward navigation. Controls have larger targets and clearer groupings; the drawer has shared dialog semantics, focus management, scroll locking, and Escape dismissal.
- **Shop by Brand:** nine tiles per slide in a three-column, three-row grid, with square product imagery, names/counts below, scroll snapping, swipe/scroll support, previous/next controls, page indicators, keyboard navigation, and reduced-motion support. The grid was checked at 360, 390, 768, and 1280px. Homepage is no longer capped at 18 brands. Fixture screenshots use sample watch drawings, not the live catalog.
- **Brand ordering:** admin create/edit includes Display order. Positive positions sort first (1, 2, 3...), followed by unranked brands alphabetically. This ordering is used by public lists and category-scoped brand lists. Mutations invalidate the local derived-brand cache and storefront paths. Stored custom slugs are preserved. Sorting depends on the new database column being applied.
- **Additional mobile fixes discovered during testing:** Add to Cart is permanently visible below product details instead of being hover-only; quick actions are visible on small screens. Checkout completion is protected from the empty-cart redirect after a successful order.

## Reliability and security work implemented

| Area | Local implementation | Remaining validation/limitations |
| --- | --- | --- |
| Checkout persistence | Stock, order, items, add-ons, and initial history are written in one transaction. Sorted stock locking and a unique checkout key prevent duplicate store orders for the same attempt. | Needs real PostgreSQL concurrency/fault-injection tests in an isolated database. Unused unpaid gateway orders can be created before the transaction; they are not exposed to the buyer. |
| Order expiry | Only pending unpaid online orders are eligible; COD is excluded. Stock release and cancellation serialize on the order row and commit together. | Existing daily hosting cron does not guarantee a 15-minute expiry. Configure and verify a suitably frequent supported worker before release; do not assume a hosting plan upgrade. |
| Payments | Verify and webhook share a locked transition. Capture is checked against order amount/currency; client verification checks provider capture status. Failed attempts keep stock reserved. Retries reuse the existing gateway order instead of replacing its identity. Late capture on cancelled/refunded/released orders records a reconciliation requirement without reactivating fulfillment. | Provider sandbox tests, concurrent event tests, and an operational reconciliation/refund process are required. No real refund was executed. Legacy COD advance payments need separate review. |
| Guest journeys | Order detail/invoice bypass the account-only page redirect; APIs retain scoped order authorization. Access codes are retained for invoice, tracking, cancellation, exchange requests, and retry. | Actual app journey uses mocked APIs in local testing. Forwarded-code behavior and real account linking still need integration tests. |
| Address safety | Saved address lookup is constrained by owner, complete destination/contact information is required, and an address snapshot is saved with the order. | Review historical orders referencing other users' addresses before applying data changes. |
| Quote accuracy | Client submits its displayed total. Price/shipping differences and invalid coupons stop checkout for review. Product and add-on pricing can be refreshed together. Analytics uses the committed server total. | This is a total-consistency check, not a full durable quote-version system. Tax/rounding, extreme discount, and repeated stale add-on scenarios need integration coverage. |
| Catalog | Filters/sorts use the payable price; sale results require a real discount. Legacy text brands can match slug filters. Inactive products are rejected by the public detail API. Public product pagination/budget input is bounded/validated. | Some other endpoints still need shared bounded query validation. Product-specific server metadata/structured data and broader catalog SSR remain follow-up work. |
| Phone identity | Separate verified-phone timestamp and unique verified-phone index; trusted provider verification is required before binding a login identity. Profile uses the existing MSG91 widget instead of pretending to send an SMS. | Review legacy identity collisions and verify MSG91 delivery/linking in test mode. The old profile send endpoint now responds 410 so old clients do not see fake success. |
| Session safety | Tokens carry an account session version; password change/reset and logout invalidate old versions. Admin/current-role checks fail closed if the database cannot validate the session. Logout clears wishlist/query caches. | Logout currently signs out all devices. Per-device revocation/refresh rotation is not implemented. Real reset, refresh, role-change, and account-switch integration tests remain necessary. |
| OTP/OAuth | Cryptographic OTP generation, removal of email/reset code logs and client OTP logging, single automatic email-code submission, browser-bound Google state, verified provider email check, safe admin user response fields. | Provider/session expiry and error recovery require live test-mode validation. |
| Fulfillment | Packing/shipment/manual tracking enforce allowed stages and payment requirements. Order-row locks serialize fulfillment changes. Production shipping cannot accept mock/staging success; explicit admin staging tests remain separate. Country-coded phone normalization is corrected. | Carrier sandbox, timeout/retry/recovery, package, and duplicate shipment tests remain required. |
| Delivery promises | Unknown/failed courier checks no longer claim availability; server checkout validates destination and COD support before accepting an order. | Correct production courier mode, credentials, pickup location, and explicit manual-shipping rules must be verified. Unknown delivery blocks checkout instead of charging speculatively. |
| Exchanges | Delivery timestamp and 48-hour eligibility; HTTPS unboxing evidence link is recorded and shown to admin. Approval no longer claims a refund or restocks goods before receipt. | Physical return receipt/inspection, exchange shipments, store-credit accounting, and any actual monetary refund workflow remain manual/unimplemented. |
| Communications | Correct admin recipients, guest fallback recipients, awaiting notification attempts, webhook-first order notifications, contact send-failure handling. | There is no durable notification outbox/retry worker yet. Provider/configuration failures can still require manual notification recovery. |
| Rendering/performance | Full-page persistence gate removed. Browser persistence starts after hydration; cart/checkout wait only for their own state. Required Suspense boundaries added. Shared queries use stable parameters and honor enabled state. Remote image optimization enabled. Stale search responses are cancelled/ignored. Banner index is bounded. | Measure actual Core Web Vitals with real catalog media; no numeric performance claim is made. |
| Content/privacy | INR shipping copy uses store settings; support wording is corrected. Cookie settings can be reopened; optional trackers initialize after acceptance. Order/reset/verification pages are excluded from optional tracking, first-party telemetry drops query/referrer secrets, and analytics choice is checked. | Review the full privacy copy, all tracking helpers, withdrawal behavior/cookie removal, and product-specific policies. This is not a legal compliance certification. |
| Operations | Production maintenance auth is required. Request-time schema DDL and automatic write replay were removed. Production abuse controls fail closed if Redis is unavailable. Added CI for lint, units, browser fixtures, and build. | Verify Redis, scheduled workers, backups, observability, recovery, environment limits, and deployment settings before launch. |

## Previous verification evidence (historical; superseded above)

- `npm run test:units`: **35 passed, 0 failed**. Includes brand ordering, price bounds, order transition rules, exchange window, product/add-on quote refresh, and a real-provider SSR snapshot regression test.
- `npm run lint -- --format json --output-file lint-results.json`: **0 errors, 42 warnings**. Remaining warnings are principally image usage and hook dependencies and are not all resolved.
- `npm run build -- --webpack`: production compilation and all 79 static-generation tasks passed on patched Next.js **16.4.6** before the final Redux server-snapshot change. The installed guides were read again after the update. The default Turbopack production builder is not the builder used for this verification. **The latest source still needs a full rebuild:** the final elevated build was declined, and the sandbox build then failed creating a Next output directory with `EPERM`. The final snapshot change has passed its dedicated SSR regression test, but that does not replace the full build.
- `npm run test:browser`: actual shared components with isolated fixture data; passed 3×3 layout at four widths, slider controls, keyboard dropdown, searchable form dropdown, draft multi-brand filtering, invalid price-range handling, Escape dismissal, and no browser errors.
- `node tests/browser/app-smoke.cjs`: runs against a separately started production app at `APP_TEST_URL` (default `http://127.0.0.1:3001`). All API calls are mocked. The journey reached the guest invoice after the mobile-cart and checkout-redirect fixes, but the strict test **failed** on React hydration error 418 during direct saved-cart loading. The subsequent explicit Redux server-snapshot fix passes an SSR regression test; the complete app browser test must be rerun after an approved successful rebuild. The test still treats the hydration warning as a failure; it was not suppressed.
- Dependency security: Next.js and its matching ESLint config updated to 16.4.6, followed by npm's non-breaking fixes. The latest completed audit-fix report has **0 high/critical** findings and **15 low/moderate** findings (4 low, 11 moderate), including tooling/email transitive dependencies. No forced downgrade/major upgrade was applied.
- `git diff --check`: passed at the recorded checkpoint. The original `src/lib/metaPixel.js` remains a one-line modification.

Browser artifacts are generated under ignored `test-results/`; they are fixture previews, not proof that the live catalog or providers have been exercised.

The last attempt to rerun browser fixtures inside the sandbox was also blocked from reaching its local HTTP server (`ERR_NETWORK_ACCESS_DENIED`). Earlier approved fixture browser runs passed. No additional elevated rebuild was attempted after it was declined.

## Previous database rollout blocker (now resolved)

Three migrations are prepared and previewable:

1. `drizzle/0001_brand_display_order.sql`: brand order and index.
2. `drizzle/0002_order_inventory_release.sql`: checkout idempotency key, inventory-release marker, delivery timestamp, exchange evidence link, and historical backfill.
3. `drizzle/0003_verified_identity.sql`: phone verification/session version fields, conservative phone-only identity backfill, and verified-phone uniqueness.

Use the dedicated runner, not an assumption that these files are already part of the older Drizzle journal:

```powershell
npm run db:migrate-hardening
npm run db:migrate-hardening -- --check
# Only after database trust, historical reconciliation, backup, and operator approval:
npm run db:migrate-hardening -- --apply
```

The preview command passed and performs no connection/write. The read-only preflight was attempted: sandbox DNS was blocked; outside the sandbox it failed with **`SELF_SIGNED_CERT_IN_CHAIN`**. Thus **no preflight counts are available and no migration was applied**. Configure a trusted database certificate/CA chain before proceeding; do not silently weaken TLS as a test workaround.

The apply command runs pending migrations in one transaction under an advisory lock and records successful versions. Duplicate normalized phone identities cause a safe failure rather than choosing an account arbitrarily. Historical failed/cancelled/approved-return orders are assumed to have released stock under the old implementation; compare inventory/provider records first because old partial failures cannot be repaired safely from status alone.

Do not deploy source that depends on these columns before the migration succeeds. Back up and review historical discrepancies separately; do not infer that adding flags repairs existing inventory or settlements.

## Remaining release gates after the successful migration and final build

- Supply the final production domain and hosting service/plan, configure deployment environment variables (including the maintenance secret), and rebuild for that domain. Configure and verify a frequent supported cleanup scheduler; the existing Vercel cron is still daily.
- Reconcile historical inventory against actual stock; the 17 backfilled status markers do not establish physical stock accuracy. Keep a provider-managed full backup; the local migration snapshot only preserves targeted fields.
- Run isolated database concurrency/failure tests and provider sandbox journeys for payment success/failure/retry/webhook ordering, phone sign-in/linking, email delivery, and carrier fulfillment.
- Verify dedicated `RAZORPAY_WEBHOOK_SECRET`, gateway capture behavior, courier production mode/pickup configuration, Redis, verified mail sender, application URL, and a supported frequent cleanup worker.
- Complete the remaining operational workflows and presentation/SEO follow-ups listed above; agree how staff record store credit, handle paid cancellations/late payments, and recover failed notifications.
- Review actual mobile/desktop catalog screenshots after the migration. Fixture browser tests establish UI behavior, not product authenticity, live counts, or provider readiness.

## Final release checkpoint

- All three migration records were read back after commit. The actual node-postgres client socket reports `encrypted: true`, `authorized: true`, and no authorization error. Supabase pooler backend `pg_stat_ssl` statistics describe a different connection and are not evidence of client TLS failure.
- Final `npm run build -- --webpack`: passed all 79 static-generation tasks on Next 16.4.6 after the login/email/tracking changes.
- Final lint: zero errors, 42 warnings. Unit tests: 44 passed. Database temporary-table lifecycle checks: passed. Shared UI browser fixtures: passed.
- Final built-app browser journey: passed filters, persistent-cart reload, guest COD checkout, order redirect, and invoice access with mocked APIs and no browser errors.
- Read-only live API smoke: home, brands, products, categories, settings, and auth-me return 200. Anonymous admin brands returns 403; customer orders and both maintenance routes return 401. Mobile live catalog/login render without browser errors; both phone controls measure 40px.
- `npm run check:production`: all configuration checks pass except the final public production URL. Configuration presence is not a provider integration test.
- Production preview is running at `http://localhost:3000` using `npm run start -- --port 3000`. Screenshots are in ignored `test-results/final-production-mobile-products.png` and `test-results/final-production-mobile-login.png`.

These are explicit release conditions. Local green checks do not certify the entire live ecommerce operation as production-ready.
