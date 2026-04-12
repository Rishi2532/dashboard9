import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

    return (
        <div className={cn("flex flex-col space-y-1.5 min-w-0 w-full overflow-hidden", className)}>
            {!hideLabel && (
                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider whitespace-nowrap">
                    Agency Selection
                </Label>
            )}
            <div className="w-full overflow-visible">
                <Tabs value={selectedAgencyType} onValueChange={onAgencyTypeChange} className="w-full">
                    <TabsList className="h-8 p-1 inline-flex bg-slate-100/80 dark:bg-slate-800/80 w-auto min-w-max border border-slate-200 dark:border-slate-700">
                        {options.map((option) => (
                            <TabsTrigger
                                key={option.value}
                                value={option.value}
                                className="text-[10px] sm:text-[11px] px-3 h-6 rounded-sm font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all whitespace-nowrap"
                            >
                                {option.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>
        </div>
    );
}
