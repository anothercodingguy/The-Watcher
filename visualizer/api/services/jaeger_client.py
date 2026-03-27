import os
import httpx
from typing import Any

JAEGER_URL = os.getenv("JAEGER_URL", "http://jaeger:16686")


async def get_services() -> list[str]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{JAEGER_URL}/api/services", timeout=10.0)
        resp.raise_for_status()
        return resp.json()["data"]


async def get_traces(service: str, limit: int = 20, lookback: str = "1h") -> Any:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{JAEGER_URL}/api/traces",
            params={"service": service, "limit": limit, "lookback": lookback},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def get_trace(trace_id: str) -> Any:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{JAEGER_URL}/api/traces/{trace_id}", timeout=10.0)
        resp.raise_for_status()
        return resp.json()["data"]
