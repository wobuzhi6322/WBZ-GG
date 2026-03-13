"use client";

interface RankTrendGraphProps {
  points: number[];
  className?: string;
}

export default function RankTrendGraph({ points, className = "" }: RankTrendGraphProps) {
  const safePoints = points.length > 0 ? points : [0];
  const normalizedPoints = safePoints.length === 1 ? [safePoints[0], safePoints[0]] : safePoints;
  const width = 100;
  const height = 56;
  const padding = 4;
  const min = Math.min(...normalizedPoints);
  const max = Math.max(...normalizedPoints);
  const range = Math.max(1, max - min);

  const coordinates = normalizedPoints.map((point, index) => {
    const x = padding + (index / Math.max(1, normalizedPoints.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <div className={`relative h-28 w-full ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rank-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        <polyline points={areaPoints} fill="url(#rank-trend-fill)" stroke="none" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {coordinates.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === coordinates.length - 1 ? 2.6 : 1.6}
            fill="#2dd4bf"
          />
        ))}

        <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill="#2dd4bf" fillOpacity="0.18" />
      </svg>
    </div>
  );
}
