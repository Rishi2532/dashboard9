import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
        <div className={`grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 ${className}`}>
            <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Region</Label>
                <Select value={selectedRegion} onValueChange={onRegionChange}>
                    <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {filters?.regions?.map((region) => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Circle</Label>
                <Select value={selectedCircle} onValueChange={onCircleChange}>
                    <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Circles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Circles</SelectItem>
                        {filters?.circles?.map((circle) => (
                            <SelectItem key={circle} value={circle}>{circle}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Division</Label>
                <Select value={selectedDivision} onValueChange={onDivisionChange}>
                    <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Divisions</SelectItem>
                        {filters?.divisions?.map((division) => (
                            <SelectItem key={division} value={division}>{division}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Sub Division</Label>
                <Select value={selectedSubdivision} onValueChange={onSubdivisionChange}>
                    <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Sub Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sub Divisions</SelectItem>
                        {filters?.subdivisions?.map((sub) => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Block</Label>
                <Select value={selectedBlock} onValueChange={onBlockChange}>
                    <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Blocks" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Blocks</SelectItem>
                        {filters?.blocks?.map((block) => (
                            <SelectItem key={block} value={block}>{block}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
