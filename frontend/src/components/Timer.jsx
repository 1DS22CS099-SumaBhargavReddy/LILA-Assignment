import { useMemo } from 'react';

export default function Timer({ remaining, total = 30 }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  
  const progress = useMemo(() => {
    const ratio = Math.max(0, Math.min(1, remaining / total));
    return circumference * (1 - ratio);
  }, [remaining, total, circumference]);

  const colorClass = remaining <= 5 ? 'timer-danger' : remaining <= 10 ? 'timer-warning' : '';
  const strokeColor = remaining <= 5 
    ? '#ef4444' 
    : remaining <= 10 
      ? '#f59e0b' 
      : '#10b981';

  return (
    <div className="timer-container">
      <svg className="timer-svg" viewBox="0 0 60 60">
        <circle className="timer-track" cx="30" cy="30" r={radius} />
        <circle
          className="timer-progress"
          cx="30" cy="30" r={radius}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
        />
      </svg>
      <div className={`timer-text ${colorClass}`}>
        {Math.max(0, Math.ceil(remaining))}s
      </div>
    </div>
  );
}
