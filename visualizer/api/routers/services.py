from fastapi import APIRouter
from services.prometheus_client import instant_query

router = APIRouter()

SERVICE_LIST = [
    "gateway-service", "user-service", "auth-service", "station-service",
    "train-service", "schedule-service", "ticket-service", "order-service",
    "payment-service", "notification-service",
]


@router.get("")
async def list_services():
    """Return health status for all services."""
    results = []
    for svc in SERVICE_LIST:
        job = svc
        entry = {"name": svc, "status": "unknown", "latency_p95": 0, "error_rate": 0, "rps": 0}

        # Check if up
        try:
            up_result = await instant_query(f'up{{job="{job}"}}')
            is_up = bool(up_result and float(up_result[0]["value"][1]) == 1)
        except Exception:
            is_up = False

        # Error rate
        try:
            err_result = await instant_query(
                f'sum(rate(http_requests_total{{job="{job}",status=~"5.."}}[5m])) '
                f'/ sum(rate(http_requests_total{{job="{job}"}}[5m])) * 100'
            )
            entry["error_rate"] = round(float(err_result[0]["value"][1]), 2) if err_result else 0.0
        except Exception:
            entry["error_rate"] = 0.0

        # P95 latency
        try:
            lat_result = await instant_query(
                f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{{job="{job}"}}[5m])) by (le))'
            )
            entry["latency_p95"] = round(float(lat_result[0]["value"][1]) * 1000, 1) if lat_result else 0.0
        except Exception:
            entry["latency_p95"] = 0.0

        # RPS
        try:
            rps_result = await instant_query(f'sum(rate(http_requests_total{{job="{job}"}}[5m]))')
            entry["rps"] = round(float(rps_result[0]["value"][1]), 2) if rps_result else 0.0
        except Exception:
            entry["rps"] = 0.0

        # Determine status
        if not is_up:
            entry["status"] = "down"
        elif entry["error_rate"] > 10 or entry["latency_p95"] > 2000:
            entry["status"] = "critical"
        elif entry["error_rate"] > 5 or entry["latency_p95"] > 1000:
            entry["status"] = "degraded"
        else:
            entry["status"] = "healthy"

        results.append(entry)

    return results


@router.get("/{service_name}/errors")
async def get_service_errors(service_name: str):
    """Return error breakdown for a specific service."""
    try:
        result = await instant_query(
            f'sum(rate(http_requests_total{{job="{service_name}",status=~"5.."}}[5m])) by (handler, status)'
        )
        errors = []
        for item in result:
            errors.append({
                "handler": item["metric"].get("handler", "unknown"),
                "status": item["metric"].get("status", "500"),
                "rate": round(float(item["value"][1]), 4),
            })
        return errors
    except Exception:
        return []
