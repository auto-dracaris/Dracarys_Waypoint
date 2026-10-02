import { createCn, validators } from "cn/config"

// Treat a complete Figma text style as one overridable utility.
export const cn = createCn({
  extend: {
    theme: {
      spacing: [{ wp: [validators.isAnyNonArbitrary] }],
      radius: [{ wp: [validators.isAnyNonArbitrary] }],
    },
    classGroups: {
      "wp-typography": [{ type: [validators.isAnyNonArbitrary] }],
    },
    conflictingClassGroups: {
      "wp-typography": [
        "font-family",
        "font-size",
        "font-weight",
        "leading",
        "tracking",
      ],
    },
  },
})
