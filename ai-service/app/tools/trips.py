"""Read-only trip tools; NestJS enforces driver ownership and loader depot scope."""

from datetime import date as Date
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, ValidationError

from app.agent.contracts import Source


class Arguments(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TripListArguments(Arguments):
    date: Date | None = None
    page: int = Field(default=1, ge=1, strict=True)
    limit: int = Field(default=10, ge=1, le=25, strict=True)


class TripArguments(Arguments):
    trip_id: UUID


class TripDetailsArguments(TripArguments):
    stop_page: int = Field(default=1, ge=1, strict=True)
    stop_limit: int = Field(default=5, ge=1, le=5, strict=True)


ARGUMENTS = {
    "get_my_trips": TripListArguments,
    "get_trip_details": TripDetailsArguments,
    "get_route_change": TripArguments,
}
DESCRIPTIONS = {
    "get_my_trips": "List trips permitted for the authenticated driver or loader. "
    "Paginated; omitted date defaults to the backend's today. Does not list dispatcher trips.",
    "get_trip_details": "Read a known trip UUID, status and a page of stops with case totals "
    "and temperatures. Never invent a UUID. Stop pages contain at most five stops.",
    "get_route_change": "Read the driver's latest pending route change for a known trip UUID. "
    "Does not acknowledge changes or alter routes. No pending change does not mean no history.",
}
ROLES = {
    "get_my_trips": {"driver", "loader"},
    "get_trip_details": {"driver", "loader", "dispatcher"},
    "get_route_change": {"driver"},
}


class TripView(BaseModel):
    id: UUID
    name: str = Field(min_length=1, max_length=100)
    status: Literal[
        "draft", "assigned", "loading", "ready", "in_progress", "completed", "cancelled"
    ]
    departure: AwareDatetime | None
    planVersion: int = Field(ge=0, strict=True)
    stopCount: int = Field(ge=0, strict=True)
    completedStops: int = Field(ge=0, strict=True)


class PageMeta(BaseModel):
    page: int = Field(ge=1, strict=True)
    limit: int = Field(ge=1, strict=True)
    total: int = Field(ge=0, strict=True)
    totalPages: int = Field(ge=0, strict=True)


class TripsPage(BaseModel):
    items: list[TripView] = Field(max_length=25)
    meta: PageMeta


class LoadOrder(BaseModel):
    cases: int = Field(ge=1, strict=True)
    temperature: Literal["ambient", "chilled"]


class Stop(BaseModel):
    sequence: int = Field(ge=1, strict=True)
    name: str = Field(min_length=1, max_length=200)
    status: str = Field(min_length=1, max_length=50)
    deliveryWindow: str = Field(max_length=100)
    orders: list[LoadOrder]


class TripDetails(TripView):
    stops: list[Stop]


class RouteStop(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    completed: bool = Field(strict=True)
    movement: Literal["none", "up", "down"]


class RouteChange(BaseModel):
    tripId: UUID
    planVersion: int = Field(ge=0, strict=True)
    reason: str = Field(min_length=1, max_length=2000)
    previous: list[RouteStop]
    updated: list[RouteStop]
    impactStopName: str = Field(max_length=200)
    impactArrivalWas: AwareDatetime
    impactArrivalNow: AwareDatetime
    tightWindow: str | None = Field(default=None, max_length=100)
    acknowledged: bool = Field(strict=True)


def summary(trip):
    if trip.completedStops > trip.stopCount:
        raise ValueError("Invalid stop counts")
    return (
        f"{trip.name} ({trip.id}): {trip.status}; plan version {trip.planVersion}; "
        f"completed stops {trip.completedStops}/{trip.stopCount}; "
        f"planned departure {trip.departure.isoformat() if trip.departure else 'not recorded'}."
    )


async def execute(call, args, principal, token, business):
    if principal.role not in ROLES.get(call.name, set()):
        raise HTTPException(403, "Tool unavailable for your role")
    if not token:
        raise HTTPException(401, "Bearer authentication required for business tools")
    try:
        if call.name == "get_my_trips":
            page = TripsPage.model_validate(
                await business.get(
                    "trips", token, params=args.model_dump(mode="json", exclude_none=True)
                )
            )
            if (
                page.meta.page != args.page
                or page.meta.limit != args.limit
                or len(page.items) > args.limit
                or page.meta.total < len(page.items)
            ):
                raise ValueError("Invalid pagination")
            text = f"Permitted trips: page {page.meta.page}/{page.meta.totalPages}; "
            text += f"{page.meta.total} matching trips. Date: {args.date or 'backend today'}."
            shown = 0
            for trip in page.items:
                line = summary(trip)
                if len(text) + len(line) > 3700:
                    break
                text += "\n" + line
                shown += 1
            text += (
                f"\nDisplayed {shown} of {len(page.items)} trips on this page; "
                "other pages are excluded."
            )
            return Source(
                id=f"api:trips:page:{args.page}",
                title="Live permitted trips",
                text=text,
                trip_ids=[item.id for item in page.items[:shown]],
            )
        path = f"trips/{args.trip_id}"
        if call.name == "get_trip_details":
            trip = TripDetails.model_validate(await business.get(path, token))
            if trip.id != args.trip_id or len(trip.stops) != trip.stopCount:
                raise ValueError("Trip mismatch")
            if [stop.sequence for stop in trip.stops] != list(range(1, len(trip.stops) + 1)):
                raise ValueError("Invalid stop sequence")
            text = summary(trip)
            start = (args.stop_page - 1) * args.stop_limit
            shown = trip.stops[start : start + args.stop_limit]
            for stop in shown:
                ambient = sum(
                    order.cases for order in stop.orders if order.temperature == "ambient"
                )
                chilled = sum(
                    order.cases for order in stop.orders if order.temperature == "chilled"
                )
                text += (
                    f"\nStop {stop.sequence}: {stop.name}; {stop.status}; "
                    f"window {stop.deliveryWindow}; "
                    f"planned cases: ambient {ambient}, chilled {chilled}."
                )
            text += f"\nStop page {args.stop_page}: showing {len(shown)} of {trip.stopCount} stops."
            text += (
                " Case totals are planned quantities, not loading confirmation or delivery proof."
            )
            return Source(
                id=f"api:trips:{trip.id}", title="Live trip details", text=text, trip_ids=[trip.id]
            )
        data = await business.get(path + "/route-change", token)
        if data is None:
            text = (
                f"Trip {args.trip_id}: no pending route change was returned. "
                "This does not cover acknowledged changes."
            )
        else:
            change = RouteChange.model_validate(data)
            if change.tripId != args.trip_id or change.acknowledged:
                raise ValueError("Pending change mismatch")
            text = f"Trip {change.tripId}: pending route change, plan version {change.planVersion}."
            text += f"\nRecorded reason: {change.reason[:1000]}"
            if len(change.reason) > 1000:
                text += " [Reason excerpt; remaining text omitted.]"
            for label, stops in (("Previous", change.previous), ("Updated", change.updated)):
                text += f"\n{label} order: " + " → ".join(stop.name for stop in stops[:3])
                text += f" (showing {min(3, len(stops))}/{len(stops)} stops)."
            text += (
                f"\nLargest arrival change: {change.impactStopName}; "
                f"{change.impactArrivalWas.isoformat()} → {change.impactArrivalNow.isoformat()}."
            )
            if change.tightWindow:
                text += f" Recorded tight window: {change.tightWindow}."
            text += " The change remains unacknowledged."
        return Source(
            id=f"api:trips:{args.trip_id}:route-change",
            title="Live pending route change",
            text=text,
        )
    except (ValidationError, ValueError, TypeError) as exc:
        raise HTTPException(502, "Invalid business tool response") from exc
