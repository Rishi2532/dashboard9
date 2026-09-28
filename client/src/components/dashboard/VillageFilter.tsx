import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckCircle2, Home } from "lucide-react";

export interface VillageFilterProps {
  value: "all" | "completed";
  onChange: (value: "all" | "completed") => void;
  variant?: "select" | "toggle";
  className?: string;
  triggerClassName?: string;
  labelClassName?: string;
  showLabel?: boolean;
  label?: string;
}

export default function VillageFilter({
  value,
  onChange,
  variant = "select",
  className,
  triggerClassName,
  labelClassName,
  showLabel = true,
  label = "Village Filter",
}: VillageFilterProps) {
  if (variant === "toggle") {
    return (
      <div className={cn("w-full", className)}>
        {showLabel && (
          <label
            className={cn(
              "text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5 block",
              labelClassName,
            )}
          >
            {label}
          </label>
        )}
        <div className="flex items-center p-1 bg-gray-100/50 rounded-lg border border-gray-200 w-full">
          <button
            type="button"
            onClick={() => onChange("all")}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5",
              value === "all"
                ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <Home className="h-3.5 w-3.5" />
            All Villages
          </button>
          <button
            type="button"
            onClick={() => onChange("completed")}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5",
              value === "completed"
                ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Fully Completed Villages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-[190px]", className)}>
      {showLabel && (
        <p
          className={cn(
            "text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5",
            labelClassName,
          )}
        >
          {label}
        </p>
      )}
      <Select value={value} onValueChange={(val) => onChange(val as "all" | "completed")}>
        <SelectTrigger
          className={cn(
            "w-full bg-white border-emerald-200 h-9 text-xs focus:ring-emerald-500",
            value === "completed" && "border-emerald-500 bg-emerald-50/40 text-emerald-800 font-semibold",
            triggerClassName,
          )}
        >
          <SelectValue placeholder="Village Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Villages</SelectItem>
          <SelectItem value="completed">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
              Fully Completed Villages
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
