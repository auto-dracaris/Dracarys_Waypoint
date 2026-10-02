# WayPoint design tokens

The source is `figma-tokens.json`, imported from `init/web` at commit
`60cf8ce239f3e1db793588734b2cbc2949c3f127`. It contains all 172 variables across
four collections and all 50 typography styles. On 2026-10-02, the saved names,
IDs, values, aliases, collection modes, and typography settings were compared
with the original [WayPoint Style Guide](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=1035-44046)
and matched. Each collection has one mode.

## Regenerate

From `frontend`, run `npm run tokens:generate` after editing the source JSON.
This regenerates `tokens.css` from the saved export; it does not fetch Figma.
Do not edit the generated CSS directly. Aliases remain CSS variable references
and fractional color channels are preserved.

## Tailwind usage

```tsx
<div className="bg-wp-yellow-400 text-wp-text-primary p-wp-space-xl rounded-wp-radius-md">
  <h2 className="type-display-xs-semibold">Delivery overview</h2>
  <p className="type-text-md-regular">Review assigned deliveries.</p>
</div>
```

Utilities support Tailwind variants, such as `md:p-wp-space-3xl` or
`md:type-display-sm-bold`. Standard Tailwind scales remain available.
Shared components import `cn` from `@/lib/utils`, which merges `type-*`
utilities as complete text styles. Passing `type-text-sm-semibold` replaces
the component's default text style for the same Tailwind variant. Responsive
and state variants remain independent. The important modifier (for example
`type-text-sm-semibold!`) can override defaults across responsive variants.
The same helper recognizes `wp-*` spacing and radius values, so custom padding,
dimensions, and corners replace shared defaults correctly.
Terminal examples include `bg-wp-terminal-canvas`, `p-wp-terminal-space-m`,
`rounded-wp-terminal-radius`, and `type-terminal-heading`.

## Vanilla CSS usage

```css
.delivery-card {
  background: var(--wp-yellow-400);
  color: var(--wp-text-primary);
  padding: var(--wp-space-xl);
  border-radius: var(--wp-radius-md);
}
```

`src/index.css` loads the generated tokens, locally hosted Google Sans Flex
(license in `src/assets/fonts/GoogleSansFlex-OFL.txt`), and maps existing shadcn
roles to the WayPoint light theme. White card/popover surfaces and chart-role
assignments are application mappings, not additional exported Figma variables.
Standard named radii map directly to the Figma scale.

The existing `.dark` theme is retained as a fallback; it is not a Figma theme.
Explicit `wp-*` utilities use the exported single-mode values even in dark mode.
The shared button, dialog, field, label, select, and textarea defaults use the
exported spacing, radii, and typography. Their semantic colors and the separator
color resolve through the theme mappings. The defer-order and notification
dialogs use existing token utilities directly in their TSX markup. They have
no separate component CSS files, local token definitions, or hardcoded design
colours. Values outside the export use suitable existing tokens: notification
width is 480px (`wp-spacing-120`), defer-order width is 560px (`wp-spacing-140`),
success uses lime, warning uses yellow, and information uses blue. Header and
preview text use the exported semantic text colours. The defer confirmation
uses `wp-yellow-400`. Figma's 9px surface radius maps to `wp-radius-md` (8px).
These mappings intentionally differ from unbound values in the reference.

Custom shadows are omitted because the export has no shadow tokens. Standard
Tailwind layout, responsive, border, and focus utilities remain available;
viewport limits calculate available space using the exported spacing. Both
dialogs and the shared select use MUI icons. The calendar/clock combines two
MUI icons; no Figma icon files are downloaded. Other shared components retain
Lucide until migrated. MUI styles use the `mui` layer before Tailwind utilities
so token colours and dimensions override icon defaults.

Notification filters calculate counts from the available data. The defer
reason starts with the filled value shown in Figma; required-reason and
300-character details validation remain. Bodies scroll on shorter screens
while headers and actions stay visible.
