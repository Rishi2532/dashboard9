import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface AgencyTypeFilterProps {
    selectedAgencyType: string;
    onAgencyTypeChange: (value: string) => void;
    className?: string;
}

export default function AgencyTypeFilter({
    selectedAgencyType,
    onAgencyTypeChange,
    className
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
        <div className={`flex flex-col space-y-1.5 ${className}`}>
            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">Agency Selection</Label>
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {options.map((option) => (
                    <Button
                        key={option.value}
                        variant={selectedAgencyType === option.value ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onAgencyTypeChange(option.value)}
                        className={`h-7 px-4 text-[11px] font-bold rounded-md transition-all duration-200 ${
                            selectedAgencyType === option.value 
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600 hover:bg-white dark:hover:bg-slate-700" 
                                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-transparent"
                        }`}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
