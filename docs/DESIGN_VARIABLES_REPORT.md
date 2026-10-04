# WayPoint design variables report

Inspected: 2026-10-02. Branch: init/web. Commit: 60cf8ce239f3e1db793588734b2cbc2949c3f127.
Local init/web and locally cached origin/init/web point to the same commit. Remote freshness was not checked. The branch was read directly without checking it out.

## Source and scope

Saved export: https://www.figma.com/design/dDrNBgpWrqw3WUd94dKpNy/WayPoint; exported 2026-09-30.
This is a different Figma file from the recently supplied mne5fj00lMovrEHkE0T30I design. The report describes the branch export and implementation; it does not claim the two files have identical tokens.
Sources: web/src/styles/figma-tokens.json, web/src/styles/tokens.css, web/scripts/generate-tokens.mjs, web/src/index.css, web/src/App.css, web/src/shared/ui.tsx.
All 172 exported variables and all 50 text styles are listed below. Hex values are rounded display equivalents; generated CSS retains fractional RGB channels. IDs, aliases, and original values remain in the source JSON.

## Collection inventory

| Collection | Variables | Colors | Numeric | Mode |
|---|---:|---:|---:|---|
| Primitives | 98 | 66 | 32 | Mode 1 |
| Tokens | 48 | 20 | 28 | Mode 1 |
| Terminal / Primitives | 7 | 1 | 6 | Value |
| Terminal / Tokens | 19 | 13 | 6 | Terminal |

## Complete variable inventory

### Primitives

| Figma name | CSS variable | Type | CSS declaration | Resolved value | Variable ID |
|---|---|---|---|---|---|
| red/50 | --wp-red-50 | COLOR | rgb(254 242.000001 242.000001) | #FEF2F2 | 120:31 |
| red/100 | --wp-red-100 | COLOR | rgb(254 226.000002 226.000002) | #FEE2E2 | 120:32 |
| red/200 | --wp-red-200 | COLOR | rgb(254 202.000003 202.000003) | #FECACA | 120:33 |
| red/300 | --wp-red-300 | COLOR | rgb(252 165.000005 165.000005) | #FCA5A5 | 120:34 |
| red/400 | --wp-red-400 | COLOR | rgb(248 113.000001 113.000001) | #F87171 | 120:35 |
| red/500 | --wp-red-500 | COLOR | rgb(239.000001 68.000004 68.000004) | #EF4444 | 120:36 |
| red/600 | --wp-red-600 | COLOR | rgb(220.000002 38.000002 38.000002) | #DC2626 | 120:37 |
| red/700 | --wp-red-700 | COLOR | rgb(185.000004 28 28) | #B91C1C | 120:38 |
| red/800 | --wp-red-800 | COLOR | rgb(153.000006 27 27) | #991B1B | 120:39 |
| red/900 | --wp-red-900 | COLOR | rgb(127 29 29) | #7F1D1D | 120:40 |
| red/950 | --wp-red-950 | COLOR | rgb(69.000003 10 10) | #450A0A | 120:41 |
| yellow/50 | --wp-yellow-50 | COLOR | rgb(254 252 232.000001) | #FEFCE8 | 120:42 |
| yellow/100 | --wp-yellow-100 | COLOR | rgb(254 249 195.000004) | #FEF9C3 | 120:43 |
| yellow/200 | --wp-yellow-200 | COLOR | rgb(254 240.000001 138.000007) | #FEF08A | 120:44 |
| yellow/300 | --wp-yellow-300 | COLOR | rgb(253 224.000002 71.000003) | #FDE047 | 120:45 |
| yellow/400 | --wp-yellow-400 | COLOR | rgb(250 204.000003 21.000001) | #FACC15 | 120:46 |
| yellow/500 | --wp-yellow-500 | COLOR | rgb(234.000001 179.000005 8) | #EAB308 | 120:47 |
| yellow/600 | --wp-yellow-600 | COLOR | rgb(202.000003 138.000007 4) | #CA8A04 | 120:48 |
| yellow/700 | --wp-yellow-700 | COLOR | rgb(161.000006 98.000002 7) | #A16207 | 120:49 |
| yellow/800 | --wp-yellow-800 | COLOR | rgb(133.000007 77.000003 14) | #854D0E | 120:50 |
| yellow/900 | --wp-yellow-900 | COLOR | rgb(113.000001 63 18.000001) | #713F12 | 120:51 |
| yellow/950 | --wp-yellow-950 | COLOR | rgb(66.000004 32.000002 6) | #422006 | 120:52 |
| lime/50 | --wp-lime-50 | COLOR | rgb(247 254 231.000001) | #F7FEE7 | 120:53 |
| lime/100 | --wp-lime-100 | COLOR | rgb(236.000001 252 203.000003) | #ECFCCB | 120:54 |
| lime/200 | --wp-lime-200 | COLOR | rgb(217.000002 249 157.000006) | #D9F99D | 120:55 |
| lime/300 | --wp-lime-300 | COLOR | rgb(190.000004 242.000001 100.000002) | #BEF264 | 120:56 |
| lime/400 | --wp-lime-400 | COLOR | rgb(163.000005 230.000001 53.000001) | #A3E635 | 120:57 |
| lime/500 | --wp-lime-500 | COLOR | rgb(132.000007 204.000003 22.000001) | #84CC16 | 120:58 |
| lime/600 | --wp-lime-600 | COLOR | rgb(101.000002 163.000005 13) | #65A30D | 120:59 |
| lime/700 | --wp-lime-700 | COLOR | rgb(77.000003 124 15) | #4D7C0F | 120:60 |
| lime/800 | --wp-lime-800 | COLOR | rgb(63 98.000002 18.000001) | #3F6212 | 120:61 |
| lime/900 | --wp-lime-900 | COLOR | rgb(54.000001 83.000003 20.000001) | #365314 | 120:62 |
| lime/950 | --wp-lime-950 | COLOR | rgb(26 46.000001 5) | #1A2E05 | 120:63 |
| blue/50 | --wp-blue-50 | COLOR | rgb(239.000001 246.000001 255) | #EFF6FF | 120:64 |
| blue/100 | --wp-blue-100 | COLOR | rgb(219.000002 234.000001 254) | #DBEAFE | 120:65 |
| blue/200 | --wp-blue-200 | COLOR | rgb(191.000004 219.000002 254) | #BFDBFE | 120:66 |
| blue/300 | --wp-blue-300 | COLOR | rgb(147.000006 197.000003 253) | #93C5FD | 120:67 |
| blue/400 | --wp-blue-400 | COLOR | rgb(96.000002 165.000005 250) | #60A5FA | 120:68 |
| blue/500 | --wp-blue-500 | COLOR | rgb(59 130.000007 246.000001) | #3B82F6 | 120:69 |
| blue/600 | --wp-blue-600 | COLOR | rgb(37.000002 99.000002 235.000001) | #2563EB | 120:70 |
| blue/700 | --wp-blue-700 | COLOR | rgb(29 78.000003 216.000002) | #1D4ED8 | 120:71 |
| blue/800 | --wp-blue-800 | COLOR | rgb(30 64.000004 175.000005) | #1E40AF | 120:72 |
| blue/900 | --wp-blue-900 | COLOR | rgb(30 58 138.000007) | #1E3A8A | 120:73 |
| blue/950 | --wp-blue-950 | COLOR | rgb(23.000001 37.000002 84.000003) | #172554 | 120:74 |
| neutral/50 | --wp-neutral-50 | COLOR | rgb(249.502333 249.502333 249.502333) | #FAFAFA | 120:75 |
| neutral/100 | --wp-neutral-100 | COLOR | rgb(244.699057 244.699057 244.699057) | #F5F5F5 | 120:76 |
| neutral/200 | --wp-neutral-200 | COLOR | rgb(229.000002 229.000002 229.000002) | #E5E5E5 | 120:77 |
| neutral/300 | --wp-neutral-300 | COLOR | rgb(212.000003 212.000003 212.000003) | #D4D4D4 | 120:78 |
| neutral/400 | --wp-neutral-400 | COLOR | rgb(162.562497 162.562497 162.562497) | #A3A3A3 | 120:79 |
| neutral/500 | --wp-neutral-500 | COLOR | rgb(115.000001 115.000001 115.000001) | #737373 | 120:80 |
| neutral/600 | --wp-neutral-600 | COLOR | rgb(82.000003 82.000003 82.000003) | #525252 | 120:81 |
| neutral/700 | --wp-neutral-700 | COLOR | rgb(64.000004 64.000004 64.000004) | #404040 | 120:82 |
| neutral/800 | --wp-neutral-800 | COLOR | rgb(38.000002 38.000002 38.000002) | #262626 | 120:83 |
| neutral/900 | --wp-neutral-900 | COLOR | rgb(23.000001 23.000001 23.000001) | #171717 | 120:84 |
| neutral/950 | --wp-neutral-950 | COLOR | rgb(10 10 10) | #0A0A0A | 120:85 |
| warm-neutral/50 | --wp-warm-neutral-50 | COLOR | rgb(251 250 249) | #FBFAF9 | 120:86 |
| warm-neutral/100 | --wp-warm-neutral-100 | COLOR | rgb(243.000001 241.000001 241.000001) | #F3F1F1 | 120:87 |
| warm-neutral/200 | --wp-warm-neutral-200 | COLOR | rgb(232.000001 228.000002 227.000002) | #E8E4E3 | 120:88 |
| warm-neutral/300 | --wp-warm-neutral-300 | COLOR | rgb(216.000002 210.000003 208.000003) | #D8D2D0 | 120:89 |
| warm-neutral/400 | --wp-warm-neutral-400 | COLOR | rgb(171.000005 160.000006 156.000006) | #ABA09C | 120:90 |
| warm-neutral/500 | --wp-warm-neutral-500 | COLOR | rgb(124 109.000001 103.000001) | #7C6D67 | 120:91 |
| warm-neutral/600 | --wp-warm-neutral-600 | COLOR | rgb(91.000002 79.000003 75.000003) | #5B4F4B | 120:92 |
| warm-neutral/700 | --wp-warm-neutral-700 | COLOR | rgb(71.000003 60 57) | #473C39 | 120:93 |
| warm-neutral/800 | --wp-warm-neutral-800 | COLOR | rgb(43.000001 36.000002 34.000002) | #2B2422 | 120:94 |
| warm-neutral/900 | --wp-warm-neutral-900 | COLOR | rgb(29 24 22.000001) | #1D1816 | 120:95 |
| warm-neutral/950 | --wp-warm-neutral-950 | COLOR | rgb(12 10 9) | #0C0A09 | 120:96 |
| spacing/0 | --wp-spacing-0 | FLOAT | 0px | 0px | 126:31 |
| spacing/0-5 | --wp-spacing-0-5 | FLOAT | 2px | 2px | 126:32 |
| spacing/1 | --wp-spacing-1 | FLOAT | 4px | 4px | 126:33 |
| spacing/1-5 | --wp-spacing-1-5 | FLOAT | 6px | 6px | 126:34 |
| spacing/2 | --wp-spacing-2 | FLOAT | 8px | 8px | 126:35 |
| spacing/3 | --wp-spacing-3 | FLOAT | 12px | 12px | 126:36 |
| spacing/4 | --wp-spacing-4 | FLOAT | 16px | 16px | 126:37 |
| spacing/5 | --wp-spacing-5 | FLOAT | 20px | 20px | 126:38 |
| spacing/6 | --wp-spacing-6 | FLOAT | 24px | 24px | 126:39 |
| spacing/8 | --wp-spacing-8 | FLOAT | 32px | 32px | 126:40 |
| spacing/10 | --wp-spacing-10 | FLOAT | 40px | 40px | 126:41 |
| spacing/12 | --wp-spacing-12 | FLOAT | 48px | 48px | 126:42 |
| spacing/16 | --wp-spacing-16 | FLOAT | 64px | 64px | 126:43 |
| spacing/20 | --wp-spacing-20 | FLOAT | 80px | 80px | 126:44 |
| spacing/24 | --wp-spacing-24 | FLOAT | 96px | 96px | 126:45 |
| spacing/32 | --wp-spacing-32 | FLOAT | 128px | 128px | 126:46 |
| spacing/40 | --wp-spacing-40 | FLOAT | 160px | 160px | 126:47 |
| spacing/48 | --wp-spacing-48 | FLOAT | 192px | 192px | 126:48 |
| spacing/56 | --wp-spacing-56 | FLOAT | 224px | 224px | 126:49 |
| spacing/64 | --wp-spacing-64 | FLOAT | 256px | 256px | 126:50 |
| spacing/80 | --wp-spacing-80 | FLOAT | 320px | 320px | 126:51 |
| spacing/96 | --wp-spacing-96 | FLOAT | 384px | 384px | 126:52 |
| spacing/120 | --wp-spacing-120 | FLOAT | 480px | 480px | 126:53 |
| spacing/140 | --wp-spacing-140 | FLOAT | 560px | 560px | 126:54 |
| spacing/160 | --wp-spacing-160 | FLOAT | 640px | 640px | 126:55 |
| spacing/180 | --wp-spacing-180 | FLOAT | 720px | 720px | 126:56 |
| spacing/192 | --wp-spacing-192 | FLOAT | 768px | 768px | 126:57 |
| spacing/256 | --wp-spacing-256 | FLOAT | 1024px | 1024px | 126:58 |
| spacing/320 | --wp-spacing-320 | FLOAT | 1280px | 1280px | 126:59 |
| spacing/360 | --wp-spacing-360 | FLOAT | 1440px | 1440px | 126:60 |
| spacing/400 | --wp-spacing-400 | FLOAT | 1600px | 1600px | 126:61 |
| spacing/480 | --wp-spacing-480 | FLOAT | 1920px | 1920px | 126:62 |

### Tokens

| Figma name | CSS variable | Type | CSS declaration | Resolved value | Variable ID |
|---|---|---|---|---|---|
| radius/none | --wp-radius-none | FLOAT | 0px | 0px | 128:31 |
| radius/xxs | --wp-radius-xxs | FLOAT | 2px | 2px | 128:32 |
| radius/xs | --wp-radius-xs | FLOAT | 4px | 4px | 128:33 |
| radius/sm | --wp-radius-sm | FLOAT | 6px | 6px | 128:34 |
| radius/md | --wp-radius-md | FLOAT | 8px | 8px | 128:35 |
| radius/lg | --wp-radius-lg | FLOAT | 10px | 10px | 128:36 |
| radius/xl | --wp-radius-xl | FLOAT | 12px | 12px | 128:37 |
| radius/2xl | --wp-radius-2xl | FLOAT | 16px | 16px | 128:38 |
| radius/3xl | --wp-radius-3xl | FLOAT | 20px | 20px | 128:39 |
| radius/4xl | --wp-radius-4xl | FLOAT | 24px | 24px | 128:40 |
| radius/full | --wp-radius-full | FLOAT | 9999px | 9999px | 128:41 |
| space/none | --wp-space-none | FLOAT | var(--wp-spacing-0) | 0px | 157:45 |
| space/xxs | --wp-space-xxs | FLOAT | var(--wp-spacing-0-5) | 2px | 157:46 |
| space/xs | --wp-space-xs | FLOAT | var(--wp-spacing-1) | 4px | 157:47 |
| space/sm | --wp-space-sm | FLOAT | var(--wp-spacing-1-5) | 6px | 157:48 |
| space/md | --wp-space-md | FLOAT | var(--wp-spacing-2) | 8px | 157:49 |
| space/lg | --wp-space-lg | FLOAT | var(--wp-spacing-3) | 12px | 157:50 |
| space/xl | --wp-space-xl | FLOAT | var(--wp-spacing-4) | 16px | 157:51 |
| space/2xl | --wp-space-2xl | FLOAT | var(--wp-spacing-5) | 20px | 157:52 |
| space/3xl | --wp-space-3xl | FLOAT | var(--wp-spacing-6) | 24px | 157:53 |
| space/4xl | --wp-space-4xl | FLOAT | var(--wp-spacing-8) | 32px | 157:54 |
| space/5xl | --wp-space-5xl | FLOAT | var(--wp-spacing-10) | 40px | 157:55 |
| space/6xl | --wp-space-6xl | FLOAT | var(--wp-spacing-12) | 48px | 157:56 |
| space/7xl | --wp-space-7xl | FLOAT | var(--wp-spacing-16) | 64px | 157:57 |
| space/8xl | --wp-space-8xl | FLOAT | var(--wp-spacing-20) | 80px | 157:58 |
| space/9xl | --wp-space-9xl | FLOAT | var(--wp-spacing-24) | 96px | 157:59 |
| space/10xl | --wp-space-10xl | FLOAT | var(--wp-spacing-32) | 128px | 157:60 |
| space/11xl | --wp-space-11xl | FLOAT | var(--wp-spacing-40) | 160px | 157:61 |
| text/primary | --wp-text-primary | COLOR | var(--wp-warm-neutral-800) | #2B2422 | 171:48 |
| text/primary-on-brand | --wp-text-primary-on-brand | COLOR | var(--wp-neutral-50) | #FAFAFA | 171:49 |
| text/secondary | --wp-text-secondary | COLOR | var(--wp-warm-neutral-600) | #5B4F4B | 171:50 |
| text/secondary-hover | --wp-text-secondary-hover | COLOR | var(--wp-warm-neutral-700) | #473C39 | 171:51 |
| text/secondary-on-brand | --wp-text-secondary-on-brand | COLOR | var(--wp-neutral-300) | #D4D4D4 | 171:52 |
| text/tertiary | --wp-text-tertiary | COLOR | var(--wp-neutral-500) | #737373 | 171:53 |
| text/tertiary-hover | --wp-text-tertiary-hover | COLOR | var(--wp-neutral-600) | #525252 | 171:54 |
| text/tertiary-on-brand | --wp-text-tertiary-on-brand | COLOR | var(--wp-neutral-400) | #A3A3A3 | 171:55 |
| text/quaternary | --wp-text-quaternary | COLOR | var(--wp-neutral-400) | #A3A3A3 | 171:56 |
| text/quaternary-on-brand | --wp-text-quaternary-on-brand | COLOR | var(--wp-neutral-500) | #737373 | 171:57 |
| text/white | --wp-text-white | COLOR | var(--wp-neutral-50) | #FAFAFA | 171:58 |
| text/placeholder | --wp-text-placeholder | COLOR | var(--wp-neutral-400) | #A3A3A3 | 171:59 |
| text/brand/primary | --wp-text-brand-primary | COLOR | var(--wp-warm-neutral-800) | #2B2422 | 171:60 |
| text/brand/secondary | --wp-text-brand-secondary | COLOR | var(--wp-warm-neutral-600) | #5B4F4B | 171:61 |
| text/brand/secondary-hover | --wp-text-brand-secondary-hover | COLOR | var(--wp-warm-neutral-700) | #473C39 | 171:62 |
| text/brand/tertiary | --wp-text-brand-tertiary | COLOR | var(--wp-warm-neutral-500) | #7C6D67 | 171:63 |
| text/brand/tertiary-alt | --wp-text-brand-tertiary-alt | COLOR | var(--wp-warm-neutral-400) | #ABA09C | 171:64 |
| text/error/primary | --wp-text-error-primary | COLOR | var(--wp-red-600) | #DC2626 | 171:65 |
| text/warning/primary | --wp-text-warning-primary | COLOR | var(--wp-yellow-500) | #EAB308 | 171:66 |
| text/success/primary | --wp-text-success-primary | COLOR | var(--wp-lime-700) | #4D7C0F | 171:67 |

### Terminal / Primitives

| Figma name | CSS variable | Type | CSS declaration | Resolved value | Variable ID |
|---|---|---|---|---|---|
| brand-yellow | --wp-terminal-primitive-brand-yellow | COLOR | rgb(250 204.000003 21.000001) | #FACC15 | 729:68 |
| space/s | --wp-terminal-primitive-space-s | FLOAT | 16px | 16px | 729:70 |
| space/m | --wp-terminal-primitive-space-m | FLOAT | 24px | 24px | 729:72 |
| space/l | --wp-terminal-primitive-space-l | FLOAT | 32px | 32px | 729:74 |
| space/xl | --wp-terminal-primitive-space-xl | FLOAT | 48px | 48px | 729:76 |
| radius | --wp-terminal-primitive-radius | FLOAT | 12px | 12px | 729:78 |
| control | --wp-terminal-primitive-control | FLOAT | 80px | 80px | 729:80 |

### Terminal / Tokens

| Figma name | CSS variable | Type | CSS declaration | Resolved value | Variable ID |
|---|---|---|---|---|---|
| canvas | --wp-terminal-canvas | COLOR | var(--wp-neutral-100) | #F5F5F5 | 729:56 |
| surface | --wp-terminal-surface | COLOR | var(--wp-neutral-50) | #FAFAFA | 729:57 |
| ink | --wp-terminal-ink | COLOR | var(--wp-warm-neutral-950) | #0C0A09 | 729:58 |
| muted | --wp-terminal-muted | COLOR | var(--wp-neutral-600) | #525252 | 729:59 |
| border | --wp-terminal-border | COLOR | var(--wp-neutral-400) | #A3A3A3 | 729:60 |
| success | --wp-terminal-success | COLOR | var(--wp-lime-800) | #3F6212 | 729:61 |
| success-bg | --wp-terminal-success-bg | COLOR | var(--wp-lime-100) | #ECFCCB | 729:62 |
| danger | --wp-terminal-danger | COLOR | var(--wp-red-800) | #991B1B | 729:63 |
| danger-bg | --wp-terminal-danger-bg | COLOR | var(--wp-red-50) | #FEF2F2 | 729:64 |
| warning | --wp-terminal-warning | COLOR | var(--wp-yellow-900) | #713F12 | 729:65 |
| warning-bg | --wp-terminal-warning-bg | COLOR | var(--wp-yellow-100) | #FEF9C3 | 729:66 |
| focus | --wp-terminal-focus | COLOR | var(--wp-blue-700) | #1D4ED8 | 729:67 |
| accent | --wp-terminal-accent | COLOR | var(--wp-terminal-primitive-brand-yellow) | #FACC15 | 729:69 |
| space/s | --wp-terminal-space-s | FLOAT | var(--wp-terminal-primitive-space-s) | 16px | 729:71 |
| space/m | --wp-terminal-space-m | FLOAT | var(--wp-terminal-primitive-space-m) | 24px | 729:73 |
| space/l | --wp-terminal-space-l | FLOAT | var(--wp-terminal-primitive-space-l) | 32px | 729:75 |
| space/xl | --wp-terminal-space-xl | FLOAT | var(--wp-terminal-primitive-space-xl) | 48px | 729:77 |
| radius | --wp-terminal-radius | FLOAT | var(--wp-terminal-primitive-radius) | 12px | 729:79 |
| control | --wp-terminal-control | FLOAT | var(--wp-terminal-primitive-control) | 80px | 729:81 |

## Complete typography inventory

Google Sans Flex is hosted locally with its OFL license. The generator maps every text style to this font. Standard styles use -2% tracking; terminal styles use 0%.

| Style | Utility | Size (px) | Weight | Line height | Tracking |
|---|---|---:|---:|---|---|
| Display 2xl/Regular | type-display-2xl-regular | 72 | 400 | 90 PIXELS | -2 PERCENT |
| Display 2xl/Medium | type-display-2xl-medium | 72 | 500 | 90 PIXELS | -2 PERCENT |
| Display 2xl/Semibold | type-display-2xl-semibold | 72 | 600 | 90 PIXELS | -2 PERCENT |
| Display 2xl/Bold | type-display-2xl-bold | 72 | 700 | 90 PIXELS | -2 PERCENT |
| Display xl/Regular | type-display-xl-regular | 60 | 400 | 72 PIXELS | -2 PERCENT |
| Display xl/Medium | type-display-xl-medium | 60 | 500 | 72 PIXELS | -2 PERCENT |
| Display xl/Semibold | type-display-xl-semibold | 60 | 600 | 72 PIXELS | -2 PERCENT |
| Display xl/Bold | type-display-xl-bold | 60 | 700 | 72 PIXELS | -2 PERCENT |
| Display lg/Regular | type-display-lg-regular | 48 | 400 | 60 PIXELS | -2 PERCENT |
| Display lg/Medium | type-display-lg-medium | 48 | 500 | 60 PIXELS | -2 PERCENT |
| Display lg/Semibold | type-display-lg-semibold | 48 | 600 | 60 PIXELS | -2 PERCENT |
| Display lg/Bold | type-display-lg-bold | 48 | 700 | 60 PIXELS | -2 PERCENT |
| Display md/Regular | type-display-md-regular | 36 | 400 | 44 PIXELS | -2 PERCENT |
| Display md/Medium | type-display-md-medium | 36 | 500 | 44 PIXELS | -2 PERCENT |
| Display md/Semibold | type-display-md-semibold | 36 | 600 | 44 PIXELS | -2 PERCENT |
| Display md/Bold | type-display-md-bold | 36 | 700 | 44 PIXELS | -2 PERCENT |
| Display sm/Regular | type-display-sm-regular | 30 | 400 | 38 PIXELS | -2 PERCENT |
| Display sm/Medium | type-display-sm-medium | 30 | 500 | 38 PIXELS | -2 PERCENT |
| Display sm/Semibold | type-display-sm-semibold | 30 | 600 | 38 PIXELS | -2 PERCENT |
| Display sm/Bold | type-display-sm-bold | 30 | 700 | 38 PIXELS | -2 PERCENT |
| Display xs/Regular | type-display-xs-regular | 24 | 400 | 32 PIXELS | -2 PERCENT |
| Display xs/Medium | type-display-xs-medium | 24 | 500 | 32 PIXELS | -2 PERCENT |
| Display xs/Semibold | type-display-xs-semibold | 24 | 600 | 32 PIXELS | -2 PERCENT |
| Display xs/Bold | type-display-xs-bold | 24 | 700 | 32 PIXELS | -2 PERCENT |
| Text xl/Regular | type-text-xl-regular | 20 | 400 | 30 PIXELS | -2 PERCENT |
| Text xl/Medium | type-text-xl-medium | 20 | 500 | 30 PIXELS | -2 PERCENT |
| Text xl/Semibold | type-text-xl-semibold | 20 | 600 | 30 PIXELS | -2 PERCENT |
| Text xl/Bold | type-text-xl-bold | 20 | 700 | 30 PIXELS | -2 PERCENT |
| Text lg/Regular | type-text-lg-regular | 18 | 400 | 28 PIXELS | -2 PERCENT |
| Text lg/Medium | type-text-lg-medium | 18 | 500 | 28 PIXELS | -2 PERCENT |
| Text lg/Semibold | type-text-lg-semibold | 18 | 600 | 28 PIXELS | -2 PERCENT |
| Text lg/Bold | type-text-lg-bold | 18 | 700 | 28 PIXELS | -2 PERCENT |
| Text md/Regular | type-text-md-regular | 16 | 400 | 24 PIXELS | -2 PERCENT |
| Text md/Medium | type-text-md-medium | 16 | 500 | 24 PIXELS | -2 PERCENT |
| Text md/Semibold | type-text-md-semibold | 16 | 600 | 24 PIXELS | -2 PERCENT |
| Text md/Bold | type-text-md-bold | 16 | 700 | 24 PIXELS | -2 PERCENT |
| Text sm/Regular | type-text-sm-regular | 14 | 400 | 20 PIXELS | -2 PERCENT |
| Text sm/Medium | type-text-sm-medium | 14 | 500 | 20 PIXELS | -2 PERCENT |
| Text sm/Semibold | type-text-sm-semibold | 14 | 600 | 20 PIXELS | -2 PERCENT |
| Text sm/Bold | type-text-sm-bold | 14 | 700 | 20 PIXELS | -2 PERCENT |
| Text xs/Regular | type-text-xs-regular | 12 | 400 | 18 PIXELS | -2 PERCENT |
| Text xs/Medium | type-text-xs-medium | 12 | 500 | 18 PIXELS | -2 PERCENT |
| Text xs/Semibold | type-text-xs-semibold | 12 | 600 | 18 PIXELS | -2 PERCENT |
| Text xs/Bold | type-text-xs-bold | 12 | 700 | 18 PIXELS | -2 PERCENT |
| Terminal/Display | type-terminal-display | 64 | 600 | 70 PIXELS | 0 PERCENT |
| Terminal/Title | type-terminal-title | 40 | 600 | 50 PIXELS | 0 PERCENT |
| Terminal/Heading | type-terminal-heading | 28 | 600 | 35 PIXELS | 0 PERCENT |
| Terminal/Body | type-terminal-body | 24 | 400 | 30 PIXELS | 0 PERCENT |
| Terminal/Label | type-terminal-label | 24 | 600 | 30 PIXELS | 0 PERCENT |
| Terminal/Meta | type-terminal-meta | 20 | 400 | 25 PIXELS | 0 PERCENT |

## Implementation variables and component conventions

| Application variable | Declaration |
|---|---|
| --surface | #fff |
| --border | var(--wp-neutral-200) |
| --muted | var(--wp-text-secondary) |
| --brand | var(--wp-yellow-400) |

- Body: Google Sans Flex, 14px, -0.02em tracking; primary text resolves to #2B2422; canvas to #FBFAF9.
- Actual heading CSS: h1 48px/500/1.25/-0.04em; h2 36px/500/1.22/-0.035em; h3 24px/500. These are component rules and differ from some exported text styles.
- Sidebar: 240px, narrowing to 200px at 1000px and becoming a 240px drawer at 700px. Page padding: 32px, 24px, 20px, then mobile 76px 16px 24px.
- Route detail panel: 420px, then 340px at 1300px, 280px at 1000px; stacks below the map at 700px.
- Buttons: minimum height 42px, padding 10px 16px, radius 4px, 14px/600 text. Primary color uses --brand -> --wp-yellow-400 (#FACC15).
- Search: 392px wide, 44px high, radius 8px. Panels: radius 8px; page shell: 12px; notification drawer: 477px wide and radius 16px, capped to the viewport.
- Badges: neutral, lime success, yellow warning, red danger, blue info; radius 20px and 11px text. Focus: 3px blue-500 outline with 3px offset.
- Material Symbols Rounded is a locally hosted icon font, rendered by the shared Icon component using ligature names. MUI and Lucide are absent from this branch package manifest; several Figma icons are separate SVG assets.

## Generation and reuse

figma-tokens.json -> npm run tokens:generate -> tokens.css -> index.css -> Tailwind utilities and component CSS. Generation uses the saved JSON; it does not fetch live Figma changes.
Examples: bg-wp-yellow-400, text-wp-text-primary, p-wp-space-xl, rounded-wp-radius-md, type-display-xs-semibold. CSS can reference var(--wp-text-primary) directly.
Aliases stay as CSS variable references. Terminal primitives use --wp-terminal-primitive-*; terminal semantic tokens use --wp-terminal-*. Tailwind utilities use wp- to avoid replacing its default scales.

## Gaps and recommendations

- Each collection has one mode; no alternate dark theme is included in the export.
- Responsive breakpoints (1300/1000/700px), dimensions, borders, shadows, animation timings, and stacking values are component CSS rules rather than exported Figma variables.
- Some implementation colors remain literal: vehicle banner #FFCB06 differs from the #FACC15 brand token; other examples include #FFFBEB warning fill, #EBFAED success fill, and profile colors.
- The generator maps any numeric name beginning with radius into the Tailwind radius namespace. Terminal radius does not begin with radius, so its generated namespace is spacing; use its CSS variable or an explicit radius mapping when integrating.
- Reuse these tokens and local fonts in frontend, then reconcile the supplied Figma design and replace repeated hardcoded values with named component tokens.
