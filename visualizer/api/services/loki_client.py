import os
import httpx
from typing import Any

LOKI_URL = os.getenv("LOKI_URL", "http://loki:3100")


async def query_logs(query: str, limit: int = 50, start: str = "", end: str = "") -> Any:
    params: dict[str, Any] = {"query": query, "limit": limit}
    if start:
        params["start"] = start
    if end:
        params["end"] = end

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{LOKI_URL}/loki/api/v1/query_range",
            params=params,
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()["data"]["result"]
