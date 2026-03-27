import os
import httpx
from typing import Any

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")


async def instant_query(query: str) -> Any:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={"query": query},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()["data"]["result"]


async def range_query(query: str, start: str, end: str, step: str = "15s") -> Any:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{PROMETHEUS_URL}/api/v1/query_range",
            params={"query": query, "start": start, "end": end, "step": step},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()["data"]["result"]
