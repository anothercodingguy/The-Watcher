"use client";
import { useState } from "react";
import { useTraces } from "@/hooks/useTraces";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/cards/StatusBadge";

export default function TracesPage() {
  const [service, setService] = useState("gateway-service");
  const { data: traces } = useTraces(service);

  return (
    <div>
      <PageHeader title="Traces" showDateRange={false} />

      <div className="flex gap-3 mb-6">
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="px-4 py-2.5 bg-white border border-surface-200 rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 shadow-pill transition-all"
        >
          {[
            "gateway-service", "user-service", "auth-service", "station-service",
            "train-service", "schedule-service", "ticket-service", "order-service",
            "payment-service", "notification-service",
          ].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-surface-200 shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Trace ID
              </th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Operation
              </th>
              <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Duration
              </th>
              <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Spans
              </th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Services
              </th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {(traces || []).map((trace: any) => (
              <tr
                key={trace.traceID}
                className="border-b border-surface-200 last:border-0 hover:bg-surface-50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4 text-[13px] font-mono text-blue-600 truncate max-w-[180px]">
                  {trace.traceID}
                </td>
                <td className="px-6 py-4 text-[13px] font-medium text-gray-900">{trace.operation}</td>
                <td className="px-6 py-4 text-[13px] text-right font-medium text-gray-700">
                  {trace.duration_ms}ms
                </td>
                <td className="px-6 py-4 text-[13px] text-right text-gray-700">
                  {trace.spans_count}
                </td>
                <td className="px-6 py-4 text-[11px] text-gray-500">
                  {(trace.services || []).join(", ")}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={trace.has_error ? "critical" : "healthy"} size="md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!traces || traces.length === 0) && (
          <div className="py-16 text-center text-gray-400 text-[13px]">No traces available</div>
        )}
      </div>
    </div>
  );
}
