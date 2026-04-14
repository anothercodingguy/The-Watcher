"""
LangGraph Brain — Tier 2 Deep Root Cause Analysis Service.

Subscribes to anomaly events from the NATS event bus (published by edge-remedy
pollers) and performs deep root-cause analysis using Google Gemini.  Exposes
REST endpoints for the Visualizer dashboard to query analysis results and
trigger on-demand RCA.

Architecture:
  edge-remedy → NATS (watcher.edge.anomaly.*) → this service → Gemini / GitHub PR
"""

import asyncio
import json
import os
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
import nats
from fastapi import FastAPI
from pydantic import BaseModel

# ── Configuration ────────────────────────────────────────────────────────

NATS_URL = os.getenv("EVENT_BUS_URL", "nats://nats:4222")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

ANOMALY_SUBJECT = "watcher.edge.anomaly.>"
REMEDIATION_SUBJECT = "watcher.edge.remediation.>"

# ── State ────────────────────────────────────────────────────────────────

recent_anomalies: deque[dict] = deque(maxlen=200)
recent_remediations: deque[dict] = deque(maxlen=100)
rca_results: deque[dict] = deque(maxlen=50)
_nc = None  # NATS connection
_subscriptions = []


# ── NATS Handlers ────────────────────────────────────────────────────────

async def _on_anomaly(msg):
    """Handle anomaly events from edge pollers."""
    try:
        event = json.loads(msg.data.decode())
        event["received_at"] = datetime.now(timezone.utc).isoformat()
        event["subject"] = msg.subject
        recent_anomalies.appendleft(event)
        print(f"[BRAIN] Anomaly received: {event.get('service')} "
              f"state={event.get('anomaly_state')} "
              f"severity={event.get('severity')}")
    except Exception as e:
        print(f"[BRAIN] Failed to parse anomaly event: {e}")


async def _on_remediation(msg):
    """Handle remediation events from edge pollers."""
    try:
        event = json.loads(msg.data.decode())
        event["received_at"] = datetime.now(timezone.utc).isoformat()
        event["subject"] = msg.subject
        recent_remediations.appendleft(event)
        print(f"[BRAIN] Remediation received: {event.get('service')} "
              f"action={event.get('action')} "
              f"success={event.get('success')}")
    except Exception as e:
        print(f"[BRAIN] Failed to parse remediation event: {e}")


# ── Lifecycle ────────────────────────────────────────────────────────────

async def _connect_nats():
    """Connect to NATS and subscribe to edge events."""
    global _nc
    try:
        _nc = await nats.connect(
            NATS_URL,
            max_reconnect_attempts=60,
            reconnect_time_wait=2,
        )
        print(f"[BRAIN] Connected to NATS at {NATS_URL}")

        sub1 = await _nc.subscribe(ANOMALY_SUBJECT, cb=_on_anomaly)
        sub2 = await _nc.subscribe(REMEDIATION_SUBJECT, cb=_on_remediation)
        _subscriptions.extend([sub1, sub2])
        print(f"[BRAIN] Subscribed to {ANOMALY_SUBJECT} and {REMEDIATION_SUBJECT}")
    except Exception as e:
        print(f"[BRAIN] NATS connection failed: {e} — will retry on next restart")


async def _disconnect_nats():
    """Gracefully close NATS subscriptions and connection."""
    global _nc
    for sub in _subscriptions:
        try:
            await sub.unsubscribe()
        except Exception:
            pass
    if _nc and not _nc.is_closed:
        await _nc.drain()
        print("[BRAIN] NATS connection drained")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage NATS lifecycle."""
    await _connect_nats()
    yield
    await _disconnect_nats()


# ── FastAPI App ──────────────────────────────────────────────────────────

app = FastAPI(
    title="LangGraph Brain — Deep RCA Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/healthz")
async def healthz():
    return {
        "status": "ok",
        "nats_connected": _nc is not None and not _nc.is_closed if _nc else False,
        "anomalies_received": len(recent_anomalies),
        "remediations_received": len(recent_remediations),
        "rca_analyses": len(rca_results),
    }


@app.get("/api/rca/events")
async def get_recent_events():
    """Return recent anomaly and remediation events."""
    return {
        "anomalies": list(recent_anomalies),
        "remediations": list(recent_remediations),
    }


@app.get("/api/rca/results")
async def get_rca_results():
    """Return stored RCA analysis results."""
    return list(rca_results)


class TriggerRequest(BaseModel):
    service: str = ""
    context: str = ""


@app.post("/api/rca/trigger")
async def trigger_rca(req: TriggerRequest):
    """Trigger a deep root-cause analysis on demand."""

    # Gather context from recent anomalies for the given service
    if req.service:
        relevant = [a for a in recent_anomalies if a.get("service") == req.service]
    else:
        relevant = list(recent_anomalies)[:20]

    # Fetch current Prometheus metrics for context
    prom_context = await _fetch_prometheus_context(req.service)

    analysis = await _run_rca(
        service=req.service or "all-services",
        anomaly_events=relevant[:10],
        prometheus_context=prom_context,
        extra_context=req.context,
    )

    rca_results.appendleft(analysis)
    return analysis


# ── RCA Engine ───────────────────────────────────────────────────────────

async def _fetch_prometheus_context(service: str) -> dict:
    """Query Prometheus for current metrics to enrich RCA context."""
    context = {}
    async with httpx.AsyncClient(timeout=5.0) as client:
        queries = {
            "error_rate": (
                f'sum(rate(http_requests_total{{job="{service}",status=~"5.."}}[5m])) '
                f'/ sum(rate(http_requests_total{{job="{service}"}}[5m])) * 100'
                if service else
                'sum(rate(http_requests_total{status=~"5.."}[5m])) '
                '/ sum(rate(http_requests_total[5m])) * 100'
            ),
            "latency_p95": (
                f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket'
                f'{{job="{service}"}}[5m])) by (le))'
                if service else
                'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))'
            ),
            "rps": (
                f'sum(rate(http_requests_total{{job="{service}"}}[5m]))'
                if service else
                'sum(rate(http_requests_total[5m]))'
            ),
        }

        for key, query in queries.items():
            try:
                resp = await client.get(
                    f"{PROMETHEUS_URL}/api/v1/query",
                    params={"query": query},
                )
                if resp.is_success:
                    result = resp.json().get("data", {}).get("result", [])
                    if result:
                        context[key] = float(result[0]["value"][1])
                    else:
                        context[key] = 0.0
            except Exception:
                context[key] = None

    return context


async def _run_rca(
    service: str,
    anomaly_events: list[dict],
    prometheus_context: dict,
    extra_context: str = "",
) -> dict:
    """Execute deep root-cause analysis using Gemini or heuristic fallback."""

    timestamp = datetime.now(timezone.utc).isoformat()

    # Build analysis context
    event_summary = []
    for evt in anomaly_events:
        event_summary.append({
            "service": evt.get("service"),
            "state": evt.get("anomaly_state"),
            "severity": evt.get("severity"),
            "metrics": evt.get("metrics", {}),
            "timestamp": evt.get("timestamp"),
        })

    if GEMINI_API_KEY:
        rca = await _gemini_rca(service, event_summary, prometheus_context, extra_context)
    else:
        rca = _heuristic_rca(service, event_summary, prometheus_context)

    result = {
        "timestamp": timestamp,
        "service": service,
        "analysis": rca,
        "prometheus_snapshot": prometheus_context,
        "events_analyzed": len(anomaly_events),
        "method": "gemini" if GEMINI_API_KEY else "heuristic",
    }

    return result


async def _gemini_rca(
    service: str,
    events: list[dict],
    prom_context: dict,
    extra_context: str,
) -> dict:
    """Use Gemini for deep root-cause analysis."""
    try:
        from google import genai
        from google.genai import types

        system_prompt = (
            "You are a senior SRE analyzing a microservices train ticket booking platform. "
            "Given anomaly events and Prometheus metrics, perform root-cause analysis.\n\n"
            "Respond in JSON with these exact keys:\n"
            '  "root_cause": a 1-2 sentence description of the root cause\n'
            '  "severity": "critical" | "degraded" | "healthy"\n'
            '  "affected_services": list of service names affected\n'
            '  "recommended_fix": a specific code or config fix\n'
            '  "confidence": integer 0-100\n'
            '  "timeline": brief chronological description of the incident\n\n'
            "Be specific — reference actual metrics, service names, and error patterns."
        )

        user_prompt = (
            f"Service: {service}\n\n"
            f"Prometheus Metrics:\n{json.dumps(prom_context, indent=2)}\n\n"
            f"Recent Anomaly Events ({len(events)} total):\n{json.dumps(events, indent=2)}\n\n"
        )
        if extra_context:
            user_prompt += f"Additional Context:\n{extra_context}\n"

        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=500,
                response_mime_type="application/json",
            ),
        )

        return json.loads(response.text)

    except Exception as e:
        print(f"[BRAIN] Gemini RCA failed: {e}")
        return _heuristic_rca(service, events, prom_context)


def _heuristic_rca(
    service: str,
    events: list[dict],
    prom_context: dict,
) -> dict:
    """Heuristic fallback when Gemini is unavailable."""
    error_rate = prom_context.get("error_rate", 0) or 0
    latency = prom_context.get("latency_p95", 0) or 0
    rps = prom_context.get("rps", 0) or 0

    # Determine severity
    if error_rate > 10 or latency > 2.0:
        severity = "critical"
    elif error_rate > 5 or latency > 1.0:
        severity = "degraded"
    else:
        severity = "healthy"

    # Analyze anomaly patterns
    states = [e.get("anomaly_state", 0) for e in events]
    severe_count = sum(1 for s in states if s >= 2)
    anomaly_count = sum(1 for s in states if s >= 1)

    if severe_count > 0:
        root_cause = (
            f"Service {service} experienced {severe_count} severe anomalies. "
            f"Error rate: {error_rate:.1f}%, P95 latency: {latency:.3f}s. "
            f"Likely cause: resource exhaustion or cascading failure from upstream dependency."
        )
        recommended_fix = (
            f"Restart {service} deployment and increase replica count. "
            f"Check upstream service health and database connection pools."
        )
    elif anomaly_count > 0:
        root_cause = (
            f"Service {service} shows {anomaly_count} anomaly detections. "
            f"Error rate: {error_rate:.1f}%, P95 latency: {latency:.3f}s. "
            f"Pattern suggests intermittent failures — possibly timeout-related."
        )
        recommended_fix = (
            f"Review {service} timeout configurations and retry policies. "
            f"Consider increasing connection pool size."
        )
    else:
        root_cause = f"No significant anomalies detected for {service}."
        recommended_fix = "No action needed — system is operating normally."

    confidence = min(90, max(15, int(40 + error_rate * 2 + latency * 20 + severe_count * 10)))

    return {
        "root_cause": root_cause,
        "severity": severity,
        "affected_services": [service] if service != "all-services" else [],
        "recommended_fix": recommended_fix,
        "confidence": confidence,
        "timeline": (
            f"Analyzed {len(events)} events. "
            f"{severe_count} severe, {anomaly_count - severe_count} moderate anomalies detected."
        ),
    }
