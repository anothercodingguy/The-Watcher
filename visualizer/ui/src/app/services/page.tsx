"use client";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/cards/StatusBadge";

export default function ServicesPage() {
  const { data: services } = useSWR("/api/services", (p: string) => apiFetch<any[]>(p), {
    refreshInterval: 10000,
  });

  return (
    <div>
      <PageHeader title="Services" showDateRange={false} />
      <div className="bg-white rounded-3xl border border-surface-200 shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Service
              </th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Status
              </th>
              <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                P95 Latency
              </th>
              <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Error Rate
              </th>
              <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">
                Requests/s
              </th>
            </tr>
          </thead>
          <tbody>
            {(services || []).map((svc: any) => (
              <tr
                key={svc.name}
                className="border-b border-surface-200 last:border-0 hover:bg-surface-50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <span className="text-[13px] font-semibold text-gray-900">{svc.name}</span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={svc.status} size="md" />
                </td>
                <td className="px-6 py-4 text-[13px] text-right font-medium text-gray-700">
                  {svc.latency_p95.toFixed(1)}ms
                </td>
                <td className="px-6 py-4 text-[13px] text-right">
                  <span
                    className={`font-semibold ${
                      svc.error_rate > 5 ? "text-red-500" : "text-gray-700"
                    }`}
                  >
                    {svc.error_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-[13px] text-right font-medium text-gray-700">
                  {svc.rps.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!services || services.length === 0) && (
          <div className="py-16 text-center text-gray-400 text-[13px]">Loading services...</div>
        )}
      </div>
    </div>
  );
}
