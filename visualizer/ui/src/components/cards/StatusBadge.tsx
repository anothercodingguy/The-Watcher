interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusStyles: Record<string, { bg: string; dot: string }> = {
  healthy: { bg: "bg-green-50 text-green-700 border border-green-200", dot: "bg-green-500" },
  degraded: { bg: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  critical: { bg: "bg-red-50 text-red-600 border border-red-200", dot: "bg-red-500" },
  down: { bg: "bg-gray-100 text-gray-600 border border-gray-200", dot: "bg-gray-400" },
  unknown: { bg: "bg-gray-50 text-gray-500 border border-gray-200", dot: "bg-gray-300" },
};

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.unknown;
  const sizeClass = size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]";

  return (
    <span className={`inline-flex items-center rounded-full font-semibold capitalize ${style.bg} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${style.dot}`} />
      {status}
    </span>
  );
}
