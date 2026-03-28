"use client";

import { useState } from "react";
import useSWR from "swr";
import { useLogs } from "@/hooks/useLogs";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/layout/PageHeader";

const levelStyles: Record<string, string> = {
  ERROR: "status-chip-danger",
  error: "status-chip-danger",
  WARNING: "status-chip-warning",
  warning: "status-chip-warning",
  INFO: "status-chip-info",
  info: "status-chip-info",
};

export default function LogsPage() {
  const [service, setService] = useState("");
  const [level, setLevel] = useState("");
  const { data: services } = useSWR("/api/services", (path: string) => apiFetch<any[]>(path), {
    refreshInterval: 10000,
  });
  const { data: logs, isLoading: logsLoading } = useLogs(service || undefined, level || undefined, 100);
  const visibleLogs = (logs || []).slice(0, 16);

  return (
    <div className="flex h-full flex-col overflow-hidden pt-1 section-fade">
      <PageHeader
        title="Logs"
        subtitle="Recent Loki log lines with backend-backed filters and clearer degraded-state handling"
        showControls={false}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="dashboard-table-shell min-h-0 p-2">
          <div className="table-toolbar">
            <div>
              <h2 className="text-[16px] font-semibold tracking-[-0.04em] text-[color:var(--text-primary)]">Log Stream</h2>
              <p className="mt-1 text-[12px] text-[color:var(--text-muted)]">Filter by service and severity using the same parameters exposed by the backend.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select value={service} onChange={(event) => setService(event.target.value)} className="dashboard-select min-w-[220px]">
                <option value="">All services</option>
                {(services || []).map((item: any) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select value={level} onChange={(event) => setLevel(event.target.value)} className="dashboard-select min-w-[180px]">
                <option value="">All levels</option>
                <option value="ERROR">Error</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>
          </div>

          <div className="min-h-0 overflow-auto hide-scrollbar">
            <div className="sticky top-0 z-10 grid grid-cols-[176px_170px_90px_minmax(0,1fr)] items-center gap-4 border-b border-[color:var(--card-border)] bg-[color:var(--card-bg)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              <span>Timestamp</span>
              <span>Service</span>
              <span>Level</span>
              <span>Message</span>
            </div>

            {logsLoading
              ? Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={`logs-skeleton-${idx}`}
                    className="grid grid-cols-[176px_170px_90px_minmax(0,1fr)] items-center gap-4 border-b border-[color:var(--card-border)] px-5 py-3"
                  >
                    <div className="skeleton-line" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line" />
                  </div>
                ))
              : null}

            {!logsLoading && visibleLogs.map((log: any, index: number) => {
            const timestamp = log.timestamp
              ? new Date(Number(log.timestamp) / 1e6).toISOString().replace("T", " ").slice(0, 19)
              : "";
            const style = levelStyles[log.level] || "bg-[color:var(--control-bg)] text-[color:var(--text-secondary)]";

            return (
              <div
                key={`${log.timestamp}-${index}`}
                className="grid grid-cols-[176px_170px_90px_minmax(0,1fr)] items-start gap-4 border-b border-[color:var(--card-border)] px-5 py-3 last:border-b-0"
              >
                <span className="font-mono text-[11px] text-[color:var(--text-muted)]">{timestamp}</span>
                <span className="truncate text-[13px] font-semibold text-[color:var(--text-primary)]">{log.service_name}</span>
                <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${style}`}>
                  {log.level}
                </span>
                <span className="min-w-0 text-[13px] leading-6 text-[color:var(--text-secondary)]">{log.message}</span>
              </div>
            );
          })}

            {!logsLoading && visibleLogs.length === 0 && (
              <div className="dashboard-empty-state h-[420px]">
                No logs are available for the selected filters. If the system is idle, broaden the filters or check whether Loki is reachable.
              </div>
            )}
          </div>
        </div>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-5">
          <div className="glass-card p-5">
            <h3 className="text-[15px] font-semibold text-[color:var(--text-primary)]">Current Filters</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
              <div className="dashboard-card-subtle p-4">
                <div className="text-[color:var(--text-muted)]">Service</div>
                <div className="mt-1 font-semibold text-[color:var(--text-primary)]">{service || "All services"}</div>
              </div>
              <div className="dashboard-card-subtle p-4">
                <div className="text-[color:var(--text-muted)]">Level</div>
                <div className="mt-1 font-semibold text-[color:var(--text-primary)]">{level || "All levels"}</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-[15px] font-semibold text-[color:var(--text-primary)]">Operational Notes</h3>
            <div className="mt-4 space-y-3 text-[13px] leading-6 text-[color:var(--text-secondary)]">
              <p>Logs are streamed from the backend Loki endpoint and refreshed automatically.</p>
              <p>Empty results usually mean no matching lines yet, or Loki is currently unavailable.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
