import os


def candidate_urls(env_key: str, docker_default: str, localhost_default: str) -> list[str]:
    configured = os.getenv(env_key)
    if configured:
        return [configured]
    return [docker_default, localhost_default]


PROMETHEUS_CANDIDATES = candidate_urls("PROMETHEUS_URL", "http://prometheus:9090", "http://localhost:9090")
LOKI_CANDIDATES = candidate_urls("LOKI_URL", "http://loki:3100", "http://localhost:3100")
JAEGER_CANDIDATES = candidate_urls("JAEGER_URL", "http://jaeger:16686", "http://localhost:16686")

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:8000")

SERVICE_HEALTH_URLS = {
    "gateway-service": GATEWAY_URL,
    "user-service": os.getenv("USER_SERVICE_URL", "http://user-service:8000"),
    "auth-service": os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000"),
    "station-service": os.getenv("STATION_SERVICE_URL", "http://station-service:8000"),
    "train-service": os.getenv("TRAIN_SERVICE_URL", "http://train-service:8000"),
    "schedule-service": os.getenv("SCHEDULE_SERVICE_URL", "http://schedule-service:8000"),
    "ticket-service": os.getenv("TICKET_SERVICE_URL", "http://ticket-service:8000"),
    "order-service": os.getenv("ORDER_SERVICE_URL", "http://order-service:8000"),
    "payment-service": os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8000"),
    "notification-service": os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000"),
}
