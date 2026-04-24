interface ProgressBarProps {
  value: number;
  label?: string;
  showPercent?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function ProgressBar({ value, label, showPercent = true, size = "md" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped >= 80 ? "bg-green-500" : clamped >= 50 ? "bg-yellow-500" : clamped > 0 ? "bg-red-400" : "bg-gray-300";
  const height = size === "sm" ? "h-2" : size === "lg" ? "h-5" : "h-3";

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between text-sm mb-1">
          {label && <span className="text-gray-600">{label}</span>}
          {showPercent && <span className="font-semibold text-gray-700">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${height}`}>
        <div
          className={`${color} ${height} rounded-full transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
