# Delivery issue note drafts

`POST /api/v1/issue-drafts` is a review-only drafting action. It always authenticates
the Bearer token against NestJS and requires a store manager with an assigned
outlet, including in development mode. It neither reads delivery records nor
submits an issue; form fields are user-entered facts, not verified records.

```json
{
  "delivery_reference": "DEMO-099",
  "issue_type": "Damaged goods",
  "ordered_cases": 36,
  "accepted_cases": 34,
  "damaged_cases": 2,
  "notes": ""
}
```

The response contains `draft` (at most 500 characters) and `origin` (`ai` or
`form`). Gemini drafts a short plain-text note. If unavailable, unsafe, oversized
or containing unsupported numbers, the service uses the entered quantities to
prepare a deterministic draft. Existing user notes are kept by the UI when this
fallback occurs. The action does not create a chat conversation or store notes.

Damaged-goods drafts require positive damaged cases and matching totals. Missing
goods drafts require a quantity shortfall. Wrong-items drafts require a short
description. Quantities must be nonnegative whole numbers and cannot exceed the
ordered total. Credential checks run before model calls and on generated text.
Prompts prohibit invented observations, photo findings, causes and promises;
numeric checks do not establish full factual grounding, so user review is required.

The small sparkle button is inside the notes textarea's top-right corner. It
shows loading and errors, cancels on close/identity change, and never overwrites
notes or quantities changed while drafting. The Submit issue action stays separate.
