# Production release handoff

The local release now builds and its migrations are applied. This document identifies the deployment and operational checks still required before accepting customers.

## Deploy the verified source

1. Confirm the final HTTPS domain and hosting service/plan. Set `NEXT_PUBLIC_APP_URL` to that domain before building. Update Google callbacks, MSG91 allowed domains, and Razorpay webhook URLs to match.
2. Transfer the required secrets securely to the deployment environment. Do not commit `.env.local` or print secret values in logs. `CRON_SECRET` was newly generated locally and needs to be configured on the deployment and the scheduler with the same value.
3. Include `prod-ca-2021.crt` in the deployed application, or configure `DATABASE_SSL_CA` with its PEM contents / `DATABASE_SSL_CA_FILE` with a readable deployed path. This is a public trust certificate, not a private key. Application and migration connections enforce certificate verification. The current Next payment route trace includes the root certificate.
4. Run `npm run check:production` against deployment environment values. This checks configuration presence/modes only, not actual service delivery.
5. Run lint, units, UI browser checks, and `npm run build -- --webpack`. The final local webpack build passed. The default Turbopack production builder has not been independently certified.
6. Deploy only after the provider/operations checks below. Do not run `db:push` as a substitute for the reviewed migration runner. The three hardening migrations are already committed and recorded on the configured database.

## Verify providers and recovery

- Complete Razorpay **test-mode** success/failure/retry and duplicate/out-of-order webhook journeys in a separate test environment. Current local configuration contains live payment credentials; automated browser checks therefore mock payments and do not create charges. Verify capture amount/currency, reservation expiry, late-capture reconciliation, and operator refunds.
- Verify MSG91 phone delivery, identity binding, rejection/replay, and Google sign-in on the final domain.
- Verify Resend sender/domain, OTP/reset delivery, order confirmations, and support-form failure recovery using controlled recipients. Missing provider configuration now fails instead of claiming email delivery.
- Verify courier serviceability, pickup location, package details, and fulfillment recovery in the carrier's supported test workflow. Do not create paid live shipments as a smoke test. Missing/failed tracking no longer produces a fictional timeline.
- Verify deployed Redis availability and abuse protection. Production rate-limit failures deny protected requests.

## Schedule maintenance

- Call `/api/orders/cleanup` every five minutes from a supported authenticated scheduler with `Authorization: Bearer <CRON_SECRET>`. Actual scheduling depends on the hosting plan. Existing Vercel configuration runs only daily and is not sufficient for a 15-minute reservation policy. The cleanup processes at most 100 orders per call; monitor backlog and size worker frequency/capacity for actual traffic.
- Schedule `/api/cron/sync-shipment-tracking` at an interval compatible with the courier's rate limits and host execution budget, with the same authentication contract. The current handler processes at most 100 shipments per call. Confirm all shipments are serviced as volume grows.
- Verify scheduler delivery and failure alerts, not only configuration. Do not put the secret in URLs or public cron logs.

## Operational gaps that code checks do not close

- Maintain provider-managed full backups and test restoration. The ignored `.local-backups/` files are targeted migration snapshots only.
- Reconcile actual stock for the 17 historical backfill candidates (15 cancelled/pending, one delivered/refunded approved return, one pending/failed). No stock quantities changed during the migration.
- Staff still need return receipt/inspection, exchange shipment, store-credit/refund accounting, paid-cancellation/late-payment reconciliation, and failed-notification recovery procedures. A durable notification outbox/retry worker is not implemented.
- Isolated PostgreSQL tests cover transaction rollback/idempotency but not multi-connection contention or every checkout/provider failure. Do not equate a mocked browser journey with a completed live provider integration test.
- Review remaining hook/image lint warnings, product-specific SEO/SSR, consent withdrawal behavior, and actual production Core Web Vitals. No measured performance score or complete legal compliance certification is claimed.

## Verified local commands

```text
npm run lint -- --format json --output-file lint-results.json
npm run test:units
npm run test:database
npm run test:browser
npm run build -- --webpack
npm run start -- --port 3000
```

`test:database` exercises actual lifecycle code with connection-local temporary PostgreSQL tables; it does not modify public order or catalog rows. `tests/browser/app-smoke.cjs` exercises the built app with API responses mocked. Run it with `APP_TEST_URL` pointing to the preview.
