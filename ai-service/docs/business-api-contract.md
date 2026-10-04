# Required NestJS deferral contract

**Deferred pending actual API/data contracts.** Document development mode does not
call this route; finalize the tool schema when the backend API is supplied.

**Proposed contract, not an existing NestJS route.** Authentication exists, but no
order/deferral controller exists yet. AI_DEFERRAL_ENDPOINT defaults to blank and
lookup returns 503 until implemented. Configure a relative template such as
`/orders/{order_id}/deferral` only after verifying the backend route.

The AI service forwards the caller's bearer token. NestJS must enforce role,
depot and outlet access itself. Managers and dispatchers are allowed in this slice.
Return the existing response envelope with this data shape:

```json
{
  "statusCode": 200,
  "message": "Deferral retrieved",
  "data": {
    "order_id": 42,
    "outlet_id": 10,
    "depot_id": 1,
    "reason": "capacity_limit",
    "reason_note": "Recorded dispatcher explanation",
    "deferred_to_date": "2026-10-05"
  }
}
```

Values above are illustrative. Reason, note and date may be null. Depot must come
from the authoritative order/outlet relationship. Return 401/403/404 for invalid
credentials/forbidden scope/missing records. The AI service never changes orders.

Authentication uses GET /api/auth/me: data includes id, status, role, depotId and
outletId. Only active accounts are accepted. Chat identity overrides are rejected.

Qdrant payload contract for approved depot-wide policy chunks:

```json
{
  "title": "Approved policy title",
  "text": "Approved policy chunk, at most 4000 characters",
  "approved": true,
  "current": true,
  "scope": "depot_policy",
  "roles": ["store_manager", "dispatcher"],
  "depot_id": 1,
  "embedding_model": "YOUR_CONFIGURED_EMBEDDING_MODEL"
}
```

Use a collection matching AI_EMBEDDING_DIMENSIONS and the configured model's
embedding requirements. Old versions must have current=false. Outlet-private
documents require a separate retrieval scope. No ingestion API exists yet.
