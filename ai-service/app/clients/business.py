import httpx
from fastapi import HTTPException

from app.agent.contracts import Deferral, Principal
from app.core.config import Settings


class BusinessClient:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def get(self, path: str, token: str, params: dict | None = None):
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            try:
                response = await client.get(
                    f"{str(self.settings.nestjs_base_url).rstrip('/')}/{path.lstrip('/')}",
                    headers={"Authorization": f"Bearer {token}"},
                    params=params,
                )
            except httpx.HTTPError as exc:
                raise HTTPException(503, "Business API unavailable") from exc
        if response.status_code in (401, 403, 404):
            raise HTTPException(
                response.status_code, "Business API access denied or record missing"
            )
        if response.status_code != 200:
            raise HTTPException(503, "Business API unavailable")
        try:
            return response.json()["data"]
        except (ValueError, KeyError, TypeError) as exc:
            raise HTTPException(502, "Invalid business API response") from exc

    async def authenticate(self, token: str) -> Principal:
        data = await self.get("auth/me", token)
        try:
            if data.get("status") != "active":
                raise HTTPException(403, "Account is not active")
            return Principal.model_validate(data)
        except (ValueError, AttributeError) as exc:
            raise HTTPException(502, "Invalid identity response") from exc

    async def deferral(self, order_id: int, principal: Principal, token: str) -> Deferral:
        endpoint = self.settings.deferral_endpoint
        if not endpoint:
            raise HTTPException(503, "NestJS deferral endpoint is not connected yet")
        # Only an operator-configured relative path is accepted, never a model-generated URL.
        if not endpoint.startswith("/") or ".." in endpoint or "?" in endpoint:
            raise HTTPException(503, "Invalid deferral endpoint configuration")
        try:
            record = Deferral.model_validate(
                await self.get(endpoint.format(order_id=order_id), token)
            )
        except (ValueError, KeyError) as exc:
            raise HTTPException(502, "Invalid deferral record") from exc
        if record.order_id != order_id or record.depot_id != principal.depotId:
            raise HTTPException(403, "Order outside your scope")
        if principal.role == "store_manager" and record.outlet_id != principal.outletId:
            raise HTTPException(403, "Order outside your outlet")
        return record
