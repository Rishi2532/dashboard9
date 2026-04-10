import React from "react";
import { RefreshCw, Download, History, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardPageHeaderProps {
  title: string;
  subtitle: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  exportCount?: number;
  onToggleHistory?: () => void;
  showHistoricalData?: boolean;
  onToggleCharts?: () => void;
  showCharts?: boolean;
  extraActions?: React.ReactNode;
  className?: string;
}

export default function DashboardPageHeader({
  title,
  subtitle,
  isLoading = false,
  onRefresh,
  onExport,
  exportCount,
  onToggleHistory,
  showHistoricalData,
  onToggleCharts,
  showCharts,
  extraActions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3", className)}>
      {/* Title block */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-1 bg-blue-600 rounded-full shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-blue-900 leading-snug">{title}</h1>
          <p className="text-[11px] text-blue-500 font-medium">{subtitle}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5 px-3"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span className="hidden sm:inline text-xs font-medium">Refresh</span>
          </Button>
        )}

        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5 px-3"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs font-medium">Export</span>
            {exportCount !== undefined && (
              <span className="text-emerald-500/80 text-[10px] font-bold">({exportCount})</span>
            )}
          </Button>
        )}

        {onToggleHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleHistory}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs font-medium",
              showHistoricalData
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "border-blue-200 text-blue-700 hover:bg-blue-50"
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{showHistoricalData ? "Current" : "History"}</span>
          </Button>
        )}

        {onToggleCharts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleCharts}
            className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5 px-3"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs font-medium">{showCharts ? "Hide Charts" : "Show Charts"}</span>
          </Button>
        )}

        {extraActions}
      </div>
    </div>
  );
}
