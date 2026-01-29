import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RegionSummary } from "@/types";
import Chart from "chart.js/auto";
import ChartDataLabels from 'chartjs-plugin-datalabels';

interface CompletionStatusChartProps {
  regionSummary?: RegionSummary;
  isLoading: boolean;
}

export default function CompletionStatusChart({ regionSummary, isLoading }: CompletionStatusChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (isLoading || !regionSummary || !chartRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Register the plugin
    Chart.register(ChartDataLabels);

    const fullyCompletedCount = regionSummary.fully_completed_schemes || 0;
    const partialCount = (regionSummary.total_schemes_integrated || 0) - fullyCompletedCount;
    
    // Removing Not Connected as requested
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [`Fully Completed (${fullyCompletedCount})`, `Partial (${partialCount})`],
        datasets: [{
          data: [fullyCompletedCount, partialCount],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw as number;
                const data = context.chart.data.datasets[0].data as number[];
                const total = data.reduce((sum, val) => sum + (val || 0), 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          },
          datalabels: {
            color: '#fff',
            font: {
              weight: 'bold',
              size: 14
            },
            formatter: (value: number) => {
              return value.toString();
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [regionSummary, isLoading]);

  return (
    <Card className="bg-white">
      <CardContent className="p-5">
        <h3 className="text-lg leading-6 font-medium text-neutral-900">Completion Status</h3>
        <div className="mt-1 text-sm text-neutral-500">
          Overall scheme completion status
        </div>
        <div className="mt-4 h-[250px] w-full">
          {isLoading ? (
            <div className="animate-pulse h-full w-full bg-gray-200 rounded"></div>
          ) : (
            <canvas ref={chartRef}></canvas>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
