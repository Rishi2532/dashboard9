import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Region } from "@/types";

interface RegionFilterProps {
  regions: Region[];
  selectedRegion: string;
  onChange: (region: string) => void;
  className?: string;
}

export default function RegionFilter({ 
  regions, 
  selectedRegion, 
  onChange,
  className
}: RegionFilterProps) {
  return (
    <div className={className}>
      <Label htmlFor="region" className="text-xs sm:text-sm font-medium text-neutral-700">
        Filter by Region
      </Label>
      <Select 
        value={selectedRegion} 
        onValueChange={onChange}
      >
        <SelectTrigger 
          className={`mt-1 w-full h-8 sm:h-10 text-xs sm:text-sm ${selectedRegion !== 'all' ? 'region-selected' : ''}`}
        >
          <SelectValue placeholder="All Regions" />
        </SelectTrigger>
        <SelectContent className="text-xs sm:text-sm">
          <SelectItem value="all">All Regions</SelectItem>
          {regions.map((region) => (
            <SelectItem key={region.region_id} value={region.region_name}>
              {region.region_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
