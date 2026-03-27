"use client";
import { useCurrentIncident } from "@/hooks/useIncidents";
import PageHeader from "@/components/layout/PageHeader";
import AIIncidentPanel from "@/components/panels/AIIncidentPanel";
import ExplorePanel from "@/components/panels/ExplorePanel";

export default function IncidentsPage() {
  const { data } = useCurrentIncident();

  return (
    <div>
      <PageHeader title="Incidents" systemState={data?.severity} showDateRange={false} />
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-5">
          <AIIncidentPanel />
        </div>
        <div className="col-span-4">
          <ExplorePanel />
        </div>
        <div className="col-span-3">
          {data?.service_health && (
            <div className="space-y-3">
              {data.service_health.map((svc: any) => (
                <div
                  key={svc.service}
                  className={`rounded-2xl p-4 border shadow-card ${
                    svc.error_rate > 10
                      ? "bg-red-50 border-red-200"
                      : svc.error_rate > 5
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white border-surface-200"
                  }`}
                >
                  <p className="text-[12px] font-medium text-gray-500 truncate">{svc.service}</p>
                  <p className="text-stat-sm text-gray-900 mt-1">{svc.error_rate}%</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {(svc.latency_p95 * 1000).toFixed(0)}ms
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
