"use client";
import { useCurrentIncident } from "@/hooks/useIncidents";
import { Bot, CheckCircle2, ExternalLink, Sparkles } from "lucide-react";

export default function AIIncidentPanel() {
  const { data } = useCurrentIncident();

  if (!data) {
    return (
      <div className="rounded-3xl overflow-hidden">
        <div className="bg-white p-6 border border-surface-200 shadow-card animate-pulse rounded-3xl">
          <div className="h-4 bg-surface-200 rounded w-1/2 mb-4" />
          <div className="h-48 bg-surface-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isCritical = data.severity === "critical";
  const isDegraded = data.severity === "degraded";

  return (
    <div className="space-y-4">
      {/* Main AI card */}
      <div className="bg-white rounded-3xl border border-surface-200 shadow-card overflow-hidden">
        {/* Header badge */}
        <div className="flex items-center gap-2 px-6 pt-5 pb-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-full border border-blue-200">
            <Bot className="w-3 h-3 text-blue-600" />
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              AI Incident Analysis
            </span>
          </div>
        </div>

        <div className="px-6 pb-3">
          <h3 className="text-xl font-bold text-gray-900">
            {data.severity === "healthy" ? "System Normal" : "Root Cause Identified"}
          </h3>
        </div>

        {/* Root cause detail card */}
        <div
          className={`mx-4 mb-4 rounded-2xl p-5 border ${
            isCritical
              ? "bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 border-red-200/60"
              : isDegraded
              ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-200/60"
              : "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200/60"
          }`}
        >
          <div className="mb-4">
            <p className="font-bold text-gray-900 text-lg">{data.root_cause_service}</p>
            <p className="text-[13px] text-gray-600 mt-0.5">
              Confidence: <span className="font-bold text-gray-900">{data.confidence}%</span>
            </p>
          </div>

          <div className="mb-4">
            <p className="text-[13px] font-semibold text-gray-700 mb-2">Impact:</p>
            {data.impact.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 mb-1.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5 ${
                    isCritical ? "bg-red-500" : isDegraded ? "bg-amber-500" : "bg-green-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-[13px] text-gray-700 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <p className="text-[13px] font-semibold text-gray-700 mb-1.5">Action:</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-[13px] text-gray-700">{data.remediation}</span>
            </div>
          </div>

          {data.fix_time_seconds && (
            <div className="flex items-center justify-between pt-3 border-t border-black/5">
              <span className="text-[13px] text-gray-600">
                Fix Time: <span className="font-bold text-gray-900">{data.fix_time_seconds}s</span>
              </span>
              <button className="text-[12px] text-gray-500 border border-gray-300 rounded-xl px-3.5 py-1.5 hover:bg-white/80 transition-all flex items-center gap-1.5 font-medium">
                View Details <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <p className="px-6 pb-4 text-[11px] text-gray-400">
          *AI analysis based on logs and traces.
        </p>
      </div>

      {/* Insights gradient card */}
      <div className="insight-gradient rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Insights</span>
            </div>
          </div>
          <p className="text-[42px] font-bold leading-none mb-3">{data.confidence}%</p>
          <p className="text-[14px] font-semibold leading-snug mb-2">
            {data.severity !== "healthy"
              ? `Error rate spike detected in ${data.root_cause_service}.`
              : "All services operating within normal parameters."}
          </p>
          <p className="text-[12px] text-white/80 leading-relaxed">
            {data.impact[0] || "System is healthy."}
            {data.fix_time_seconds
              ? ` Remediation completed in ${data.fix_time_seconds}s.`
              : ""}
          </p>
          {/* Progress indicator */}
          <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-1000"
              style={{ width: `${data.confidence}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
