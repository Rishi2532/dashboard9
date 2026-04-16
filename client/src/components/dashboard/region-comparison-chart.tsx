import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Region } from "@/types";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

interface RegionComparisonChartProps {
  regions: Region[];
  isLoading: boolean;
  schemeView?: "ALL" | "INSTRUMENTED";
}

export default function RegionComparisonChart({
  regions,
  isLoading,
  schemeView,
}: RegionComparisonChartProps) {
  const isInstrumented = schemeView === "INSTRUMENTED";
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [selectedDatasets, setSelectedDatasets] = useState<number[]>([]);
  const [showResetButton, setShowResetButton] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // Update screen width on window resize
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Generate datasets from region data
  const generateChartData = (regions: Region[]) => {
    const sortedRegions = [...regions].sort((a, b) =>
      a.region_name.localeCompare(b.region_name),
    );

    const labels = sortedRegions.map((region) => {
      // More aggressive abbreviation for mobile screens
      if (screenWidth < 640) {
        // Very small screens - use 3-4 letter abbreviations
        if (region.region_name === "Chhatrapati Sambhajinagar") return "CSN";
        if (region.region_name === "Amravati") return "AMR";
        if (region.region_name === "Nashik") return "NSK";
        if (region.region_name === "Nagpur") return "NGP";
        if (region.region_name === "Konkan") return "KON";
        if (region.region_name === "Pune") return "PUN";
        return region.region_name.substring(0, 3);
      } else if (screenWidth < 768) {
        // Small screens - use shorter abbreviations
        if (region.region_name === "Chhatrapati Sambhajinagar") return "C. Sbj";
        return region.region_name.length > 6
          ? region.region_name.substring(0, 6) + "."
          : region.region_name;
      } else {
        // Regular abbreviation for larger screens
        if (region.region_name === "Chhatrapati Sambhajinagar")
          return "C. Sambhajinagar";
        return region.region_name;
      }
    });

    // Extract only fully completed data from regions
    return {
      labels,
      datasets: [
        {
          label: isInstrumented ? "Fully Operational ESR" : "Fully Completed ESR",
          data: sortedRegions.map((region) => region.fully_completed_esr || 0),
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
          hidden: selectedDatasets.length > 0 && !selectedDatasets.includes(0),
        },
        {
          label: isInstrumented ? "Fully Operational Villages" : "Fully Completed Villages",
          data: sortedRegions.map(
            (region) => region.fully_completed_villages || 0,
          ),
          backgroundColor: "rgba(236, 72, 153, 0.6)",
          borderColor: "rgba(236, 72, 153, 1)",
          borderWidth: 1,
          hidden: selectedDatasets.length > 0 && !selectedDatasets.includes(1),
        },
        {
          label: isInstrumented ? "Fully Operational Schemes" : "Fully Completed Schemes",
          data: sortedRegions.map(
            (region) => region.fully_completed_schemes || 0,
          ),
          backgroundColor: "rgba(239, 68, 68, 0.6)",
          borderColor: "rgba(239, 68, 68, 1)",
          borderWidth: 1,
          hidden: selectedDatasets.length > 0 && !selectedDatasets.includes(2),
        },
      ],
    };
  };

  // Handle legend item click
  const handleLegendClick = (datasetIndex: number) => {
    if (selectedDatasets.includes(datasetIndex)) {
      // If already selected, remove it
      const newSelected = selectedDatasets.filter(
        (idx) => idx !== datasetIndex,
      );
      setSelectedDatasets(newSelected);

      // If nothing is selected now, hide the reset button
      if (newSelected.length === 0) {
        setShowResetButton(false);
      }
    } else {
      // If not selected, add it
      setSelectedDatasets([...selectedDatasets, datasetIndex]);
      setShowResetButton(true);
    }
  };

  // Reset all selections
  const resetSelections = () => {
    setSelectedDatasets([]);
    setShowResetButton(false);
  };

  useEffect(() => {
    if (isLoading || !regions.length || !chartRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Register the plugin
    Chart.register(ChartDataLabels);

    const chartData = generateChartData(regions);

    // Adjust chart configuration based on screen size
    const isMobile = screenWidth < 640;
    const isTablet = screenWidth >= 640 && screenWidth < 1024;

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: isMobile ? 10 : 20,
            right: isMobile ? 10 : 20,
            bottom: isMobile ? 30 : 60,
            left: isMobile ? 10 : 20,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: !isMobile, // Hide title on mobile
              text: "Count",
              font: {
                size: isMobile ? 14 : isTablet ? 16 : 20,
                weight: "bold",
              },
              padding: { top: 10, bottom: 10 },
            },
            grid: {
              color: "rgba(0,0,0,0.1)",
            },
            ticks: {
              // Use smaller font on mobile
              font: {
                size: isMobile ? 10 : 12,
              },
              // Show fewer ticks on mobile
              maxTicksLimit: isMobile ? 5 : 10,
            },
            max: function (context: any) {
              let maxValue = 0;
              if (
                context.chart &&
                context.chart.data &&
                context.chart.data.datasets
              ) {
                const allData = context.chart.data.datasets.flatMap(
                  (d: any) => d.data || [],
                );
                maxValue = Math.max(
                  ...allData.filter((v: any) => typeof v === "number"),
                );
              }

              // Calculate the nearest higher round number efficiently
              if (maxValue === 0) return 10;

              // Add 10% padding to maxValue
              const paddedMax = maxValue * 1.1;

              // Find the appropriate scale based on the magnitude
              let scale;
              if (paddedMax <= 10) {
                scale = 5;
              } else if (paddedMax <= 50) {
                scale = 10;
              } else if (paddedMax <= 100) {
                scale = 25;
              } else if (paddedMax <= 250) {
                scale = 50;
              } else {
                scale = 100;
              }

              // Round up to the nearest scale interval
              return Math.ceil(paddedMax / scale) * scale;
            },
          },
          x: {
            ticks: {
              autoSkip: isMobile, // Enable autoskip on mobile
              maxRotation: isMobile ? 90 : 45, // More rotation on mobile to save space
              minRotation: isMobile ? 90 : 45,
              font: {
                size: isMobile ? 10 : isTablet ? 12 : 14,
              },
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            onClick: function (e, legendItem) {
              const index = legendItem.datasetIndex;
              if (index !== undefined) {
                handleLegendClick(index);
              }
            },
            labels: {
              boxWidth: isMobile ? 10 : 15,
              padding: isMobile ? 5 : 10,
              font: {
                size: isMobile ? 9 : isTablet ? 12 : 15,
                weight: "bold",
              },
              usePointStyle: true,
              generateLabels: function (chart) {
                const labels =
                  Chart.defaults.plugins.legend.labels.generateLabels(chart);
                // Add visual indicator for selected items
                labels.forEach((label, i) => {
                  if (selectedDatasets.includes(i)) {
                    // Make selected items stand out
                    label.lineWidth = 2;
                    label.strokeStyle = label.fillStyle;
                    label.fontColor = "#000000";
                  } else if (selectedDatasets.length > 0) {
                    // Fade non-selected items
                    label.fillStyle = `${label.fillStyle}80`; // Add transparency
                    label.fontColor = "#888888";
                  }
                });
                return labels;
              },
            },
            // Change legend display on mobile to save space
            display: !isMobile || selectedDatasets.length > 0,
            title: {
              display: !isMobile, // Hide on mobile
              text: isMobile
                ? "Tap to filter"
                : "Region Wise IoT Project Status (Click to Toggle)",
              font: {
                size: isMobile ? 12 : isTablet ? 14 : 18,
                weight: "bold",
              },
              padding: {
                bottom: isMobile ? 5 : 15,
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleFont: {
              size: isMobile ? 10 : 12,
            },
            bodyFont: {
              size: isMobile ? 9 : 11,
            },
            padding: isMobile ? 6 : 10,
            displayColors: true,
          },
          datalabels: {
            color: "#000",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            borderRadius: 4,
            padding: isMobile ? 1 : 2,
            font: {
              weight: "bold",
              size: isMobile ? 8 : 12,
            },
            formatter: (value: any) => {
              if (value === 0 || value === "0" || !value) {
                return "0";
              }
              // On mobile, abbreviate large numbers
              if (isMobile && value > 999) {
                return (value / 1000).toFixed(1) + "k";
              }
              return value.toString();
            },
            display: (context: any) => {
              // On mobile, only show labels for larger values to avoid clutter
              if (isMobile) {
                const value = Number(
                  context.dataset.data[context.dataIndex] || 0,
                );
                return value > 20; // Only show labels for values > 20 on mobile
              }
              return true;
            },
            anchor: "end",
            align: function (context: any) {
              const datasetIndex = context.datasetIndex || 0;
              const value = Number(
                context.dataset.data[context.dataIndex] || 0,
              );

              if (isMobile) {
                return value > 100 ? "end" : "start";
              }

              if (datasetIndex === 0 && value > 300) {
                return "end";
              } else if (value > 150) {
                return "start";
              }
              return "top";
            },
            offset: function (context: any) {
              const datasetIndex = context.datasetIndex || 0;
              const value = Number(
                context.dataset.data[context.dataIndex] || 0,
              );

              if (isMobile) {
                return value > 100 ? 8 : 2;
              }

              if (datasetIndex === 0 && value > 300) {
                return 15;
              } else if (value > 150) {
                return 8;
              } else if (value > 100) {
                return 5;
              }

              return 2;
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [regions, isLoading, selectedDatasets, isInstrumented]);

  return (
    <div
      className="h-full flex flex-col"
      style={{ height: "50vh", maxHeight: "50vh" }}
    >
      {showResetButton && (
        <div className="flex justify-end mb-2">
          <button
            onClick={resetSelections}
            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
          >
            Show All Data
          </button>
        </div>
      )}
      {isLoading ? (
        <div className="animate-pulse h-full w-full bg-gray-200 rounded flex-1"></div>
      ) : (
        <div className="h-full w-full flex-1">
          <canvas ref={chartRef} className="h-full w-full"></canvas>
        </div>
      )}
    </div>
  );
}
