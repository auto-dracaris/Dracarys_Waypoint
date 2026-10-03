# WayPoint web

A React, TypeScript, Vite, and Tailwind app built page by page from Figma. UI components use plain React and native HTML; icons use Material UI. No shadcn components are used.

## Run locally

From `web`:

```powershell
npm install
npm run dev
```

Open the address printed by Vite. The app opens Delivery Overview at `/`; `/login` opens Admin Sign In. Use Orders or `/orders` for Confirmed Orders, Planning or `/planning` for Final Plan Review and `/planning/published` for its publication preview, `/operations/loading-exception` for Loading Exception Review, and `/vehicles`, `/outlets`, and `/team` for management screens. Browser back/forward navigation works between these screens.

```powershell
npm run lint
npm run build
```

## Source structure

```text
src/
  app/                 App composition; future routing and providers
  pages/               Figma screens
  features/            Feature-specific components, behavior, and data
  components/
    ui/                Reusable plain React UI, added as patterns emerge
    layout/            Shared header, sidebar, and page shell
  lib/                 Shared utilities, added when needed
  styles/              Original Figma tokens and generated CSS
  assets/              Preserved images and fonts
  main.tsx             Browser entry point
  index.css            Global styles and token imports
```

Empty folders contain `.gitkeep` files to preserve the structure in Git.

Phase 1 of modularization provides shared Button, IconButton, Input, Select, Textarea, StatusBadge and Tooltip primitives, with styles owned by those components. Existing screens consume them while feature code retains validation and business state. See the [shared UI guide](src/components/ui/README.md) for props and examples. Search/filter composition, shared page sections and feature hooks remain later phases.

## Build page by page

1. Implement the first Figma screen in `pages` using plain React, Tailwind, and WayPoint tokens.
2. Keep business-specific behavior in its feature folder.
3. Extract repeated UI into `components/ui` and shared screen structure into `components/layout` as needed.
4. Pages import features and shared components; shared components should not import pages or features.
5. Use `@/` imports across folders and relative imports within a feature.
6. Compare each page with Figma and check responsive behavior before starting the next.
7. Use Material UI icons (`@mui/icons-material`) that match the Figma design as closely as possible. Do not download icons as SVG files.

## Design tokens

The original token export, generated CSS, generation script, fonts, and assets are preserved. Use `wp-*` and `type-*` utilities. See [the token guide](src/styles/README.md).

```powershell
npm run tokens:generate
```

Do not edit generated `src/styles/tokens.css` directly.

For every styling value, first use an exact match from the original WayPoint design token pack or its generated typography utilities. If the Figma value differs from the exported tokens, use the closest suitable existing token for spacing, color, typography, corners, icon sizes, and other styling. Do not introduce a hardcoded styling value or a new token when the pack has a suitable match. Keep exact image crops, screen-specific dimensions, responsive breakpoints, border widths, and data-driven progress percentages as layout values only where the export has no suitable equivalent; do not change the original export to disguise those exceptions.

## Shared sidebar

The shared sidebar supports expanded and collapsed Hub and Store Manager variants from the [Figma navbar component](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=496-4959). Its header now follows the [expanded navbar reference](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=238-1243): original logo, muted two-line Peliyagoda / Hub text without a pill background, and one panel toggle aligned to the right. The toggle combines matching Material UI panel/arrow icons, with its arrow changing direction for expanded/collapsed states. In the compact rail it sits beneath the logo, within the rail rather than overlapping page content. There is no separate Collapse label or cross button. The preference survives page changes and reloads through browser storage, with an expanded fallback when storage is unavailable. Mobile always uses the full labelled drawer regardless of the saved desktop preference; its panel button closes the drawer, as do Escape and the backdrop.

`src/components/layout/sidebar-navigation.ts` supplies one link configuration per role, reused in both sizes. Hub contains Overview, Orders, Planning, Operations, Vehicles, Outlets, and Team. Store Manager contains Overview, Orders, and Deliveries, correcting the mismatched Planning/Operations entries in Figma's collapsed variant. Correct Material UI icons replace its copied Home management icons. Operations remains available in both Hub sizes. The existing route determines the yellow active indicator and `aria-current`; toggling the sidebar does not navigate or reset page edits.

Collapsed links, the expand button, profile, and logout show labels on hover or keyboard focus. Escape dismisses those labels. Profile initials and logout remain visible in the compact rail instead of disappearing as in Figma. Profile opens a next-stage notice; Log out opens `/login` as local preview navigation, without changing an account session. The component accepts a role, profile details, and location label for future session integration. The running app remains the Hub preview; Store Manager pages and authenticated role wiring are deferred, with no role switcher or permissions implementation added by this UI change.

Sidebar styles are owned by `src/styles/sidebar.css`. Existing tokens provide the nearest suitable desktop widths (256 expanded / 80 collapsed), tablet width (224), and mobile drawer width (256), along with spacing, colors, typography, and radii. The original local logo and its proportions are preserved; no assets or SVG icons were downloaded. Responsive breakpoints, accessibility hiding, borders, layer order, shadow opacity, and the reduced-motion-aware 220 ms width transition remain explicit where the pack has no equivalent. Lint, build, all four server-rendered variants, active navigation across existing routes, preference persistence/storage fallbacks, and token audits pass. Browser visual, tooltip, and mobile interaction checks remain pending.

## Delivery Overview

Implemented from the [Figma Delivery Overview screen](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-26365): sidebar, header, active-route filters/search, vehicle preview, planning summary, and the subsequently requested DeliveryMap integration.

Route filters, search, the keyboard search shortcut, planning date selection, and mobile navigation work locally. Preview route data and planning totals are demo fixtures in `src/features/overview/data.ts`, not live service data. Changing the planning date updates the page labels; fixtures stay the same until backend integration.

`src/features/overview/components/delivery-map.tsx` adapts the supplied React Leaflet component with OpenStreetMap tiles, depot/vehicle markers, popups, and a token-themed route line. The map follows the same first matching vehicle as the details panel when search or filters change; an empty result hides the map and displays an explicit empty state. Vehicle popups use the selected record's actual preview status, including Scheduled and Needs attention. Map bounds update through `useMap` because initial MapContainer options do not respond to prop changes. A ResizeObserver refreshes the canvas during sidebar width changes and responsive layout changes. Scroll-wheel zoom remains disabled, and OpenStreetMap attribution remains visible.

`src/features/overview/map-data.ts` supplies illustrative coordinates around Colombo for the 15 existing vehicle previews, using three shared sample paths. These are not verified depot/outlet coordinates, live GPS positions, road routing, or ETA calculations. A Demo locations label stays visible. Replace the fixtures with the route API later. Invalid coordinates show an unavailable state; tile errors show a Retry action. Tiles require an internet connection. Leaflet and React Leaflet are installed with Leaflet TypeScript definitions; the browser map is loaded separately from the initial app bundle. Standard and retina marker PNGs and shadows come from the installed Leaflet package, with explicit icons instead of modifying global marker defaults. Marker geometry follows the provided component; route color, control/popup typography, focus styling, and responsive map sizes use current tokens.

Lint, production build, demo geometry/coordinate guards, independent fixture copies, marker assets, and token audits pass. Browser rendering, map gestures, tile retrieval, and sidebar resize behavior remain pending verification.

The Orders sidebar opens Confirmed Orders. Planning and Continue the Planning open Final Plan Review. Notification buttons open the shared Notifications panel. Links to route details and order-specific Overview decisions show a next-stage notice. Log out opens the login preview. Those remaining flows and authentication are not implemented yet. Original logo and vehicle artwork live in `src/assets/overview`; interface icons come from Material UI instead of downloaded SVGs.

## Admin Sign In

Implemented from the [Figma Admin Login screen](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-23532) at `/login`, without the dashboard sidebar. The page contains the original WayPoint brand lockup, centered logo/card, Admin Portal tag, email/password fields, Remember me, Forgot password, Log in, authorization notice, and copyright footer. Small or short viewports use a scrolling layout so the branding and footer cannot overlap the form.

The form lives in `src/features/auth/components/login-form.tsx`. Native required/email validation, password masking, autofill attributes, checkbox state, and keyboard submission are provided. The displayed email/password values are placeholders, not seeded credentials. A valid submission and Forgot password show explicit service-not-connected next-stage notices; neither authenticates, sends requests, saves credentials, or creates a persistent session. Remember me is a local form choice for future account integration. Log out navigates to this preview only; existing demo pages remain directly accessible. The monitoring/logging sentence is retained design copy, not evidence of an implemented audit service.

The complete original header lockup is preserved as a Figma-exported PNG in `src/assets/login/brand-lockup.png`; the card reuses the existing original logo with its proportions intact. The arrow uses Material UI; no interface SVG icons were downloaded. Existing tokens supply all colors, spacing, typography, radii, and control sizes. The closest suitable tokens replace the design's 440 px card width (480), 44 px field height (48), and 120 px logo width (128). Original branding geometry, borders, responsive breakpoints, and viewport/layout rules remain explicit where appropriate; the token exports are unchanged. Lint, build, token/asset audits, and server-rendered login routing/form checks pass. Browser visual and interactive verification remains pending.

## Vehicles Management

Implemented from the [Figma Vehicles Management screen](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-27012). It reuses the sidebar, plain React button, search/filter styling, and next-stage notice. The Vehicles item is active on this page.

The screen includes fleet summary cards, impact-review alert, vehicle inventory, and a details panel. Search, availability filters, column sorting, checkboxes, vehicle detail selection, date-range selection, and local availability updates are implemented. `src/features/vehicles/data.ts` contains the six populated Figma rows and original fleet summary totals. Empty design rows are noninteractive placeholders; the full 30-vehicle inventory is not supplied. The In Workshop filter can initially be empty because the provided rows are available vehicles. Availability edits update the sample rows and adjust the fleet totals relative to the initial counts; they reset on leaving/reloading the page. Allocation badges and draft trips are not recalculated by the local availability editor.

The date range updates the displayed range only; data remains a local fixture until integration. Draft trip details for VEH021 match Figma. Other vehicle detail fields use explicit preview defaults where Figma supplies no record; no live fleet information is inferred. Figma labels VEH021 as a Reefer truck in the table and Refrigerated van in the details banner; both labels are retained.

Trip links, impact review, and column customization display next-stage notices. The original van image is saved in `src/assets/vehicles/van.png`; logo and texture reuse existing identical artwork. Colors, typography, spacing, radii, and control/icon sizes use existing tokens or the nearest suitable match. Exact artwork crop geometry, responsive breakpoints, border widths, and opacity remain explicit where the pack has no equivalent.

## Outlets Management

Implemented from the [Figma Outlets Management screen](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-27116) at `/outlets`, with the active Outlets sidebar item. It reuses the app shell, buttons, date-range picker, table/search styling, and next-stage notice.

Includes the three original summary values (72, 12, 18), outlet inventory, delivery requirements, next-delivery preview, and recent activity. Search (including Ctrl/Cmd+K), allocation filters, sorting, checkboxes, row selection, date-range selection, requirement editing, and availability editing work locally. Receiving windows must end after they start on the same day; required text fields cannot be blank. Edits update the table/details and reset on leaving/reloading this page. They do not recalculate delivery assignments or summary metrics.

Figma provides six populated outlet records and four empty visual rows, but its tabs show eight records and no allocation status per row. The preview uses six records with explicit sample allocation statuses, defaults to All, and derives tab counts from those records (6/3/3/0). Placeholder rows are disabled and never included in counts. The copied Vehicles breadcrumb and VEH021/Refrigerated van banner labels are replaced with Outlets and the selected outlet ID/brand. The three repeated Confirmed orders metric labels are retained because distinct meanings are not supplied.

Only OUT014 has a complete detail reference. Other outlets use their actual Figma table values with shared preview depot/delivery-point/next-delivery/activity defaults; these are not live outlet records. Date selection changes the displayed range only. View orders and column customization show next-stage notices. Notifications opens the shared panel.

The original store artwork is saved in `src/assets/outlets/store.png`; the texture was verified identical to `src/assets/overview/texture.png` and is reused. All interface icons use Material UI. Colors, typography, spacing, corners, and icon sizes use existing tokens; exact artwork crop geometry, border/focus widths, and responsive breakpoints are explicit layout exceptions. The token source and generated CSS are unchanged.

## Team Management

Implemented from the [Figma Team Management screen](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-27201) at `/team`, with the Team navigation item active. Uses the shared shell, buttons, date-range picker, table/search styling, and next-stage notice. The feature's data, roster, and work/trip panel are in `src/features/team`.

Search by name, staff ID, role, depot, or vehicle assignment; Ctrl/Cmd+K focuses search. Role filters, column sorting, staff selection, empty states, and date-range selection work locally. The six supplied Figma records contain four drivers and two loaders. Filter counts are derived from those records (6/4/2), default to All, and replace the inconsistent design counts of 8/3/5. The copied Vehicles breadcrumb is corrected to Team. Original summary values and repeated Confirmed orders labels (72/12/18) are retained as static Figma fixtures, not workforce totals.

Nimal Silva's work details, two trip statuses, stop progress, next stop, and 11:20 update time match the reference. Other staff retain their supplied table assignments; unsupplied trip details are explicitly marked for the next stage, loaders show their depot assignment, and Ruwan has no assigned trips. No trips are inferred. Dates change the displayed range only; roster and summaries remain demo data.

View vehicle opens `/vehicles?vehicle=<id>` with that vehicle selected. Vehicle query selection follows browser history. Trip cards and View trips in Operations display next-stage notices until those screens are built. Notifications opens the shared panel.

The original driver illustration is saved in `src/assets/team/driver.png`; the banner texture was verified identical to the existing Overview texture and is reused with the original Figma crop. Icons come from Material UI. Existing tokens supply colors, typography, spacing, corners, and control/icon sizes. Explicit layout exceptions are image crop geometry, the staff column width, border/focus widths, and responsive breakpoints. Original token files are unchanged.

## Confirmed Orders – Vehicle Selection

Implemented from the [Figma Vehicle Selection screen](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-26506) at `/orders`, with Orders active in the sidebar. `src/features/orders` owns the order fixtures, filtering and assignment rules, table, allocation panel, vehicle-option cards, and Defer Order dialog.

The four original supplied order rows plus DEMO-106 from Allocation Review and DEMO-108 from the deferral dialog, requested-run/cutoff text, DEMO-102 summary, VEH008 capacity/arrival/fuel/trip preview, and blocked VEH015 option follow Figma. DEMO-102 and DEMO-106 have full delivery constraints and vehicle options; other records retain their supplied data and show explicit notices for missing assignment details. No missing vehicle capacities, delivery windows, or assignments are inferred. These order-option fixtures remain independent of the management fleet sample, including vehicles with the same ID.

Search, Ctrl/Cmd+K, allocation filters, sorting, checkboxes, order selection, panel close/reopen, and local assignment work. All defaults to the six supplied records, with derived counts 6/3/3/0. The header decision count follows local unallocated orders. Assignment validates option ownership, cargo suitability, volume, weight, delivery window, fuel, and daily trip limit; blocked, incomplete, already allocated, or deferred records cannot be assigned. VEH015 is disabled for DEMO-102 with its 0.3 m³ capacity reason; VEH021 is disabled for DEMO-106 with its 1.2 m³ capacity reason. VEH008 and VEH012 can each be assigned once to their respective orders; the order status, tab counts, header decision count, and confirmation update. Assignment returns to All and clears search so the result remains visible.

Changes are local to the mounted page and reset on navigation/reload. They do not update Overview totals, management fleet data, or a backend. The blocker copy avoids claiming both options are based at Colombo because Figma lists VEH015 at Kelaniya. Notifications opens the shared panel; column customization shows a next-stage notice. Defer order opens a modal within Orders; it does not navigate to another page.

No new artwork is required: the existing original logo is reused, and every interface icon uses Material UI rather than downloaded SVGs. Colors, typography, spacing, radii, icon sizes, and progress tracks use existing tokens. Capacity progress uses native HTML progress values. Table/option layout proportions, border/focus widths, and responsive breakpoints remain explicit layout values; original token files are unchanged.

The Orders page starts without a selected row and Delivery planning uses the full width. Clicking an order opens Allocation Review; closing it (or pressing Escape inside it) clears the active row and returns focus to that row's button. Bulk checkboxes are independent of the review selection. A filter/search that hides the selected order also clears its review; clearing filters does not auto-select another row. Table resizing and panel fade/slide use a 280 ms transition, with the panel stacked below the table on smaller screens. The exit content remains mounted in an inert, hidden, collapsed slot so it cannot receive focus while closing. Reduced-motion settings disable these transitions. Animation timing is an explicit value because the exported token pack has no motion tokens.

The [Figma Defer Order dialog](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-26716) opens from the selected unallocated order. DEMO-108 supplies the exact Fresh — Biyagama, Chilled, Van only, 300 kg, 1.2 m³, requested delivery date, warning, and initial details reference. Its missing vehicle options and delivery window remain explicitly unsupplied. Other orders show their own values and no invented requested date or details. The reason dropdown currently includes the one reason supplied by Figma.

Confirm deferral requires that reason and an unallocated order, stores the optional details, changes the status to Deferred, and updates filters and the decision count. It returns to All and clears search to keep the result visible. Cancel, close, and Escape discard edits; the native dialog contains keyboard focus and returns focus to the trigger or order row on confirmation. The delivery expectation stays unconfirmed. Store update text is a preview only; no message is sent and no backend or future delivery run is created. Modal entrance respects reduced motion and retains the existing review-panel animation.


## Final Plan Review

Implemented from the [Figma Final Plan Review screen](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-27368) at `/planning`. Planning is active in the shared sidebar. The Overview Continue the Planning action and Vehicles planning link open this route; back/forward navigation and the page title follow it. Operations opens Loading Exception Review at `/operations/loading-exception`.

The five summary cards, three vehicle/trip tables with nine stops, seven passed constraint labels, and two deferred-order cards match the supplied design. Counts are derived from that snapshot: 11 confirmed, 9 assigned, 3 routes, 2 deferred, 0 issues. Feature components and data live in `src/features/planning`. The page reuses the app shell, shared buttons, native date control styling, fleet stat styling, and next-stage dialog. All interface icons use Material UI, and the existing original logo is reused; no new artwork or SVG icons are downloaded.

The native delivery-date picker defaults to 29 September 2026. Figma labels that date Monday, but it is Tuesday; the weekday is computed correctly and the deferred-order description refers to the delivery sequence. Only that date has a reviewed plan fixture. Other dates show empty schedules and pending validation, with publishing disabled. Returning to the reviewed date restores the supplied plan. The passed validation is a Figma fixture, not a live capacity/fuel/cargo check. This plan's order/outlet/load values differ from the Orders screen fixtures and stay independent; local Orders edits do not update it.

Publish plan creates a local publication snapshot and opens Publish Plan Confirmation at `/planning/published`. Returning to review shows View published plan and retains the existing publication instead of recreating it. No live plan is dispatched or sent to a backend. Route tables scroll horizontally when necessary; summary cards and the review sidebar stack on smaller screens. Colors, typography, spacing, radii, control/icon sizes, table column sizes, and panel widths use existing tokens or the closest suitable match. Breakpoints and border/focus widths remain explicit layout values. Original token files are unchanged. Lint, production build, fixture checks, and server-rendered markup checks pass; browser visual verification remains pending.

## Publish Plan Confirmation

Implemented from the [Figma Publish Plan Confirmation screen](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-27589) at `/planning/published`. Publish plan opens it from Final Plan Review; Planning stays active in the shared sidebar. Breadcrumbs return to review or Overview, and the page title and back/forward navigation follow the current route. Directly opening this URL loads the same demo publication fixture.

Includes the success banner, v2.1 publication metadata, four summary cards, four team-notification rows, status badges, Plan Lock State card, and both viewing actions. Counts derive from the reviewed snapshot: 3 trips, 3 distinct assigned vehicles, 9 assigned orders, 2 deferred orders. Figma's copied Confirmed orders label with value 3 is corrected to Vehicles assigned, consistent with its component property. The supplied publication date/time remain 28 September 2026 at 05:42 AM; its Saturday label is corrected to Monday. The delivery date remains 29 September 2026. Dinesh's assignment uses VEH015's actual Trip 1 from the reviewed snapshot, correcting the publication screen's inconsistent Trip 3 label.

The local publication owns a copy of the reviewed routes, stops, deferred records, and constraints. Invalid/unreviewed dates cannot publish. Publication and resend state remain in the app during navigation and reset on reload. Duplicate publishing reopens the existing snapshot. Staff delivery/acknowledgement statuses are supplied Figma fixtures; they do not come from mobile devices. Resend is available only for the Sent row, updates its local preview timestamp, retains Sent status, and explicitly reports that no notification was sent. It never contacts an external notification service. View acknowledgements filters the table to its two acknowledged records; Show all restores the complete table. View published trips reveals the snapshot's schedules and deferred orders, with keyboard focus and reduced-motion-aware scrolling.

Print Plan Manifest opens the browser's print dialog. Print styles show the same snapshot's schedules, version, depot, delivery date, deferred orders, and preview label while hiding navigation and action controls. Actual print output and browser visual behavior remain unverified. The Plan Lock State text describes the intended future version/notification behavior; there is no editing, v2.2 creation, live publication, or automatic notification delivery in this preview.

Shared buttons, app shell, stat styling, badges, and route schedule components are reused. Interface icons use Material UI and existing original brand artwork is retained. No new images or SVG icons are downloaded. All colors, typography, spacing, corners, icon/control sizes, and column/panel widths use existing or closest suitable tokens. Print behavior, layout proportions, breakpoints, and border/focus widths are explicit layout rules. Original design tokens are unchanged. Lint, build, publication/resend guard checks, routed server rendering, acknowledgement filtering, and token audits pass. Operations now opens Loading Exception Review.

## Loading Exception Review

Implemented from the [Figma Loading Exception Review screen](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-27692) at `/operations/loading-exception`, with `/operations` as an alias. The Operations sidebar opens it and stays active; the copied Planning breadcrumb/active state in Figma is corrected to Operations. The page title, mobile menu, and back/forward navigation follow this route. Its feature components, demo record, consequence previews, and decision guards live in `src/features/operations`.

The discrepancy details match DEMO-101, Keells - Colombo 04, VEH021 Trip 1, 48 required cases (340 kg), 8 missing, 4 damaged, 36 loaded, the loader report, the original store notes, and revised 255 kg / 1.8 m³ values. Figma's Saturday label for 28 September 2026 is corrected to Monday. This operations snapshot concerns 28 September, while the existing reviewed/published delivery fixture concerns 29 September; they remain independent rather than silently changing a different run. Store contact and stock statements are supplied sample notes, not evidence of real calls or inventory checks.

Native radio controls select Correct the load, Approve partial delivery (the design default), or Hold and replan the trip. The consequence preview changes with the choice. Partial approval requires nonblank reason/store notes, reconciled case counts, valid supplied weight/volume, and a valid audit timestamp. Confirmation saves a trimmed local decision and updates the departure badge/banner. Correcting the load and replanning keep departure Held; partial approval marks it Approved in this preview. Confirmation then locks the controls and prevents duplicate decisions. The record and timestamp remain in app state through navigation and reset on reload.

The partial consequence refers to the affected order's 255 kg load, correcting Figma's wording that would incorrectly replace the entire multi-stop trip payload with one order's weight. Store shortage text is a proposed notice rather than an already-sent message. Replacement confirmation, route recalculation, v2.2 validation/publication, live fleet departure, and notification delivery are not performed. Hold/replan records the request only; it does not create an unvalidated route or alter the previous published snapshot. Audit logging is local demo state, not a backend audit service.

The page reuses the shared shell, buttons, breadcrumb/stat primitives, and planning card/badge styling. Interface icons use Material UI; the existing original logo remains the only artwork. No SVG icons or new images are downloaded. Colors, typography, spacing, corners, control/icon sizes, and panel width use existing or closest suitable design tokens. Explicit layout rules cover borders/focus widths, responsive grid proportions, and breakpoints; original token files are unchanged. Lint, build, all three decision outcomes, invalid/duplicate decision guards, required notes, immutable updates, routed server rendering, and token audits pass. Browser visual and interactive checks remain pending.

## Notifications panel

Implemented from the [Figma Notifications panel](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-26998). The existing notification buttons on Overview, Vehicles, Outlets, Team, and Orders open it over the current page. Components and fixtures live in `src/features/notifications`; the native modal dialog contains keyboard focus, supports Escape, close and outside-click dismissal, and restores the trigger on dismissal. The underlying page stays mounted, preserving local edits. Panel content scrolls within the available viewport; the entrance animation respects reduced motion.

All, Errors, Success, and Info filter the four supplied cards. Counts are derived as 4/2/1/1 instead of the design's inconsistent 7/3/2/2; Errors groups the shortfall and chilled-vehicle warning. Mark All Read and individual unread dots update local read state, which survives navigation and resets on reload. Opening an action marks that card read. Read status does not resolve operational issues or remove cards from category counts. Notification timestamps and delivery assertions are Figma fixtures, not live events; no external service is contacted.

The DEMO-103 and DEMO-108 actions open `/orders?order=<id>` with the actual matching order selected, including when Orders is already open. Query selection follows browser history, clears filters that would hide the record, and ignores unknown IDs. Opening the panel preserves Orders edits; selecting an order through it keeps those edits while that page remains mounted. DEMO-103 is not redirected to the unrelated DEMO-101 loading exception, and its unsupplied shortage quantities remain unavailable. DEMO-108 retains its existing unavailable vehicle options and deferral flow.

The copied Reassign Vehicle actions on the completed delivery and late-departure cards are corrected to View delivery and View run. Those unsupplied detail views show next-stage notices for DEMO-109 and R-042. The copied green information-card border uses the appropriate blue token. Other colors, spacing, typography, radii, and sizes use exact or closest suitable original tokens. Icons use Material UI; unread dots are CSS shapes. No images or SVG icons were downloaded, and original token files are unchanged. Borders, shadow opacity, responsive layout, and motion timing remain explicit where the export has no equivalent. Lint, production build, filter/read-state guards, supplied order destinations, routed server rendering, and token audits pass. Browser visual, keyboard, and animation verification remains pending.

## Confirmed Orders – Chilled Allocation Review

Implemented from the [Figma Allocation Review design](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=921-27272) within Orders. Select DEMO-106 in the table or open `/orders?order=DEMO-106`. The page still starts with full-width Delivery planning and no selected order when no query is supplied. The existing review panel, animation, vehicle-option controls, assignment guards, and Defer Order dialog are reused.

The supplied order is Fresh - Ja-Ela in Gampaha, Chilled, 410 kg, 2.9 m³, with a 06:00–08:00 delivery window. VEH012 · New trip 1 is a Refrigerated truck at Peliyagoda, selected by default: 410 / 2,500 kg, 2.9 / 16 m³, 07:10 arrival, 8 L required / 24 L remaining, and 1 / 2 daily trips. VEH021 · Trip 1 is the blocked alternative with only 1.2 m³ remaining. Its unsupplied capacities and timing remain null. Assignment saves VEH012 and New trip 1 locally and prevents duplicate assignment. Deferral uses this order's own supplied summary and does not invent a requested delivery date.

Figma shows DEMO-106 in the panel while highlighting DEMO-102 in a copied four-row table and marking Planning active. The preview includes the actual DEMO-106 row, highlights that selected order, and keeps Orders active. Counts follow the six provided records across the Orders designs instead of the inconsistent eight-record tabs. The separate DEMO-108 notification still opens DEMO-108; it does not borrow DEMO-106's vehicle options. No live fleet availability, trips, notifications, or backend data are updated.

All interface icons use Material UI and the existing original logo is reused. No new assets are required. Existing tokens supply colors, typography, spacing, radii, and sizes; original token files remain unchanged. Lint, production build, chilled/dry assignment checks, capacity/cargo/window/fuel/trip-limit guards, duplicate/deferral guards, routed server-rendered markup, and token audits pass. Browser visual and interactive verification remains pending.
