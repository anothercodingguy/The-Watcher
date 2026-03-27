from fastapi import APIRouter, Query
from typing import Optional
from services.jaeger_client import get_services as jaeger_get_services, get_traces, get_trace

router = APIRouter()


@router.get("/services")
async def list_traced_services():
    """Return list of services known to Jaeger."""
    try:
        return await jaeger_get_services()
    except Exception:
        return []


@router.get("")
async def list_traces(
    service: str = Query(default="gateway-service"),
    limit: int = Query(default=20, le=100),
    lookback: str = Query(default="1h"),
):
    """Return recent traces for a service."""
    try:
        traces = await get_traces(service, limit=limit, lookback=lookback)
        return [_summarize_trace(t) for t in traces]
    except Exception:
        return []


@router.get("/{trace_id}")
async def get_trace_detail(trace_id: str):
    """Return full trace detail."""
    try:
        data = await get_trace(trace_id)
        if data:
            return data[0] if isinstance(data, list) else data
        return None
    except Exception:
        return None


def _summarize_trace(trace: dict) -> dict:
    """Summarize a Jaeger trace into a compact representation."""
    spans = trace.get("spans", [])
    processes = trace.get("processes", {})

    if not spans:
        return {"traceID": trace.get("traceID", ""), "spans": 0}

    root_span = spans[0]
    duration_us = root_span.get("duration", 0)
    service_names = list({
        processes.get(s.get("processID", ""), {}).get("serviceName", "unknown")
        for s in spans
    })

    return {
        "traceID": trace.get("traceID", ""),
        "operation": root_span.get("operationName", ""),
        "duration_ms": round(duration_us / 1000, 2),
        "spans_count": len(spans),
        "services": service_names,
        "start_time": root_span.get("startTime", 0),
        "has_error": any(
            tag.get("key") == "error" and tag.get("value") is True
            for s in spans
            for tag in s.get("tags", [])
        ),
    }
