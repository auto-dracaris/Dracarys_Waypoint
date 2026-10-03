# WayPoint web component and modularization report

Reviewed: 3 October 2026. Scope: all nine pages in `web/src/pages`, their feature components, shared components, application composition, and styles. The findings below preserve the source audit before Phase 1; the implementation update records subsequent work. The separate `frontend/` application is outside this report.

## Figma-based phases and implementation update

The [Component Set reference](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=37-293) establishes reusable primitives before composed controls. This sequence supersedes the original source-audit development order later in this document.

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Shared Button, IconButton, Input, Select, Textarea, StatusBadge and Tooltip foundations, clear native props and component-owned styles | Implemented and adopted in existing consumers |
| 2 | FormField, SearchField, SegmentedControl, breadcrumbs and native dialog shell | Pending |
| 3 | Repeated page headers, statistics, table headers and detail-panel shells | Pending |
| 4 | Feature controllers/hooks for selection, filtering, sorting and dialog behavior | Pending |
| 5 | Gradual page composition cleanup and regression/visual verification | Pending |

Phase 1 removes shared button/focus rules from Overview, disabled-button rules from Vehicles, repeated form-control rules, allocation/planning badge rules and sidebar-specific tooltip machinery. Features retain their validation, state, labels, fixture data and status-to-tone mappings. Original tokens, artwork, application routing and `frontend/` are unchanged. [The shared UI guide](../src/components/ui/README.md) documents props, usage and the boundaries for later phases.

Validation: `npm run check:ui`, `npm run lint`, `npm run build` and the whitespace check pass. Focused checks cover native prop/ref forwarding, loading guards, semantic output, nine rendered routes, URL-selected order review, four sidebar variants, allocation status mapping and shared token/dependency ownership. The build retains the existing Vite configuration warning. Browser visual, tooltip interaction, mobile interaction and focus restoration checks remain pending; server rendering does not verify them.

## Assessment

The current structure is a useful foundation. Pages, feature components, shared UI, layout, data, and tokens already have separate folders. The main improvement is to extract patterns that now repeat across those folders and make each component own its styling. A rewrite or a new UI library is unnecessary for these changes.

The highest-value work is shared headers, search/filter controls, summary cards, table primitives, and dialog behavior. Orders also needs its page state moved into its own feature controller. Keep business rules and Figma-specific artwork inside their features.

Existing reusable pieces worth keeping:

- `Button`, `DateRangePicker`, and `StageNotice` in `components/ui`.
- `Sidebar` and its role-specific navigation configuration in `components/layout`.
- `RouteSchedule`, already reused by Final Plan Review and the published manifest.
- Feature components such as `FleetDetails`, `OutletDetails`, `TeamDetails`, `AllocationPanel`, `VehicleOption`, `NotificationCard`, `LoadingDiscrepancy`, and `LoginForm`.
- Pure assignment, deferral, loading-decision, publication, and notification helpers. Their validation should remain independent of shared visual components.

## Review of every page

| Page | Current separation | Recommended extraction | Keep in its feature |
| --- | --- | --- | --- |
| [Delivery Overview](D:/Git/Dracarys_Waypoint/web/src/pages/overview-page.tsx:8) | Already composes ActiveRoutes and PlanningSummary. | PageHeader and DecisionNotificationAction. Within ActiveRoutes, share SearchField, FilterGroup, search shortcut, and EmptyState. Consider ProgressMeter and detail rows when migrating the existing panels. | ActiveRoutes selection, map coordinates/viewport behavior, VehiclePanel artwork and trip content, PlanningSummary allocation/intake rules. |
| [Vehicles](D:/Git/Dracarys_Waypoint/web/src/pages/vehicles-page.tsx:16) | FleetSummary, FleetTable, FleetDetails, and AvailabilityEditor exist. The page still owns filtering, sorting, checkbox state, URL selection, availability edits, and totals. | PageHeader, Breadcrumbs, SearchField, FilterGroup, StatCard, table primitives, DetailPanel shell, Modal shell. Move its state/actions into useVehiclesManagement; move filtering/totals calculations into vehicle selectors. | Availability updates, fleet totals relative to the supplied fixtures, vehicle-specific columns, capacities, and draft trips. |
| [Outlets](D:/Git/Dracarys_Waypoint/web/src/pages/outlets-page.tsx:19) | Table, details, editor, and selectors exist. | Same management header/toolbar primitives as Vehicles. The summary-card markup closely matches Team. Share StatCard, DetailRows, table selection controls, and dialog shell. Consider useOutletsManagement for edits and selection. | Receiving-window validation, access requirements, availability, outlet activities, and outlet artwork/crop. |
| [Team](D:/Git/Dracarys_Waypoint/web/src/pages/team-page.tsx:18) | TeamTable and TeamDetails exist; the page is relatively small. | PageHeader, Breadcrumbs, SearchField, FilterGroup, StatCard, SortableHeader, EmptyState, and DetailPanel shell. A small useTeamRoster hook is optional after common UI extraction. | Role filters, staff identity cells, vehicle links, work details, and trip content. Do not add bulk checkboxes just to match other tables. |
| [Confirmed Orders](D:/Git/Dracarys_Waypoint/web/src/pages/orders-page.tsx:18) | OrdersTable, AllocationPanel, VehicleOption, and DeferOrderDialog exist. The page coordinates many related state variables and effects. | Shared header/search/filter/table primitives. Extract useOrderAllocationReview or a feature reducer for URL selection, panel state, assignment, deferral, and messages. Extract an OrderRequirementTags component used by AllocationPanel and DeferOrderDialog. | Eligibility rules, order/option ownership, capacity/window/fuel/trip guards, selected-row focus, panel exit animation/inert state, and deferral behavior. |
| [Final Plan Review](D:/Git/Dracarys_Waypoint/web/src/pages/final-plan-review-page.tsx:16) | RouteSchedule and PlanReviewSidebar already separate the domain views. | PageHeader, Breadcrumbs, StatCard/StatGrid, DateInput, and EmptyState. | Reviewed-date checks, plan totals, validation constraints, deferred orders, and publishing eligibility. |
| [Plan Published](D:/Git/Dracarys_Waypoint/web/src/pages/publish-plan-confirmation-page.tsx:19) | TeamNotifications and RouteSchedule are reused. Manifest, action panel, and feedback remain inline. | Header, Breadcrumbs, StatCard, StatusBanner, and InlineFeedback. Extract PublishedPlanManifest into the planning feature; optionally extract PublishedPlanActions to isolate acknowledgement/trip controls. | Publication snapshot, resend preview state, acknowledgement filters, manifest content, focus/scroll behavior, and print-only rules. |
| [Loading Exception Review](D:/Git/Dracarys_Waypoint/web/src/pages/loading-exception-review-page.tsx:14) | LoadingDiscrepancy and LoadingActionOptions are separated. | PageHeader, Breadcrumbs, StatusBanner, InlineFeedback, and Field primitives. Extract LoadingConsequencePreview from the page into operations. Consider useLoadingDecision for action, notes, error, and confirmation handling. | Quantity reconciliation, departure decisions, decision locking, store notes, and consequence generation. |
| [Admin Sign In](D:/Git/Dracarys_Waypoint/web/src/pages/login-page.tsx:6) | LoginForm is already separate; the page is small and clear. | Reuse basic FormField/Input primitives once those also serve editors and loading notes. Keep its independent login layout. A brand component is optional if identical brand slots repeat later. | Account-service connection notices, login form behavior, original brand geometry, and portal copy. Do not wrap this page in the dashboard shell. |

## Shared components to introduce

These are proposed components, not components already implemented by this audit. Counts below describe source consumers, not browser verification.

| Priority | Component | Evidence and consumers | Suggested responsibility |
| --- | --- | --- | --- |
| First | PageHeader | The title/mobile-menu pattern repeats on all eight dashboard pages. [Vehicles header](D:/Git/Dracarys_Waypoint/web/src/pages/vehicles-page.tsx:58), [Orders header](D:/Git/Dracarys_Waypoint/web/src/pages/orders-page.tsx:106). | Title, optional description, menu control, and an actions slot. Leave date controls, print buttons, and decision badges to callers. |
| First | Breadcrumbs | Repeated in Vehicles, Outlets, Team, Final Review, Published, and Loading Review: six pages. | Explicit items with IDs, labels, optional navigation, and one current item. Never infer a route from visible text. |
| First | SearchField + useSearchShortcut | Five input/keyboard-shortcut implementations: ActiveRoutes and the four management/order pages. | Controlled value/change callback, input ref, accessible label, icon, shortcut hint, and modal-aware shortcut enablement. |
| First | FilterGroup | Repeated in those five views plus NotificationsPanel: six consumers. | Controlled options, optional counts, selected value, and pressed-state semantics. Keep count calculation and filter rules outside it. These are filter buttons, so preserve `aria-pressed` rather than introducing tab semantics. |
| First | StatCard / StatGrid | FleetSummary, Outlets, Team, Final Review, and Published: five views. | Icon, label, value, tone, and layout options. Do not hardcode the copied “Confirmed orders” label or derive values from unrelated fixture sets. |
| First | DecisionNotificationAction | Same action on Overview, Vehicles, Outlets, Team, and Orders. | Put this domain-specific reusable action in `features/notifications/components`. Receive the count and open callback; preserve the current static versus derived-count distinction. |
| Next | SortableHeader, TableViewport, TableEmptyState, RowCheckbox, AddColumnAction | Four sortable tables: FleetTable, OutletTable, TeamTable, OrdersTable. They repeat sort icons and `aria-sort`; three repeat bulk checkboxes and Add Column. | Extract common mechanics and accessibility. Keep typed column definitions, row rendering, and business selection inside each table. |
| Next | Modal / useDialogLifecycle | StageNotice, AvailabilityEditor, OutletEditor, DeferOrderDialog, and NotificationsPanel all use native dialogs with different lifecycle handling. | Open/close synchronization, dismissal, labeling, cleanup, optional scroll lock, and configurable focus restoration. Preserve native dialog behavior. Drawer layout and forms remain separate. |
| Next | DetailPanel / DetailRows | FleetDetails, OutletDetails, and TeamDetails repeat panel/header/body/footer structure; label/value rows also occur in Overview and allocation previews. | Use slots and small layout variants. Keep exact artwork crops, content, field formats, and domain-specific empty states in feature components. |
| Next | StatusBadge, StatusBanner, InlineFeedback, EmptyState | Allocation, trip, notification, publication, loading, and table views repeat these visual patterns. | Explicit tone, accessible text, optional icon/action. Distinguish informational content from `role="status"` updates and `role="alert"` errors; do not announce every banner as an error. |
| Later | FormField, TextInput, SelectField, TextareaField, DateInput | Login, both editors, deferral, loading notes, date controls. | Reuse labels, required indicators, IDs, helper/error text, focus styling, and native attributes. Feature validation remains outside. |
| Later | ProgressMeter | Overview vehicle progress, planning allocation progress, and order capacity previews. | Accessible label, value, maximum, and presentation variants. Preserve each calculation and unit; guard zero totals instead of putting business calculations into the component. |

For the tables, begin with small primitives. A typed `DataTable<T>` becomes useful only if the migrated tables still repeat enough structure. Do not force staff avatars, placeholders, bulk selection, allocation badges, and order review into a large component full of feature flags. RouteSchedule and TeamNotifications have different table behavior and already have appropriate feature ownership.

The repeated requirement tags in AllocationPanel and DeferOrderDialog belong in the Orders feature, rather than in global UI: they know about chilled cargo, van-only access, weight, and volume.

## Styling and module ownership

The strongest architectural coupling is stylesheet ownership:

- [overview.css](D:/Git/Dracarys_Waypoint/web/src/styles/overview.css:6) defines shared Button, icon button, search/filter, date input, focus, and StageNotice styles. App imports it globally, so unrelated pages—including login—receive shared styling through the Overview feature stylesheet.
- [vehicles.css](D:/Git/Dracarys_Waypoint/web/src/styles/vehicles.css:84) owns the shared DateRangePicker styles. It also defines shared breadcrumbs, statistics, tables, panels, editor fields, and the global disabled-button rule. Seven pages import it, including three planning/operations pages.
- Loading Review imports `planning.css` to obtain shared-looking card/badge styles. Cross-feature visual reuse exists, but its ownership is implicit.

Move shared rules beside their shared component or into an explicit shared stylesheet. Keep viewport shell rules with AppShell, feature overrides with their feature, and truly global base/focus rules in index.css. Rename shared `fleet-*` or `route-*` classes when their ownership moves. Keep print rules with PublishedPlanManifest and map rules with DeliveryMap.

The original Figma token export and generated token CSS should stay unchanged. Shared components must continue using exact or closest existing tokens, native HTML, and Material UI icons. Preserve original logo and artwork geometry during extraction.

Button already has a useful variant API. Add a small, explicit size/typography API where repeated overrides justify it, rather than repeatedly combining its fixed `type-text-sm-semibold` class with a second typography utility.

DateRangePicker is shared in name and location, but currently hardcodes its initial fixture dates and keeps the applied range internally. Add controlled `value`/`onChange` support before connecting it to real data. Keep demo date defaults in the consuming feature. Its styles should not require importing Vehicles.

## Application and feature state

[App.tsx](D:/Git/Dracarys_Waypoint/web/src/app/App.tsx:21) currently combines route selection, title updates, history events, shell state, notification reads, publication/resend state, and loading decisions. These responsibilities can be separated without changing their behavior:

- `app/routes.ts`: known routes, page titles, active navigation metadata, and typed record-query handling.
- `app/use-navigation.ts`: current location, browser history synchronization, and navigation actions. Preserve the existing order-query/custom-event behavior until it is replaced deliberately.
- `components/layout/app-shell.tsx`: sidebar and main-content layout, receiving children and navigation props. It should not import feature data or business components.
- Feature hooks for notification state, planning publication, and loading decisions. App can compose these hooks and render their overlays; no global state library is required for this extraction.

Shared visual components should not import pages, fixtures, or business rules. Feature controllers should not become a generic “management hook” that mixes fleet availability with outlet requirements or order eligibility. Small shared hooks for sorting, checked IDs, and search shortcuts are sufficient.

Keep the selected detail record separate from bulk-checked records. This is especially important in Orders, where selecting one row opens Allocation Review while checking rows does not. Preserve the existing rule that filtering away the selected order closes its review.

Some `data.ts` files mix types, fixtures, selectors, and decision guards. Separate fixtures from rules first in Orders, Operations, and Planning when preparing API integration; small data files do not need several extra files solely for symmetry. Do not unify the independent Overview, Orders, and Planning demo snapshots or imply they are already synchronized live records.

## Recommended development order

1. **Shared visual foundation:** move shared styles; introduce PageHeader, Breadcrumbs, SearchField, FilterGroup, StatCard, and the reusable notification action. Migrate one page at a time. Keep all existing callbacks, data, and layout variants.
2. **Tables and panels:** extract sortable-header/empty-state/checkbox primitives and panel slots. Migrate Team first, then Vehicles and Outlets, and Orders last because of review behavior. Adopt a full generic table only if the smaller components prove insufficient.
3. **Dialogs and forms:** share native dialog lifecycle and field styling. Preserve notification navigation focus rules and deferral's selected-row fallback. Then extract StatusBanner, InlineFeedback, and small badges where their variants are proven.
4. **Feature controllers and routing:** move Orders state/actions into its feature, extract PublishedPlanManifest and LoadingConsequencePreview, and simplify App's routing/state ownership. Split fixtures from business rules where this helps future service integration.

Start with step 1. It removes the most duplication with the least risk and gives future Figma pages reusable building blocks immediately.

Avoid extracting one-off wrappers solely to shorten JSX. Keep DeliveryMap, vehicle eligibility, route schedules, notification cards, and loading consequences feature-specific. Keep the login layout independent. There is no need to introduce shadcn, a form library, a state library, or a new routing dependency for the proposed first step.

## Validation and completion criteria

The current `web` baseline passes `npm run lint` and `npm run build`. The build emits the existing Vite configuration warning about `__dirname` and a future config-loader default; it does not fail the build. This audit did not perform browser interaction or visual comparisons.

For implementation, validate each migrated group before proceeding:

- Preserve Figma appearance, nearest-token usage, original artwork crops, and desktop/mobile/reduced-motion behavior.
- Check back/forward navigation, active sidebar state, collapsed preference, URL record selection, and date labels.
- Check search shortcuts, filter counts, sorting, empty results, bulk checkboxes, and detail selection independently.
- Check Orders opening/closing, full-width planning when no order is selected, exit inertness, focus restoration, eligibility guards, assignment, and deferral.
- Check modal Escape/backdrop rules, focus after dismissal and navigation, and preservation of edits under the notifications overlay.
- Check publication/acknowledgement controls and printed manifest; check map resizing during shell changes.
- Check login validation and service-not-connected notices without adding fake authentication.
- Run lint/build and focused behavior checks. Source/static checks do not replace representative browser checks.

The result should be thin pages that compose shared UI and feature components, explicit style ownership, and feature-local business state—while keeping the current design and behavior intact.
