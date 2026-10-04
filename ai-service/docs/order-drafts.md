# Order delivery note drafts

`POST /api/v1/order-drafts` accepts an unsubmitted order form and returns a short
editable delivery note. Bearer authentication always verifies the store manager
and assigned outlet. It does not place an order, read other outlets, create chat
memory, determine delivery availability or promise the requested date.

```json
{
  "requested_date": "2026-10-06",
  "temperature_requirement": "ambient",
  "quantity": 12,
  "weight_kg": 24.5,
  "volume_m3": 1.2,
  "notes": ""
}
```

The response has `draft` (maximum 500 characters) and `origin` (`ai` or `form`).
The model uses the entered details and any existing notes; it must not invent
access instructions, contacts, unloading times or delivery promises. Recognizable
secrets, invalid citations, oversized drafts and unsupported numbers are rejected.
A deterministic summary of the form is returned if AI is unavailable. These
checks are not complete claim-level grounding; users review and edit the note.

The Place an order page has a small sparkle button in the textarea's top-right
corner. Required order details must be valid before drafting. Changes made while
drafting are preserved; closing/navigating away or changing identity aborts the
request. If fallback occurs, existing notes are preserved. Review order and final
submission remain separate user actions using the existing NestJS endpoints.
