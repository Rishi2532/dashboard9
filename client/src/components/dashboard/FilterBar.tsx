import React from "react";
import { Search, X, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GeographicalFilters from "./GeographicalFilters";
import AgencyTypeFilter from "./AgencyTypeFilter";
import { cn } from "@/lib/utils";

interface FilterOptions {
  regions: string[];
  circles: string[];
  divisions: string[];
  subdivisions: string[];
  blocks: string[];
}

interface FilterBarProps {
  // Geographical
  filterOptions: FilterOptions | undefined;
  selectedRegion: string;
  selectedCircle: string;
  selectedDivision: string;
  selectedSubdivision: string;
  selectedBlock: string;
  onRegionChange: (v: string) => void;
  onCircleChange: (v: string) => void;
  onDivisionChange: (v: string) => void;
  onSubdivisionChange: (v: string) => void;
  onBlockChange: (v: string) => void;

  // Agency
  selectedAgencyType: string;
  onAgencyTypeChange: (v: string) => void;

  // Search
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;

  // Extra filters (middle row)
  extraFilters?: React.ReactNode;

  // Right side actions in bottom row
  rightActions?: React.ReactNode;

  // Result count for footer
  resultCount?: number;
  resultLabel?: string;

  // Clear all
  onClearAll?: () => void;

  className?: string;
}

export default function FilterBar({
  filterOptions,
  selectedRegion,
  selectedCircle,
  selectedDivision,
  selectedSubdivision,
  selectedBlock,
  onRegionChange,
  onCircleChange,
  onDivisionChange,
  onSubdivisionChange,
  onBlockChange,
  selectedAgencyType,
  onAgencyTypeChange,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  extraFilters,
  rightActions,
  resultCount,
  resultLabel = "results",
  onClearAll,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("bg-white border border-blue-100 rounded-xl shadow-sm mb-5 overflow-hidden", className)}>
      <div className="p-3 flex flex-col gap-3">
        {/* Row 1: Geography + Agency */}
        <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 mb-3">
          <div className="flex flex-col lg:flex-row gap-3 items-end w-full">
            {/* Geographical */}
            <div className="flex-1 w-full">
              <GeographicalFilters
                filters={filterOptions}
                selectedRegion={selectedRegion}
                selectedCircle={selectedCircle}
                selectedDivision={selectedDivision}
                selectedSubdivision={selectedSubdivision}
                selectedBlock={selectedBlock}
                onRegionChange={onRegionChange}
                onCircleChange={onCircleChange}
                onDivisionChange={onDivisionChange}
                onSubdivisionChange={onSubdivisionChange}
                onBlockChange={onBlockChange}
                className="mb-0 grid-cols-2 md:grid-cols-5 gap-2"
              />
            </div>
            {/* Agency */}
            <div className="w-full lg:w-auto lg:min-w-[400px]">
              <AgencyTypeFilter
                selectedAgencyType={selectedAgencyType}
                onAgencyTypeChange={onAgencyTypeChange}
                variant="select"
                hideLabel={false}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Extra Filters + Search + Actions */}
        <div className="flex flex-wrap gap-2 items-end">
          {extraFilters}

          {onSearchChange && (
            <div className="flex-1 min-w-[140px] max-w-xs space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Search</p>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-8 text-xs pl-7 pr-7 bg-white border-slate-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Right actions + clear */}
          <div className="flex items-end gap-2 ml-auto">
            {rightActions}
            {onClearAll && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-transparent uppercase tracking-wider ml-1">.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  title="Clear all filters"
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-100 px-3 py-1.5 flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
          Live Data Feed
        </div>
        {resultCount !== undefined && (
          <div className="text-[10px] font-medium text-slate-600">
            Showing <span className="text-blue-600 font-bold">{resultCount.toLocaleString()}</span>{" "}
            {resultLabel}
          </div>
        )}
      </div>
    </div>
  );
}
