interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'teal';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  current,
  total,
  label,
  showPercentage = true,
  color = 'teal',
  size = 'md',
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    teal: 'bg-teal-500',
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-theme-secondary">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-bold text-theme-primary">
              {current}/{total} <span className="text-theme-tertiary">({Math.round(percentage)}%)</span>
            </span>
          )}
        </div>
      )}
      <div className={`clay-progress ${sizeClasses[size]}`}>
        <div
          className={`clay-progress-bar ${colorClasses[color]} ${sizeClasses[size]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
