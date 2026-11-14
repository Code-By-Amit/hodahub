# UI regression fixes — 14 November 2026

## Follow-up: original width, slim footer and admin alignment

- Restored the original `56rem` content width as one shared `.store-container`. Header, category navigation, banner, brand slides, arrivals, bestsellers, promotions, customer stories, trust badges and footer now share the same outer edges and responsive padding. Five desktop product columns and mobile 3×3 brand slides are retained.
- Removed the footer's shop/customer-service/about link columns and promotional description. The compact footer retains the brand, social links, support/shipping/returns, legal links and working cookie settings.
- Admin filters use an explicit desktop grid from 1024px instead of a generated 1280px utility breakpoint. Search and four selectors share one row, including enlarged fonts; the search wrapper uses flex layout to eliminate the inline-input baseline gap. Tablet/mobile filters still stack responsively.
- Phone controls use an explicit two-column grid with a fixed 88px prefix and a shrinking number field. Conflicting trigger height/padding classes were removed. Both selectors and number fields remain 40px; the dial code cannot be ellipsized.
- Read-only inspection of the actual dev admin pages passed at 1440/1100px and 16/24px root fonts. A short-lived admin session was held only in memory; API writes were blocked and no session or credentials were saved. Browser fixtures also passed aligned section/footer widths, no quick-link columns, narrow-desktop filter alignment, mobile overflow and phone sizing.
- Final production build passed. The actual production admin pages passed the same alignment and prefix checks. Actual homepage container alignment/no-overflow checks passed at 1920/1440/390px and 16/24px root fonts; slim-footer and cookie-settings checks passed. Lint: zero errors, 42 warnings. Production preview remains at `http://localhost:3001`. Final screenshots are `test-results/aligned-home-arrivals-desktop.png` and `test-results/slim-footer-desktop.png`.

## Reported problems and causes

- Duplicate `omeg-a` keys: legacy brand labels were grouped by exact name while URLs were allocated separately. A registered brand and a legacy spelling could receive the same slug. This could also overwrite brand-detail lookup entries and produce inconsistent counts.
- Dropdown page jump: active options used `scrollIntoView`, which could scroll the whole document. Popups also first rendered without a measured position.
- Admin filters stacked across the full page: native selects were replaced with full-width wrappers inside an unchanged flex layout.
- Uneven inputs and clipped `+91`: old compact input styles and newer rem-based dropdown metrics conflicted, especially at enlarged base font sizes inside a fixed-width country field.
- Desktop brands used the mobile 3×3 layout. Homepage products used six narrow columns, oversized relative spacing, and a tall card content layout.

## Implemented corrections

- Brand aggregation resolves legacy spellings to registered identities before assigning URLs, preserves administrator ordering and custom slugs, merges counts/aliases, and reserves registered slugs. Category-scoped brand lists use the same algorithm. Product filters resolve canonical legacy aliases, including collision-suffixed URLs. Brand tiles defensively remove duplicate incoming slugs.
- Mobile/tablet brand slides retain nine tiles in a 3×3 grid. Desktop slides use five brands in one row. Both support native scrolling, snapping, arrows, keyboard controls, and reduced motion.
- Homepage arrivals/bestsellers and desktop catalog product grids use five columns. Cards have shorter image proportions on desktop, compact explicit typography/padding, a 36px cart action, and no empty review stars for products without reviews. Homepage product sections request ten items to fill two five-card rows.
- Shared input/dropdown metrics are 40px with consistent font size, line height and corners. Mobile text inputs use 16px text. Fixed-width phone controls use pixel-based spacing and an unshrinking dial-code label.
- Auth layout flex children explicitly allow shrinking. Large-font mobile forms no longer expand beyond the viewport, and vertically oversized auth cards can scroll from their top. The built-app regression includes a 24px-root mobile login overflow check.
- Dropdown geometry is measured in the opening event. Popups have a usable minimum width, fit the viewport, and prevent horizontal overflow. Active-option scrolling changes only the list's scroll offset. Focus restoration uses `preventScroll`.
- Admin product filters use a responsive grid: one row on wide desktop, two columns on tablet, one column on mobile. Brand display order matches the name/slug inputs. Logo upload accepts JPEG/PNG/WebP up to 5MB and displays the correct hint.

## Verification

- 46 unit tests passed, including regression tests for registered/legacy brand aggregation and custom-slug collisions.
- Browser fixtures exercise real shared/storefront/admin components with read-only mocked APIs. Passed mobile 3×3 and desktop five-brand layout, five desktop product cards, arrows, keyboard/search selection, deferred filters, validation, modal Escape, and duplicate-key detection.
- At a 24px root font, `+91` stays fully visible, both phone controls remain 40px, the popup has no horizontal scrollbar, and opening/selecting does not move page scroll.
- Actual admin components passed desktop filter alignment, mobile overflow, brand field height consistency, and settings phone/input alignment. Their fixture screenshots are under ignored `test-results/`; these use sample data and are not evidence of provider integration.
- Final lint: zero errors, 42 warnings. Final webpack production build passed all 79 static-generation tasks.
- Final built-app checkout regression passed with mocked APIs and zero browser errors. Real read-only catalog inspection returned 19 unique brand URLs out of 19 entries; `omeg-a` detail and product filtering both return 200. Actual homepage checks passed five desktop product/brand columns, a mobile nine-tile brand slide, and large-font login dropdown rendering without duplicate-key or browser errors.
- Production preview is running at `http://localhost:3001`. Port 3000 was already occupied, so its existing process was left running. Actual catalog screenshots: `test-results/live-desktop-new-arrivals.png`, `live-mobile-brands.png`, and `live-mobile-login-dropdown.png`.

These changes resolve the reported regressions. Provider journeys, final hosting/domain configuration, scheduling, reconciliation and operational launch requirements remain documented in `production-release-guide.md`; this UI pass does not certify every live ecommerce operation.
