# WayPoint design tokens

The source is `figma-tokens.json`, imported from `init/web` at commit
`60cf8ce239f3e1db793588734b2cbc2949c3f127`. It contains all 172 variables across
four collections and all 50 typography styles. On 2026-10-02, the saved names,
IDs, values, aliases, collection modes, and typography settings were compared
with the original [WayPoint Style Guide](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=1035-44046)
and matched. Each collection has one mode.

## Regenerate

From `web`, run `npm run tokens:generate` after editing the source JSON.
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

Use these utilities directly in plain React components. No UI library or class-merging helper is required. Avoid conflicting typography utilities on the same element.

## Vanilla CSS usage

```css
.delivery-card {
  background: var(--wp-yellow-400);
  color: var(--wp-text-primary);
  padding: var(--wp-space-xl);
  border-radius: var(--wp-radius-md);
}
```

`src/index.css` loads the generated tokens and the locally hosted Google Sans Flex font (license in `src/assets/fonts/GoogleSansFlex-OFL.txt`). The page background and text use WayPoint tokens directly. The original token JSON, generated CSS, and generator are unchanged.

Use `rounded-wp-radius-*` for Figma radii and `type-*` for complete exported typography styles. Standard Tailwind layout, responsive, border, and focus utilities remain available. No dark theme or shadcn theme mappings are configured; the export has a single mode per collection.

## Delivery Overview token audit

The page uses exported tokens for colors, spacing, corners, and icon sizes. Responsive text uses the generated `type-*` styles through Tailwind `@apply`; the active route filter uses the exported medium typography style. Pure white surfaces now use `wp-neutral-50`, the closest surface color in the export. Non-token spacing values such as 10px and 14px use existing 8px and 12px spacing tokens.

Layout exceptions remain explicit: sidebar/panel/search dimensions, reserved map heights, original artwork sizes and crop percentages, responsive breakpoints, border/focus widths, transition timing, and overlay opacity. The overlay color itself comes from `wp-neutral-950`. Progress widths are calculated from demo data, not design tokens. The font-face weight range describes the font file rather than a UI text style. These exceptions are not exported Figma variables; the source JSON and generated CSS remain unchanged.
