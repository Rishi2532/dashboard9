import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOptions {
    regions: string[];
    circles: string[];
    divisions: string[];
    subdivisions: string[];
    blocks: string[];
}

interface GeographicalFiltersProps {
    filters: FilterOptions | undefined;
    selectedRegion: string;
    selectedCircle: string;
    selectedDivision: string;
    selectedSubdivision: string;
    selectedBlock: string;
    onRegionChange: (value: string) => void;
    onCircleChange: (value: string) => void;
    onDivisionChange: (value: string) => void;
    onSubdivisionChange: (value: string) => void;
    onBlockChange: (value: string) => void;
    className?: string;
}

interface SearchableSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    options: string[] | undefined;
    placeholder: string;
    allLabel: string;
    searchPlaceholder?: string;
}

export function SearchableSelect({
    value,
    onValueChange,
    options,
    placeholder,
    allLabel,
    searchPlaceholder,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const cleanOptions = useMemo(() => {
        if (!options || !Array.isArray(options)) return [];
        const set = new Set<string>();
        const list: string[] = [];
        for (const opt of options) {
            if (opt && typeof opt === "string") {
                const trimmed = opt.trim();
                if (trimmed && !set.has(trimmed)) {
                    set.add(trimmed);
                    list.push(trimmed);
                }
            }
        }
        return list;
    }, [options]);

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return cleanOptions;
        const q = search.trim().toLowerCase();
        return cleanOptions.filter((opt) => opt.toLowerCase().includes(q));
    }, [cleanOptions, search]);

    const showAllOption = useMemo(() => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return allLabel.toLowerCase().includes(q) || "all".includes(q);
    }, [search, allLabel]);

    const displayLabel = useMemo(() => {
        if (!value || value === "all") return allLabel;
        return value;
    }, [value, allLabel]);

    return (
        <Popover open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) setSearch("");
        }}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-left ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-slate-50 transition-colors shadow-sm",
                        open && "ring-1 ring-blue-500 border-blue-500"
                    )}
                    title={displayLabel}
                >
                    <span className={cn("truncate flex-1 mr-1", value && value !== "all" ? "font-medium text-slate-800" : "text-slate-600")}>
                        {displayLabel}
                    </span>
                    <ChevronDown
                        className={cn(
                            "h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200",
                            open && "transform rotate-180 text-blue-500"
                        )}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] min-w-[210px] p-0 bg-white border border-slate-200 shadow-xl rounded-md overflow-hidden z-[9999]"
                align="start"
                sideOffset={4}
            >
                {/* Search Input Bar */}
                <div className="flex items-center border-b border-slate-100 px-2.5 py-1.5 bg-slate-50/70">
                    <Search className="h-3.5 w-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                        type="text"
                        className="w-full text-xs bg-transparent outline-none placeholder:text-slate-400 text-slate-700"
                        placeholder={searchPlaceholder || `Search ${placeholder.toLowerCase()}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                            title="Clear search"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {/* Scrollable Options List */}
                <div className="max-h-60 overflow-y-auto select-dropdown-viewport p-1">
                    {showAllOption && (
                        <div
                            onClick={() => {
                                onValueChange("all");
                                setOpen(false);
                                setSearch("");
                            }}
                            className={cn(
                                "relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-xs outline-none transition-colors",
                                !value || value === "all"
                                    ? "bg-blue-50 font-semibold text-blue-700"
                                    : "text-slate-700 hover:bg-slate-100"
                            )}
                        >
                            {(!value || value === "all") ? (
                                <Check className="h-3.5 w-3.5 text-blue-600 mr-1.5 shrink-0" />
                            ) : (
                                <span className="w-5 shrink-0" />
                            )}
                            <span className="truncate">{allLabel}</span>
                        </div>
                    )}

                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => {
                            const isSelected = value === opt;
                            return (
                                <div
                                    key={opt}
                                    onClick={() => {
                                        onValueChange(opt);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded px-2 py-1.5 text-xs outline-none transition-colors",
                                        isSelected
                                            ? "bg-blue-50 font-semibold text-blue-700"
                                            : "text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    {isSelected ? (
                                        <Check className="h-3.5 w-3.5 text-blue-600 mr-1.5 shrink-0" />
                                    ) : (
                                        <span className="w-5 shrink-0" />
                                    )}
                                    <span className="truncate" title={opt}>{opt}</span>
                                </div>
                            );
                        })
                    ) : (
                        !showAllOption && (
                            <div className="py-4 text-center text-xs text-slate-400">
                                No {placeholder.toLowerCase()}s found
                            </div>
                        )
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default function GeographicalFilters({
    filters,
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
    className
}: GeographicalFiltersProps) {
    return (
        <div className={`grid grid-cols-2 lg:grid-cols-5 gap-3 ${className}`}>
            <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Region</Label>
                <SearchableSelect
                    value={selectedRegion}
                    onValueChange={onRegionChange}
                    options={filters?.regions}
                    placeholder="Region"
                    allLabel="All Regions"
                />
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Circle</Label>
                <SearchableSelect
                    value={selectedCircle}
                    onValueChange={onCircleChange}
                    options={filters?.circles}
                    placeholder="Circle"
                    allLabel="All Circles"
                />
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Division</Label>
                <SearchableSelect
                    value={selectedDivision}
                    onValueChange={onDivisionChange}
                    options={filters?.divisions}
                    placeholder="Division"
                    allLabel="All Divisions"
                />
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Sub Division</Label>
                <SearchableSelect
                    value={selectedSubdivision}
                    onValueChange={onSubdivisionChange}
                    options={filters?.subdivisions}
                    placeholder="Sub Division"
                    allLabel="All Sub Divisions"
                />
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Block</Label>
                <SearchableSelect
                    value={selectedBlock}
                    onValueChange={onBlockChange}
                    options={filters?.blocks}
                    placeholder="Block"
                    allLabel="All Blocks"
                />
            </div>
        </div>
    );
}
