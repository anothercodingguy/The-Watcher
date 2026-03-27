from fastapi import APIRouter, Query
from datetime import datetime, timedelta
from services.prometheus_client import instant_query, range_query

router = APIRouter()


@router.get("/overview")
async def get_overview():
    """Return top-level system health stats with trend deltas."""
    now = datetime.utcnow()
    current_window = "5m"
    previous_start = (now - timedelta(minutes=10)).timestamp()
    previous_end = (now - timedelta(minutes=5)).timestamp()

    # Current metrics
    try:
        err_result = await instant_query(
            f'sum(rate(http_requests_total{{status=~"5.."}}[{current_window}])) '
            f'/ sum(rate(http_requests_total[{current_window}])) * 100'
        )
        error_rate = round(float(err_result[0]["value"][1]), 2) if err_result else 0.0
    except Exception:
        error_rate = 0.0

    try:
        lat_result = await instant_query(
            f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[{current_window}])) by (le))'
        )
        latency_p95 = round(float(lat_result[0]["value"][1]), 4) if lat_result else 0.0
    except Exception:
        latency_p95 = 0.0

    try:
        rps_result = await instant_query(f'sum(rate(http_requests_total[{current_window}]))')
        rps = round(float(rps_result[0]["value"][1]), 1) if rps_result else 0.0
    except Exception:
        rps = 0.0

    try:
        up_result = await instant_query('count(up{job=~".*-service"} == 1)')
        active_services = int(float(up_result[0]["value"][1])) if up_result else 0
    except Exception:
        active_services = 0

    # Previous window for trend calculation
    try:
        prev_err_result = await instant_query(
            f'sum(rate(http_requests_total{{status=~"5.."}}[5m] offset 5m)) '
            f'/ sum(rate(http_requests_total[5m] offset 5m)) * 100'
        )
        prev_error_rate = round(float(prev_err_result[0]["value"][1]), 2) if prev_err_result else 0.0
    except Exception:
        prev_error_rate = 0.0

    try:
        prev_lat_result = await instant_query(
            'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m] offset 5m)) by (le))'
        )
        prev_latency = round(float(prev_lat_result[0]["value"][1]), 4) if prev_lat_result else 0.0
    except Exception:
        prev_latency = 0.0

    # Determine system state
    if error_rate > 10 or latency_p95 > 2.0:
        system_state = "critical"
    elif error_rate > 5 or latency_p95 > 1.0:
        system_state = "degraded"
    else:
        system_state = "healthy"

    return {
        "error_rate": error_rate,
        "error_rate_delta": round(error_rate - prev_error_rate, 2),
        "latency_p95": latency_p95,
        "latency_p95_delta": round(latency_p95 - prev_latency, 4),
        "rps": rps,
        "active_services": active_services,
        "total_services": 10,
        "system_state": system_state,
    }


@router.get("/latency")
async def get_latency_series(range: str = Query(default="15m")):
    """Return time-series latency data (p50, p95, p99)."""
    now = datetime.utcnow()
    duration = _parse_duration(range)
    start = (now - duration).isoformat() + "Z"
    end = now.isoformat() + "Z"

    series = {}
    for percentile, label in [("0.5", "p50"), ("0.95", "p95"), ("0.99", "p99")]:
        try:
            result = await range_query(
                f'histogram_quantile({percentile}, sum(rate(http_request_duration_seconds_bucket[1m])) by (le))',
                start, end, step="15s",
            )
            if result:
                series[label] = [
                    {"timestamp": point[0], "value": round(float(point[1]), 4)}
                    for point in result[0]["values"]
                ]
            else:
                series[label] = []
        except Exception:
            series[label] = []

    return series


@router.get("/errors")
async def get_error_series(range: str = Query(default="15m")):
    """Return time-series error rate data per service."""
    now = datetime.utcnow()
    duration = _parse_duration(range)
    start = (now - duration).isoformat() + "Z"
    end = now.isoformat() + "Z"

    try:
        result = await range_query(
            'sum(rate(http_requests_total{status=~"5.."}[1m])) by (job) '
            '/ sum(rate(http_requests_total[1m])) by (job) * 100',
            start, end, step="15s",
        )
        return [
            {
                "service": item["metric"].get("job", "unknown"),
                "values": [
                    {"timestamp": p[0], "value": round(float(p[1]), 2)}
                    for p in item["values"]
                ],
            }
            for item in result
        ]
    except Exception:
        return []


@router.get("/requests")
async def get_request_series(range: str = Query(default="15m")):
    """Return time-series RPS data per service."""
    now = datetime.utcnow()
    duration = _parse_duration(range)
    start = (now - duration).isoformat() + "Z"
    end = now.isoformat() + "Z"

    try:
        result = await range_query(
            'sum(rate(http_requests_total[1m])) by (job)',
            start, end, step="15s",
        )
        return [
            {
                "service": item["metric"].get("job", "unknown"),
                "values": [
                    {"timestamp": p[0], "value": round(float(p[1]), 2)}
                    for p in item["values"]
                ],
            }
            for item in result
        ]
    except Exception:
        return []


def _parse_duration(s: str) -> timedelta:
    """Parse strings like '15m', '1h', '6h' into timedelta."""
    unit = s[-1]
    value = int(s[:-1])
    if unit == "m":
        return timedelta(minutes=value)
    if unit == "h":
        return timedelta(hours=value)
    if unit == "d":
        return timedelta(days=value)
    return timedelta(minutes=15)
