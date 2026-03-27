"use client";
import { useLogs } from "@/hooks/useLogs";
import { MoreHorizontal } from "lucide-react";

const levelStyles: Record<string, string> = {
  ERROR: "text-red-600 bg-red-50 border-red-200",
  error: "text-red-600 bg-red-50 border-red-200",
  WARNING: "text-amber-600 bg-amber-50 border-amber-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  INFO: "text-blue-600 bg-blue-50 border-blue-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
};

export default function RecentLogs() {
  const { data: logs } = useLogs(undefined, undefined, 10);

  return (
    <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-card card-hover">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold text-gray-900">Recent Logs</h3>
        <button className="w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center transition-colors">
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-0">
        {(logs || []).slice(0, 5).map((log: any, i: number) => {
          const ts = log.timestamp
            ? new Date(Number(log.timestamp) / 1e6).toISOString().replace("T", " ").slice(0, 19)
            : "";
          const style = levelStyles[log.level] || "text-gray-500 bg-gray-50 border-gray-200";
          return (
            <div
              key={i}
              className="flex items-center gap-3 text-[11px] font-mono py-2.5 px-3 -mx-1 rounded-xl hover:bg-surface-50 transition-colors group cursor-pointer"
            >
              <span className="text-gray-400 w-[130px] flex-shrink-0 tracking-tight">{ts}</span>
              <span className="text-gray-400 w-[70px] flex-shrink-0 font-mono tracking-tighter opacity-60">
                {log.labels?.trace_id?.slice(0, 8) || ""}
              </span>
              <span className="font-semibold text-gray-700 w-[110px] flex-shrink-0 truncate font-sans text-[12px]">
                {log.service_name}
              </span>
              <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase flex-shrink-0 ${style}`}>
                {log.level}
              </span>
              <span className="text-gray-500 truncate flex-1 group-hover:text-gray-700 transition-colors">
                {log.message}
              </span>
            </div>
          );
        })}
        {(!logs || logs.length === 0) && (
          <p className="text-[13px] text-gray-400 py-8 text-center">No logs available</p>
        )}
      </div>
    </div>
  );
}
