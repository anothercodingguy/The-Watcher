import { trendColor, trendArrow } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  inverse?: boolean;
  subtitle?: string;
}

export default function StatCard({ label, value, delta, deltaLabel, inverse = true, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-surface-200 shadow-card card-hover">
      <p className="text-[13px] text-gray-500 font-medium tracking-wide mb-3">{label}</p>
      <div className="flex items-end gap-3">
        <span className="text-stat text-gray-900">{value}</span>
        {delta !== undefined && Math.abs(delta) > 0.001 && (
          <span
            className={`text-[13px] font-semibold px-2 py-0.5 rounded-full ${
              (inverse ? delta > 0 : delta < 0)
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}
          >
            {trendArrow(delta)} {deltaLabel || Math.abs(delta).toFixed(1)}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[12px] text-gray-400 mt-2">{subtitle}</p>
      )}
    </div>
  );
}
