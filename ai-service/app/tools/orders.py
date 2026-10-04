"""Bounded read-only tools. Endpoint paths and permissions are application-owned."""

from datetime import date
from datetime import date as Date
from typing import Literal

from fastapi import HTTPException
from google.genai import types
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, ValidationError

from app.agent.contracts import Source
from app.tools import common, trips

OrderStatus = Literal[
    "ordered",
    "confirmed",
    "planned",
    "deferred",
    "loaded",
    "dispatched",
    "in_transit",
    "docked",
    "delivered",
    "failed",
    "cancelled",
]
Temperature = Literal["ambient", "chilled"]


class Arguments(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MyOrdersArguments(Arguments):
    page: int = Field(default=1, ge=1, strict=True)
    limit: int = Field(default=10, ge=1, le=25, strict=True)
    status: OrderStatus | None = None
    search: str | None = Field(default=None, min_length=1, max_length=50)


class OrderDetailsArguments(Arguments):
    order_id: int = Field(gt=0, strict=True)


class PlacementArguments(Arguments):
    pass


class SummaryArguments(Arguments):
    date: Date | None = None
    depot: Literal["Peliyagoda", "Kandy"] | None = None


class DispatcherOrdersArguments(SummaryArguments):
    page: int = Field(default=1, ge=1, strict=True)
    limit: int = Field(default=10, ge=1, le=25, strict=True)
    stage: Literal["awaiting", "allocated", "deferred", "delivered", "cancelled"] | None = None
    search: str | None = Field(default=None, min_length=1, max_length=50)


ARGUMENTS = {
    "get_my_orders": MyOrdersArguments,
    "get_order_details": OrderDetailsArguments,
    "get_order_placement_options": PlacementArguments,
    "get_dispatcher_orders": DispatcherOrdersArguments,
    "get_order_summary": SummaryArguments,
    "draft_deferral_message": OrderDetailsArguments,
    **trips.ARGUMENTS,
    **common.ARGUMENTS,
}
DESCRIPTIONS = {
    "get_my_orders": "Read the caller's own outlet orders. Results are paginated; do not "
    "claim a page represents every order. Filter by status or order reference if needed.",
    "get_order_details": "Read a specific order's current status, quantities and latest "
    "recorded deferral. Requires an explicit known numeric order ID; never invent one.",
    "get_order_placement_options": "Read currently available delivery dates, ordering cutoffs "
    "and temperature options for the caller's outlet. Does not predict the best day.",
    "get_dispatcher_orders": "Read paginated dispatcher orders, optionally by run date, depot, "
    "stage or search. Deferred stage includes historical deferrals; do not infer current status.",
    "get_order_summary": "Read dispatcher aggregate order counts by optional run date and depot. "
    "Total excludes cancelled orders; stage counts can overlap. "
    "Load totals cover awaiting/allocated orders.",
    "draft_deferral_message": "Create a review-only message from an order's latest recorded "
    "deferral. Requires a known numeric order ID. Does not send a message or promise delivery.",
    **trips.DESCRIPTIONS,
    **common.DESCRIPTIONS,
}
ROLES = {
    "get_my_orders": {"store_manager"},
    "get_order_details": {"store_manager", "dispatcher"},
    "get_order_placement_options": {"store_manager"},
    "get_dispatcher_orders": {"dispatcher"},
    "get_order_summary": {"dispatcher"},
    "draft_deferral_message": {"dispatcher"},
    **trips.ROLES,
    **common.ROLES,
}


def declarations(names):
    return [
        types.FunctionDeclaration(
            name=name,
            description=DESCRIPTIONS[name],
            parameters_json_schema=ARGUMENTS[name].model_json_schema(),
        )
        for name in names
        if name in ARGUMENTS
    ]


class DeferralView(BaseModel):
    reason: str = Field(max_length=200)
    reasonNote: str | None = Field(default=None, max_length=2000)
    planDate: date
    deferredToDate: date | None = None


class OrderView(BaseModel):
    id: int = Field(gt=0, strict=True)
    outletId: int = Field(gt=0, strict=True)
    reference: str | None = Field(default=None, max_length=50)
    status: OrderStatus
    requestedDate: date
    tempRequirement: Temperature
    orderUnits: int = Field(ge=1, strict=True)
    orderWeightKg: float = Field(gt=0, allow_inf_nan=False)
    orderVolumeM3: float = Field(gt=0, allow_inf_nan=False)
    deferral: DeferralView | None = None


class PageMeta(BaseModel):
    total: int = Field(ge=0, strict=True)
    page: int = Field(ge=1, strict=True)
    limit: int = Field(ge=1, strict=True)
    totalPages: int = Field(ge=0, strict=True)


class OrdersPage(BaseModel):
    items: list[OrderView] = Field(max_length=25)
    meta: PageMeta


class SummaryView(BaseModel):
    total: int = Field(ge=0, strict=True)
    awaiting: int = Field(ge=0, strict=True)
    allocated: int = Field(ge=0, strict=True)
    deferred: int = Field(ge=0, strict=True)
    delivered: int = Field(ge=0, strict=True)
    cancelled: int = Field(ge=0, strict=True)
    weightKg: float = Field(ge=0, allow_inf_nan=False)
    volumeM3: float = Field(ge=0, allow_inf_nan=False)
    chilledVolumeM3: float = Field(ge=0, allow_inf_nan=False)


class OutletView(BaseModel):
    id: int = Field(gt=0, strict=True)
    name: str | None = Field(min_length=1, max_length=200)


class DeliveryDay(BaseModel):
    date: date
    cutoffAt: AwareDatetime


class PlacementView(BaseModel):
    outlet: OutletView
    deliveryDays: list[DeliveryDay] = Field(max_length=6)
    tempRequirements: list[Temperature] = Field(min_length=1, max_length=2)


def validate_call(call, principal, profile):
    if principal.role not in ROLES.get(call.name, set()) or call.name not in profile.tools:
        raise HTTPException(403, "Tool unavailable for your role")
    if (
        principal.role == "store_manager"
        and principal.outletId is None
        and call.name not in common.COMMON_TOOLS
    ):
        raise HTTPException(403, "Store manager has no assigned outlet")
    if call.name not in ARGUMENTS:
        raise HTTPException(403, "Tool unavailable for your role")
    try:
        return ARGUMENTS[call.name].model_validate(call.arguments)
    except ValidationError as exc:
        raise HTTPException(502, "Assistant produced invalid tool arguments") from exc


def check_outlet(identifier, principal):
    if identifier != principal.outletId:
        raise HTTPException(403, "Order outside your outlet")


async def execute(call, args, principal, token, business, retrieval=None):
    if principal.role not in ROLES.get(call.name, set()):
        raise HTTPException(403, "Tool unavailable for your role")
    if (
        principal.role == "store_manager"
        and principal.outletId is None
        and call.name not in common.COMMON_TOOLS
    ):
        raise HTTPException(403, "Store manager has no assigned outlet")
    if not token:
        raise HTTPException(401, "Bearer authentication required for business tools")
    if call.name in common.COMMON_TOOLS:
        return await common.execute(call, args, principal, retrieval)
    if call.name in trips.ARGUMENTS:
        return await trips.execute(call, args, principal, token, business)
    try:
        if call.name == "get_order_summary":
            params = args.model_dump(mode="json", exclude_none=True)
            summary = SummaryView.model_validate(
                await business.get("orders/summary", token, params=params)
            )
            text = (
                f"Order summary. Run date: {args.date or 'all dates'}; "
                f"depot: {args.depot or 'all permitted depots'}."
            )
            for name in ("total", "awaiting", "allocated", "deferred", "delivered", "cancelled"):
                text += f"\n{name}: {getattr(summary, name)}."
            text += (
                f"\nAwaiting/allocated load: {summary.weightKg} kg; {summary.volumeM3} m³; "
                f"chilled {summary.chilledVolumeM3} m³. Total excludes cancelled orders. "
                "Stage counts can overlap because deferrals include history; do not sum them."
            )
            return Source(id="api:orders:summary", title="Live dispatcher order summary", text=text)
        if call.name in ("get_my_orders", "get_dispatcher_orders"):
            manager = call.name == "get_my_orders"
            page = OrdersPage.model_validate(
                await business.get(
                    "orders/my" if manager else "orders",
                    token,
                    params=args.model_dump(mode="json", exclude_none=True),
                )
            )
            if page.meta.page != args.page or page.meta.limit != args.limit:
                raise ValueError("Pagination mismatch")
            if len(page.items) > args.limit:
                raise ValueError("Page exceeds requested limit")
            if page.meta.total < len(page.items):
                raise ValueError("Invalid total")
            for item in page.items:
                if manager:
                    check_outlet(item.outletId, principal)
                if manager and args.status and item.status != args.status:
                    raise ValueError("Status filter mismatch")
            text = (
                f"{'Your' if manager else 'Dispatcher'} orders: "
                f"page {page.meta.page} of {page.meta.totalPages}; "
                f"showing {len(page.items)} of {page.meta.total} matching orders. "
                "Status counts or conclusions about this page do not cover other pages."
            )
            if manager and args.status:
                text += f" Status filter: {args.status}."
            if args.search:
                text += f" Search filter: {args.search}."
            if not manager:
                text += (
                    f" Run date: {args.date or 'all dates'}; "
                    f"depot: {args.depot or 'all permitted depots'}; stage: {args.stage or 'all'}."
                )
                text += (
                    " Deferred stage may include historical deferrals; "
                    "current status is listed separately."
                )
            for item in page.items:
                text += (
                    f"\nOrder {item.id}: {item.status}; requested {item.requestedDate}; "
                    f"{item.tempRequirement}; {item.orderUnits} units."
                )
            if not page.items:
                text += " No orders on this page."
            return Source(
                id=f"api:orders:{'my' if manager else 'dispatcher'}:{args.page}",
                title="Live outlet orders" if manager else "Live dispatcher orders",
                text=text,
            )
        if call.name in ("get_order_details", "draft_deferral_message"):
            order = OrderView.model_validate(await business.get(f"orders/{args.order_id}", token))
            if order.id != args.order_id:
                raise ValueError("Order ID mismatch")
            if principal.role == "store_manager":
                check_outlet(order.outletId, principal)
            if call.name == "draft_deferral_message":
                if not order.deferral or not order.deferral.reason.strip():
                    text = (
                        f"Order {order.id}: no recorded deferral reason is available. "
                        "A reason-based draft cannot be produced."
                    )
                else:
                    record = order.deferral
                    text = (
                        f"Draft for dispatcher review — not sent.\nRegarding order {order.id}, "
                        f"the latest deferral record for {record.planDate} "
                        f"lists the reason as: {record.reason}."
                    )
                    if record.reasonNote:
                        text += f" Recorded dispatcher note: {record.reasonNote}"
                    text += (
                        f" The recorded next date is {record.deferredToDate}; "
                        "this is not a delivery guarantee."
                        if record.deferredToDate
                        else " No next delivery date is recorded."
                    )
                    text += (
                        f" Current order status: {order.status}. "
                        "Please verify this historical record before sharing."
                    )
                return Source(
                    id=f"api:orders:{order.id}:draft", title="Deferral message draft", text=text
                )
            text = (
                f"Order {order.id}: {order.status}. Requested date: {order.requestedDate}. "
                f"Temperature: {order.tempRequirement}. Units: {order.orderUnits}. "
                f"Weight: {order.orderWeightKg} kg. Volume: {order.orderVolumeM3} m³."
            )
            if order.deferral:
                record = order.deferral
                text += f"\nLatest recorded deferral: {record.reason}; plan date {record.planDate}."
                if record.reasonNote:
                    text += f" Dispatcher note: {record.reasonNote}"
                text += (
                    f" Recorded next date: {record.deferredToDate}."
                    if record.deferredToDate
                    else " No next date recorded."
                )
                text += " This is a recorded date, not a delivery guarantee."
            else:
                text += " No recorded deferral reason is available."
            return Source(id=f"api:orders:{order.id}", title="Live order details", text=text)
        options = PlacementView.model_validate(
            await business.get("orders/placement-options", token)
        )
        check_outlet(options.outlet.id, principal)
        outlet_label = options.outlet.name or f"outlet {options.outlet.id}"
        text = (
            f"Available ordering options for {outlet_label}. "
            f"Temperatures: {', '.join(options.tempRequirements)}."
        )
        for day in options.deliveryDays:
            text += f"\nDelivery date: {day.date}; ordering cutoff: {day.cutoffAt.isoformat()}."
        if not options.deliveryDays:
            text += " No open delivery dates were returned."
        text += (
            " These are available options; no best-day prediction "
            "or delivery guarantee is provided."
        )
        return Source(id="api:orders:placement-options", title="Live placement options", text=text)
    except (ValidationError, ValueError, TypeError) as exc:
        raise HTTPException(502, "Invalid business tool response") from exc
