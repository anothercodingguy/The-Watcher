"use client";
import { useOverview } from "@/hooks/useMetrics";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/cards/StatCard";
import LatencyChart from "@/components/charts/LatencyChart";
import ErrorChart from "@/components/charts/ErrorChart";
import RequestVolume from "@/components/charts/RequestVolume";
import AIIncidentPanel from "@/components/panels/AIIncidentPanel";
import ServiceErrors from "@/components/panels/ServiceErrors";
import TopErrors from "@/components/panels/TopErrors";
import RecentLogs from "@/components/panels/RecentLogs";
import ExplorePanel from "@/components/panels/ExplorePanel";
import SearchBar from "@/components/shared/SearchBar";
import { formatDuration, formatPercent, formatNumber } from "@/lib/utils";

export default function SystemOverview() {
  const { data: overview } = useOverview();

  return (
    <div>
      <PageHeader
        title="Overview"
        systemState={overview?.system_state || "healthy"}
      />

      {/* Top section: Main chart area (2/3) + Gross/AI panel (1/3) */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Main content */}
        <div className="col-span-8 space-y-5">
          {/* Latency chart — the big hero chart */}
          <LatencyChart />

          {/* AI Search bar */}
          <SearchBar />

          {/* Bottom 2x2 grid */}
          <div className="grid grid-cols-2 gap-5">
            <ServiceErrors />
            <TopErrors />
            <RequestVolume />
            <RecentLogs />
          </div>
        </div>

        {/* Right: Stats + AI panel */}
        <div className="col-span-4 space-y-5">
          {/* Stat cards — stacked vertically */}
          <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-card">
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-[12px] text-gray-500 font-medium mb-1">Error Rate</p>
                <div className="flex items-end gap-2">
                  <span className="text-stat-sm text-gray-900">
                    {overview ? formatPercent(overview.error_rate) : "—"}
                  </span>
                  {overview?.error_rate_delta !== undefined &&
                    Math.abs(overview.error_rate_delta) > 0.001 && (
                      <span
                        className={`text-[12px] font-semibold px-1.5 py-0.5 rounded-full ${
                          overview.error_rate_delta > 0
                            ? "bg-red-50 text-red-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {overview.error_rate_delta > 0 ? "\u25b2" : "\u25bc"}{" "}
                        {Math.abs(overview.error_rate_delta).toFixed(1)}%
                      </span>
                    )}
                </div>
              </div>
              <div>
                <p className="text-[12px] text-gray-500 font-medium mb-1">Avg. Latency</p>
                <div className="flex items-end gap-2">
                  <span className="text-stat-sm text-gray-900">
                    {overview ? formatDuration(overview.latency_p95) : "—"}
                  </span>
                  {overview?.latency_p95_delta !== undefined &&
                    Math.abs(overview.latency_p95_delta) > 0.001 && (
                      <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                        {"\u25cf"} {formatDuration(Math.abs(overview.latency_p95_delta))}
                      </span>
                    )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[12px] text-gray-500 font-medium mb-1">Requests/sec</p>
                <span className="text-stat-sm text-gray-900">
                  {overview ? formatNumber(overview.rps) : "—"}
                </span>
              </div>
              <div>
                <p className="text-[12px] text-gray-500 font-medium mb-1">Active Services</p>
                <span className="text-stat-sm text-gray-900">
                  {overview ? `${overview.active_services}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Gross Volume style card */}
          <ErrorChart />

          {/* AI Incident + Insights */}
          <AIIncidentPanel />

          {/* Explore further */}
          <ExplorePanel />
        </div>
      </div>
    </div>
  );
}
