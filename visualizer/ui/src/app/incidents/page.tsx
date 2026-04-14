"use client";

import { useCurrentIncident } from "@/hooks/useIncidents";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/cards/StatusBadge";
import { formatDuration } from "@/lib/utils";

interface ServiceHealth {
  service: string;
  error_rate: number;
  latency_p95: number;
}

function getServiceStatus(s: ServiceHealth): string {
  if (s.error_rate >= 10 || s.latency_p95 >= 2.0) return "critical";
  if (s.error_rate >= 5 || s.latency_p95 >= 1.0) return "degraded";
  return "healthy";
}

function timeAgo(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function IncidentsPage() {
  const { data: incident, isLoading } = useCurrentIncident();

  const serviceHealth: ServiceHealth[] = incident?.service_health || [];
  const severity = incident?.severity || "healthy";
  const rootCause = incident?.root_cause_service || "—";
  const confidence = incident?.confidence ?? 0;
  const impacts: string[] = incident?.impact || [];
  const remediation = incident?.remediation || "No action needed";
  const fixTime = incident?.fix_time_seconds;

  // Identify affected services (not healthy)
  const affectedServices = serviceHealth.filter(
    (s) => s.error_rate >= 5 || s.latency_p95 >= 1.0
  );

  // Sort by severity
  const sorted = [...serviceHealth].sort(
    (a, b) => b.error_rate + b.latency_p95 * 10 - (a.error_rate + a.latency_p95 * 10)
  );

  return (
    <div className="flex flex-col pt-1 section-fade">
      <PageHeader
        title="Incidents"
        subtitle="Live incident detection, impact analysis, and remediation tracking"
        showControls={false}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Active incident card */}
          <section className="glass-card overflow-hidden">
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{
                background:
                  severity === "critical"
                    ? "var(--status-danger-bg)"
                    : severity === "degraded"
                      ? "var(--status-warning-bg)"
                      : "var(--status-success-bg)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    background:
                      severity === "critical"
                        ? "var(--status-danger-text)"
                        : severity === "degraded"
                          ? "var(--status-warning-text)"
                          : "var(--status-success-text)",
                    animation: severity !== "healthy" ? "pulse 2s ease-in-out infinite" : "none",
                  }}
                />
                <h2 className="text-[18px] font-semibold tracking-[-0.04em] text-[color:var(--text-primary)]">
                  {severity === "healthy"
                    ? "All Systems Operational"
                    : severity === "degraded"
                      ? "Service Degradation Detected"
                      : "Critical Incident Active"}
                </h2>
              </div>
              <StatusBadge status={severity} size="md" />
            </div>

            {severity !== "healthy" && (
              <div className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="dashboard-card-subtle p-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                      Root Cause
                    </div>
                    <div className="mt-2 truncate text-[15px] font-semibold text-[color:var(--text-primary)]">
                      {rootCause}
                    </div>
                  </div>
                  <div className="dashboard-card-subtle p-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                      Confidence
                    </div>
                    <div className="mt-2 text-[15px] font-semibold text-[color:var(--text-primary)]">
                      {confidence}%
                    </div>
                  </div>
                  <div className="dashboard-card-subtle p-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                      Est. Fix Time
                    </div>
                    <div className="mt-2 text-[15px] font-semibold text-[color:var(--text-primary)]">
                      {fixTime ? `${fixTime}s` : "—"}
                    </div>
                  </div>
                  <div className="dashboard-card-subtle p-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                      Affected
                    </div>
                    <div className="mt-2 text-[15px] font-semibold text-[color:var(--text-primary)]">
                      {affectedServices.length} / {serviceHealth.length}
                    </div>
                  </div>
                </div>

                {/* Impact */}
                {impacts.length > 0 && (
                  <div className="rounded-[16px] border border-[color:var(--card-border)] bg-[color:var(--card-soft-bg)] px-4 py-3">
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                      Impact Summary
                    </div>
                    <div className="space-y-1">
                      {impacts.map((item, i) => (
                        <div
                          key={i}
                          className="text-[13px] text-[color:var(--text-secondary)]"
                        >
                          • {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remediation */}
                <div className="rounded-[16px] border border-[color:var(--card-border)] bg-[color:var(--card-soft-bg)] px-4 py-3">
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                    Automated Remediation
                  </div>
                  <div className="text-[13px] font-medium text-[color:var(--text-primary)]">
                    {remediation}
                  </div>
                </div>
              </div>
            )}

            {severity === "healthy" && (
              <div className="p-6">
                <p className="text-[13px] leading-6 text-[color:var(--text-secondary)]">
                  All {serviceHealth.length} services are operating within normal
                  parameters. Error rates and latency are within acceptable thresholds.
                </p>
              </div>
            )}
          </section>

          {/* Service impact table */}
          <section className="dashboard-table-shell p-2">
            <div className="table-toolbar">
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.04em] text-[color:var(--text-primary)]">
                  Service Impact
                </h2>
                <p className="mt-1 text-[12px] text-[color:var(--text-muted)]">
                  Per-service health during the current incident window
                </p>
              </div>
            </div>

            <div className="overflow-auto hide-scrollbar">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="table-head-row sticky top-0 z-10">
                    <th className="table-head-cell">Service</th>
                    <th className="table-head-cell">Status</th>
                    <th className="table-head-cell text-right">Error Rate</th>
                    <th className="table-head-cell text-right">P95 Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, idx) => (
                        <tr
                          key={`incident-skel-${idx}`}
                          className="border-b border-[color:var(--card-border)]"
                        >
                          <td className="px-4 py-4">
                            <div className="skeleton-line" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="skeleton-line" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="skeleton-line" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="skeleton-line" />
                          </td>
                        </tr>
                      ))
                    : null}
                  {sorted.map((svc) => (
                    <tr
                      key={svc.service}
                      className="table-row-hover border-b border-[color:var(--card-border)] text-[13px] last:border-b-0"
                    >
                      <td className="px-4 py-4 font-semibold text-[color:var(--text-primary)]">
                        {svc.service}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={getServiceStatus(svc)} size="sm" />
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-[color:var(--text-secondary)]">
                        {svc.error_rate.toFixed(2)}%
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-[color:var(--text-secondary)]">
                        {formatDuration(svc.latency_p95)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!isLoading && serviceHealth.length === 0 && (
                <div className="dashboard-empty-state h-[280px]">
                  No incident data available. Ensure Prometheus is reachable and
                  services are reporting metrics.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right column — incident info */}
        <div className="flex flex-col gap-5">
          {/* Incident timeline */}
          <div className="glass-card p-5">
            <h3 className="text-[15px] font-semibold text-[color:var(--text-primary)]">
              Incident Timeline
            </h3>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 flex flex-col items-center">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: severity !== "healthy" ? "var(--status-danger-text)" : "var(--status-success-text)" }}
                  />
                  <div className="mt-1 w-px flex-1 bg-[color:var(--card-border)]" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[color:var(--text-primary)]">
                    Detection
                  </div>
                  <p className="mt-1 text-[12px] text-[color:var(--text-secondary)]">
                    Anomaly detected via Prometheus metric analysis. Root cause: {rootCause}.
                  </p>
                </div>
              </div>

              {severity !== "healthy" && (
                <>
                  <div className="flex gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: "var(--status-warning-text)" }}
                      />
                      <div className="mt-1 w-px flex-1 bg-[color:var(--card-border)]" />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[color:var(--text-primary)]">
                        Analysis
                      </div>
                      <p className="mt-1 text-[12px] text-[color:var(--text-secondary)]">
                        AI confidence: {confidence}%. {impacts.join(". ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: "var(--accent)" }}
                      />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[color:var(--text-primary)]">
                        Remediation
                      </div>
                      <p className="mt-1 text-[12px] text-[color:var(--text-secondary)]">
                        {remediation}
                        {fixTime ? ` — estimated fix in ${fixTime}s.` : ""}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {severity === "healthy" && (
                <div className="flex gap-3">
                  <div className="mt-1 flex flex-col items-center">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: "var(--status-success-text)" }}
                    />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[color:var(--text-primary)]">
                      Stable
                    </div>
                    <p className="mt-1 text-[12px] text-[color:var(--text-secondary)]">
                      No active incidents. System operating normally.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="glass-card p-5">
            <h3 className="text-[15px] font-semibold text-[color:var(--text-primary)]">
              Quick Stats
            </h3>
            <div className="mt-4 space-y-3 text-[12px]">
              <div className="flex items-center justify-between border-b border-[color:var(--card-border)] pb-3">
                <span className="text-[color:var(--text-muted)]">Total Services</span>
                <span className="font-semibold text-[color:var(--text-primary)]">
                  {serviceHealth.length}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[color:var(--card-border)] pb-3">
                <span className="text-[color:var(--text-muted)]">Healthy</span>
                <span className="font-semibold text-[color:var(--status-success-text)]">
                  {serviceHealth.filter((s) => getServiceStatus(s) === "healthy").length}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[color:var(--card-border)] pb-3">
                <span className="text-[color:var(--text-muted)]">Degraded</span>
                <span className="font-semibold text-[color:var(--status-warning-text)]">
                  {serviceHealth.filter((s) => getServiceStatus(s) === "degraded").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--text-muted)]">Critical</span>
                <span className="font-semibold text-[color:var(--status-danger-text)]">
                  {serviceHealth.filter((s) => getServiceStatus(s) === "critical").length}
                </span>
              </div>
            </div>
          </div>

          {/* Detection method */}
          <div className="glass-card p-5">
            <h3 className="text-[15px] font-semibold text-[color:var(--text-primary)]">
              Detection Method
            </h3>
            <div className="mt-4 space-y-2 text-[13px] leading-6 text-[color:var(--text-secondary)]">
              <p>
                Incidents are detected by analyzing Prometheus metrics in real-time.
                The system evaluates error rates (5xx responses) and P95 latency
                across all services.
              </p>
              <p>
                Edge-remedy pollers run ONNX ML inference every 2 seconds for
                sub-15-second detection. KEDA autoscales affected services automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
