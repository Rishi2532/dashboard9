import React from 'react';

interface MiniLineChartProps {
  data: number[];
  color?: string;
  height?: number;
  strokeWidth?: number;
}

export default function MiniLineChart({ 
  data, 
  color = '#3B82F6', 
  height = 32, 
  strokeWidth = 2 
}: MiniLineChartProps) {
  // Use actual data, fallback to empty if insufficient
  const chartData = (data && data.length >= 2) ? data : [];
  
  if (!chartData || chartData.length < 2) {
    return <div className="h-8 bg-gray-200 rounded opacity-60 flex items-center justify-center">
      <span className="text-xs text-gray-500">No data</span>
    </div>;
  }

  const width = 120;
  const padding = 4;
  
  // Calculate min and max values for scaling
  const minValue = Math.min(...chartData);
  const maxValue = Math.max(...chartData);
  const range = maxValue - minValue;
  
  // If all values are the same, show a flat line
  if (range === 0) {
    const y = height / 2;
    return (
      <svg width={width} height={height} className="rounded">
        <line
          x1={padding}
          y1={y}
          x2={width - padding}
          y2={y}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={0.8}
        />
      </svg>
    );
  }
  
  // Create path points
  const points = chartData.map((value, index) => {
    const x = padding + (index * (width - 2 * padding)) / (chartData.length - 1);
    const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');
  
  // Create smooth curve path
  const pathData = chartData.map((value, index) => {
    const x = padding + (index * (width - 2 * padding)) / (chartData.length - 1);
    const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
    
    if (index === 0) {
      return `M ${x} ${y}`;
    } else {
      const prevX = padding + ((index - 1) * (width - 2 * padding)) / (chartData.length - 1);
      const prevY = height - padding - ((chartData[index - 1] - minValue) / range) * (height - 2 * padding);
      
      // Control points for smooth curve
      const cpX1 = prevX + (x - prevX) / 3;
      const cpY1 = prevY;
      const cpX2 = x - (x - prevX) / 3;
      const cpY2 = y;
      
      return `C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y}`;
    }
  }).join(' ');
  
  return (
    <div className="flex items-center justify-center">
      <svg width={width} height={height} className="rounded">
        {/* Background gradient */}
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        
        {/* Fill area under the curve */}
        <path
          d={`${pathData} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
          fill={`url(#gradient-${color.replace('#', '')})`}
        />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {chartData.map((value, index) => {
          const x = padding + (index * (width - 2 * padding)) / (chartData.length - 1);
          const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={1.5}
              fill={color}
              opacity={0.8}
            />
          );
        })}
      </svg>
    </div>
  );
}