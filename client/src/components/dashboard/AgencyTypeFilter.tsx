import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AgencyTypeFilterProps {
    selectedAgencyType: string;
    onAgencyTypeChange: (value: string) => void;
    className?: string;
    variant?: "segmented" | "select";
    hideLabel?: boolean;
}

export default function AgencyTypeFilter({
    selectedAgencyType,
    onAgencyTypeChange,
    className,
    variant = "segmented",
    hideLabel = false
}: AgencyTypeFilterProps) {
    const options = [
        { label: "All Agencies", value: "ALL" },
        { label: "MJP", value: "MJP" },
        { label: "Contractor", value: "Contractor" },
        { label: "GP", value: "GP" },
        { label: "ZP-Self", value: "ZP-Self" },
        { label: "ZP-Shikarsamiti", value: "ZP-Shikarsamiti" },
        { label: "Not Assigned", value: "Agency Not Assigned" },
    ];

    if (variant === "select") {
        return (
            <div className={cn("flex flex-col space-y-1.5", className)}>
                {!hideLabel && (
                    <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">
                        Agency Selection
                    </Label>
                )}
                <Select value={selectedAgencyType} onValueChange={onAgencyTypeChange}>
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200 px-2 shadow-sm focus:ring-blue-500">
                        <SelectValue placeholder="Select Agency" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col space-y-1.5", className)}>
            {!hideLabel && (
                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">
                    Agency Selection
                </Label>
            )}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg w-full border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300">
                {options.map((option) => (
                    <Button
                        key={option.value}
                        variant={selectedAgencyType === option.value ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onAgencyTypeChange(option.value)}
                        className={cn(
                            "h-7 px-3 text-[10px] sm:text-[11px] font-bold rounded-md transition-all duration-200",
                            selectedAgencyType === option.value
                                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600 hover:bg-white dark:hover:bg-slate-700"
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                        )}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
