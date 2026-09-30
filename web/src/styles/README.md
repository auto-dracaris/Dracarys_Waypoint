# WayPoint design tokens

Source: [WayPoint Figma](https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint?node-id=1067-12357), exported 2026-09-30.

`figma-tokens.json` contains all 172 variables across four collections and 50 text styles. Variable IDs, collection names, original values, and aliases are retained. Each collection currently has one mode. Shadows and responsive breakpoints are not defined by these exported variables.

`tokens.css` is generated and loaded by `src/index.css`. Update the source JSON and run `npm run tokens:generate` from `web` to rebuild it. The command uses the saved export; it does not fetch changes from Figma.

## Usage

```tsx
<div className="bg-wp-yellow-400 text-wp-text-primary p-wp-space-xl rounded-wp-radius-md">
  <h2 className="type-display-xs-semibold">Delivery overview</h2>
  <p className="type-text-md-regular">Review your assigned deliveries.</p>
</div>

<div className="bg-wp-terminal-canvas p-wp-terminal-space-m">
  <h2 className="type-terminal-heading text-wp-terminal-ink">Loading station</h2>
</div>
```

```css
.card {
  color: var(--wp-text-primary);
  padding: var(--wp-space-xl);
  border-radius: var(--wp-radius-md);
}
```

All utilities use the `wp-` prefix to preserve Tailwind's default scales. Figma slashes become hyphens. Primitive spacing is available through `p-wp-spacing-4`; semantic spacing through `p-wp-space-xl` (both are 16px). Typography uses `type-<style-name>`; these utilities also support variants such as `md:type-display-sm-bold`.

Terminal primitives have the `--wp-terminal-primitive-` prefix; terminal semantic values use `--wp-terminal-`. This prevents repeated names across those collections from colliding. Aliases stay CSS variable references rather than flattened copies.

Google Sans Flex is served locally from `src/assets/fonts`, with its accompanying OFL license. Global text uses the font and Figma's primary text color; screen-specific backgrounds and typography are applied through utilities.
