# Planning engine

The two algorithms a planning run calls. This folder is plain TypeScript: no
NestJS, no database, no network. The run reads everything from the database,
hands it over as one `PlanningInput`, and saves what comes back.

## What to implement

| File | Function | Returns |
|---|---|---|
| `priority.ts` | `calculatePriorities(input)` | One `PriorityResult` per order: a `score` (higher is served first) and the `factors` behind it |
| `allocation.ts` | `allocate(input, priorities)` | An `AllocationResult`: `trips` and `deferred` |

Both currently hold a simple placeholder. Replace the bodies and keep the
signatures. The types are in `planning.types.ts`.

## The input

`PlanningInput` is one depot's run for one delivery day:

- `orders`: every order awaiting planning, with its outlet's brand, district,
  dock type, delivery window (`HH:MM`), whether it is van-only, its weight,
  volume and temperature requirement, how many times it was already deferred
  and how many days the outlet has gone unserved.
- `vehicles`: the depot's available vehicles, with type, refrigeration,
  weight and volume capacity, `kmPerL` and `fuelRemainingL` for the week.
- `districts`: travel minutes and km from the depot and between stops.
- `serviceAllowances`: handling minutes per stop; look one up with
  `allowanceKey(brand, dockType)`.
- `day`: payday, festival ramp and monsoon flags for the date.
- `budgets`: 270 minutes for a vehicle's Fresh trips, 480 for its Style and
  Tech trips, two trips per vehicle.

## The output

```ts
{
  trips: [{ vehicleId: 12, tripNo: 1, orderIds: [41, 37, 52] }],
  deferred: [{ orderId: 60, reason: DeferralReason.VEHICLE_CAPACITY, note: '…' }],
}
```

- `orderIds` are in the order the vehicle visits them.
- Every order in the input must appear exactly once: on one trip, or in
  `deferred` with a reason.
- Return the decision only. Departure and arrival times, distance, fuel and
  load totals are worked out afterwards by `scheduleVehicle` in `feasibility.ts`.

## The rules

`validate(input, result)` in `feasibility.ts` returns every rule an allocation
breaks. A plan with issues is still saved as a draft, but the dispatcher cannot
publish it.

1. A trip carries one brand to one district.
2. Chilled orders need a refrigerated vehicle.
3. Van-only outlets need a van.
4. A vehicle serves only its own depot's districts.
5. An order is never split: one vehicle, one trip.
6. A trip's weight and volume stay within the vehicle's capacity.
7. At most two trips per vehicle, within the time budgets. Trip time is
   outbound travel + travel between stops + handling time.
8. Each stop is reached before the outlet's delivery window closes.
9. A vehicle's trips fit in what is left of its weekly fuel quota.

`checkVehicle(input, vehicle, trips)` checks one vehicle's trips, which is
useful for testing a move before making it.

## Checking your work

```
npx ts-node src/modules/planning/engine/engine.check.ts
```

It runs both functions on the booklet's peak-day scenario (85 orders, 28
available vehicles at Peliyagoda) and fails if the allocation breaks a rule or
leaves an order undecided. The placeholder serves 68 orders and defers 17.
