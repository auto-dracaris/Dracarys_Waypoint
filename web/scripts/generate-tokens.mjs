import { readFileSync, writeFileSync } from 'node:fs'

const sourceUrl = new URL('../src/styles/figma-tokens.json', import.meta.url)
const data = JSON.parse(readFileSync(sourceUrl, 'utf8'))
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const collections = new Map(data.collections.map((c) => [c.id, c]))
const variables = new Map(data.variables.map((v) => [v.id, v]))
const key = (v) => {
  const collection = collections.get(v.collectionId)
  if (!collection) throw new Error('Missing collection: ' + v.collectionId)
  const prefix = collection.name === 'Terminal / Primitives' ? 'terminal-primitive-' :
    collection.name === 'Terminal / Tokens' ? 'terminal-' : ''
  return prefix + slug(v.name)
}
const names = data.variables.map(key)
if (new Set(names).size !== names.length) throw new Error('Duplicate CSS token name')
function value(v, chain = []) {
  if (chain.includes(v.id)) throw new Error('Circular alias: ' + v.name)
  const x = v.value
  if (x && typeof x === 'object' && 'alias' in x) {
    const target = variables.get(x.alias)
    if (!target || target.type !== v.type) throw new Error('Invalid alias: ' + v.name)
    value(target, [...chain, v.id])
    return 'var(--wp-' + key(target) + ')'
  }
  if (v.type === 'COLOR') {
    if (!x.rgba || x.rgba.length !== 4) throw new Error('Invalid color: ' + v.name)
    const [r, g, b, a] = x.rgba
    // Keep Figma's fractional channels, rather than rounding its neutral palette.
    return 'rgb(' + [r, g, b].map((c) => Number((c * 255).toFixed(6))).join(' ') +
      (a === 1 ? '' : ' / ' + a) + ')'
  }
  if (v.type === 'FLOAT') return x + 'px'
  throw new Error('Unsupported token type: ' + v.type)
}
const css = [
  '/* Generated from figma-tokens.json. Run npm run tokens:generate to refresh. */',
  ':root {',
  ...data.variables.map((v) => '  --wp-' + key(v) + ': ' + value(v) + ';'),
  '}',
  '',
  '@theme inline {',
  '  --font-waypoint: "Google Sans Flex", ui-sans-serif, system-ui, sans-serif;',
  ...data.variables.map((v) => {
    const k = key(v)
    const namespace = v.type === 'COLOR' ? 'color' :
      v.name.startsWith('radius') ? 'radius' : 'spacing'
    // Prefix utilities so Figma spacing/radii never override Tailwind defaults.
    return '  --' + namespace + '-wp-' + k + ': var(--wp-' + k + ');'
  }),
  '}',
  '',
]
for (const style of data.typography) {
  const lineHeight = style.lineHeight.unit === 'PIXELS' ? style.lineHeight.value + 'px' :
    style.lineHeight.unit === 'PERCENT' ? style.lineHeight.value / 100 : 'normal'
  const tracking = style.letterSpacing.unit === 'PIXELS' ? style.letterSpacing.value + 'px' :
    style.letterSpacing.value / 100 + 'em'
  css.push(
    '@utility type-' + slug(style.name) + ' {',
    '  font-family: var(--font-waypoint);',
    '  font-size: ' + style.fontSize + 'px;',
    '  font-weight: ' + style.fontWeight + ';',
    '  line-height: ' + lineHeight + ';',
    '  letter-spacing: ' + tracking + ';',
    '}',
    '',
  )
}
writeFileSync(new URL('../src/styles/tokens.css', import.meta.url), css.join('\n'))
console.log('Generated ' + data.variables.length + ' variables and ' + data.typography.length + ' typography utilities.')

