import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Download, Calendar, FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface HistoricalDownloadModalProps {
  selectedRegion: string;
}

export default function HistoricalDownloadModal({
  selectedRegion,
}: HistoricalDownloadModalProps) {
  const [open, setOpen] = useState(false);
  const [downloadType, setDownloadType] = useState<"latest" | "historical">("latest");
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const regions = [
    "all",
    "Nagpur",
    "Amravati",
    "Nashik",
    "Pune",
    "Konkan",
    "Chhatrapati Sambhajinagar",
  ];

  const [region, setRegion] = useState(selectedRegion || "all");

  useEffect(() => {
    setRegion(selectedRegion || "all");
  }, [selectedRegion]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      if (downloadType === "historical") {
        if (!startDate || !endDate) {
          toast({
            title: "Date Range Required",
            description: "Please select both start and end dates for historical data download.",
            variant: "destructive",
          });
          setIsDownloading(false);
          return;
        }

        if (new Date(startDate) > new Date(endDate)) {
          toast({
            title: "Invalid Date Range",
            description: "Start date cannot be after end date.",
            variant: "destructive",
          });
          setIsDownloading(false);
          return;
        }
      }

      toast({
        title: "Preparing Download",
        description: `Gathering ${downloadType === "latest" ? "latest" : "historical"} ESR data...`,
      });

      let url = "";
      if (downloadType === "latest") {
        url = `/api/combined-esr-download/latest?region=${region}`;
      } else {
        url = `/api/combined-esr-download/historical?startDate=${startDate}&endDate=${endDate}&region=${region}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = downloadType === "latest" 
        ? `esr_combined_latest_${region}_${format(new Date(), "yyyy-MM-dd")}.xlsx`
        : `esr_combined_historical_${region}_${startDate}_to_${endDate}.xlsx`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: "Download Complete",
        description: `ESR combined data has been exported successfully.`,
      });

      setOpen(false);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-green-300 hover:bg-green-50 transition-all text-xs sm:text-sm shadow-sm"
          data-testid="btn-historical-download"
        >
          <FileSpreadsheet className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          ESR Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Download ESR Combined Data
          </DialogTitle>
          <DialogDescription>
            Download combined Water Consumption, Chlorine, and Pressure data at ESR level.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data Type</Label>
            <RadioGroup
              value={downloadType}
              onValueChange={(value) => setDownloadType(value as "latest" | "historical")}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="latest" id="latest" data-testid="radio-latest" />
                <Label htmlFor="latest" className="cursor-pointer flex-1">
                  <div className="font-medium">Latest Data (Day 7)</div>
                  <div className="text-xs text-gray-500">
                    Most recent values for water consumption, chlorine, and pressure
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="historical" id="historical" data-testid="radio-historical" />
                <Label htmlFor="historical" className="cursor-pointer flex-1">
                  <div className="font-medium">Historical Data (Date Range)</div>
                  <div className="text-xs text-gray-500">
                    Historical records from selected date range
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Region Filter</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-full" data-testid="select-region">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r} value={r} data-testid={`option-region-${r}`}>
                    {r === "all" ? "All Regions" : r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {downloadType === "historical" && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Select Date Range
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white"
                    data-testid="input-start-date"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white"
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700">
            <div className="font-medium mb-1">Data Included:</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Water Consumption (water_value_day7 / historical water_value)</li>
              <li>Chlorine Level (chlorine_value_7 / historical chlorine_value)</li>
              <li>Pressure Reading (pressure_value_7 / historical pressure_value)</li>
            </ul>
            <div className="mt-2 text-gray-500">
              Data is matched by ESR hierarchy: Region → Circle → Division → Sub Division → Block → Scheme → Village → ESR
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="btn-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="btn-download-esr"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Excel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
