# Shared UI foundations

Plain React and native HTML, following the [WayPoint Component Set](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=37-293). Visual styles live beside the components and use the original tokens. Shared UI must not import features, pages, fixtures or business rules.

| Component | Props | Current consumers |
| --- | --- | --- |
| `Button` | `variant`, `size`, `leadingIcon`, `trailingIcon`, `loading`, `loadingLabel`, native button props/ref | Existing page and feature actions |
| `IconButton` | Required `aria-label`, icon children, `size`, native button props/ref | Mobile navigation and existing editor/notice close buttons |
| `Input` | `controlSize`, `invalid`, native input props/ref | Login, outlet editor, date range form |
| `Select` | `controlSize`, `invalid`, native select props/ref and option children | Vehicle/outlet editors and order deferral |
| `Textarea` | `invalid`, native textarea props/ref | Order deferral and loading notes |
| `StatusBadge` | `tone`, `size`, icon slots, children, native span props/ref | Vehicle/order allocation, route/deferred-order badges, team notification statuses, departure status |
| `Tooltip` | One trigger element, `content`, optional `description`, `placement`, `disabled`, `showArrow` | Collapsed sidebar links and actions |

## Usage

```tsx
<Button variant="primary" size="md" loading={saving}
  loadingLabel="Saving…" trailingIcon={<ArrowForwardRounded fontSize="inherit" />}>
  Save changes
</Button>

<label htmlFor="depot">Assigned depot</label>
<Input id="depot" name="depot" required value={depot}
  invalid={Boolean(error)} aria-describedby={error ? 'depot-error' : undefined}
  onChange={event => setDepot(event.target.value)} />
{error && <p id="depot-error">{error}</p>}

<StatusBadge tone="warning">Deferred</StatusBadge>

<Tooltip content="Refresh">
  <IconButton aria-label="Refresh" onClick={refresh}>
    <RefreshRounded fontSize="inherit" />
  </IconButton>
</Tooltip>
```

- Native attributes, callbacks and React 19 refs pass through. Feature code owns values, validation and status-to-tone mappings. `invalid` is visual/accessibility state; it does not replace native required/type validation.
- Hover and focus use CSS. Callers never pass a fake `state="Hovered"` or `state="Focused"` prop. Keyboard focus uses the shared WayPoint yellow rule in `index.css`.
- `Button` defaults to the existing outline style and preserves previous spacing when `size` is omitted. Explicit sizes use the nearest token dimensions. Loading blocks duplicate activation with native `disabled` and exposes `aria-busy`; supply `loadingLabel` when progress copy is needed.
- Inputs keep labels, helper/error IDs and validation with their feature until Phase 2 adds `FormField`. Use `Input` for text, password, email, date or time controls; checkbox/radio patterns remain feature-owned. `controlSize="sm"` preserves compact editor/date fields; the default uses the closest token to the Figma field height. Native select arrows are retained.
- Badges communicate through text as well as color. They do not automatically announce themselves as alerts or live updates. Add a suitable native `role` only when the consuming feature needs one.
- Tooltip triggers must be a native element or a component that forwards native pointer/focus handlers and `aria-describedby`. Keep the trigger's own accessible name. Tooltip content is descriptive text, without interactive controls. It appears on hover/focus, stays open while hovered, and dismisses with Escape. Portals preserve trigger layout and keep tooltip text out of the button's accessible name; placement flips/clamps to the viewport and follows scrolling/resizing. Dialog triggers portal into their open dialog. Measured screen positions, layer order and the 150 ms dismissal delay are explicit geometry/interaction values.
- Material UI supplies icons. No downloaded interface SVGs, extra UI libraries or token-export changes are needed. Purple labels and other unused Figma variants are deferred because the current token pack/pages do not require them.

Search fields, segmented controls, field wrappers, breadcrumbs, dialog shells, page sections and feature hooks belong to the later phases.

## Checks

Run `npm run check:ui`, `npm run lint` and `npm run build` from `web`. The UI check verifies native prop/ref forwarding, loading guards, semantic output, all current page routes, sidebar variants and token/style ownership. These checks do not replace browser visual or interaction verification.
