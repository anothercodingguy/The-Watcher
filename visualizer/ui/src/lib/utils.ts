export function formatDuration(seconds: number): string {
  if (seconds >= 1) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds * 1000)}ms`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toString();
}

export function severityColor(state: string): string {
  switch (state) {
    case "healthy":
      return "text-severity-healthy";
    case "degraded":
      return "text-severity-degraded";
    case "critical":
      return "text-severity-critical";
    default:
      return "text-gray-500";
  }
}

export function severityBg(state: string): string {
  switch (state) {
    case "healthy":
      return "bg-green-50 border-green-200";
    case "degraded":
      return "bg-yellow-50 border-yellow-200";
    case "critical":
      return "bg-red-50 border-red-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
}

export function trendColor(delta: number, inverse = false): string {
  const isPositive = inverse ? delta < 0 : delta > 0;
  if (Math.abs(delta) < 0.01) return "text-gray-400";
  return isPositive ? "text-red-500" : "text-green-500";
}

export function trendArrow(delta: number): string {
  if (Math.abs(delta) < 0.01) return "";
  return delta > 0 ? "\u25b2" : "\u25bc";
}
