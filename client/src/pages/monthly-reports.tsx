import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Loader2,
  Calendar,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { generateMonthlyReportPDF } from "@/lib/pdf-generator-monthly";
import { generateMonthlyChlorineReportPDF } from "@/lib/pdf-generator-monthly-chlorine";
import { generateMonthlyPressureReportPDF } from "@/lib/pdf-generator-monthly-pressure";
import GeographicalFilters from "@/components/dashboard/GeographicalFilters";

export default function MonthlyReportsPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCircle, setSelectedCircle] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("all");

  // Default to current month YYYY-MM
  const [reportMonth, setReportMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [reportType, setReportType] = useState<"LPCD" | "Chlorine" | "Pressure">("LPCD");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch cascading filter options
  const { data: filterOptions } = useQuery({
    queryKey: [
      "/api/schemes/filters",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.set("region", selectedRegion);
      if (selectedCircle !== "all") params.set("circle", selectedCircle);
      if (selectedDivision !== "all") params.set("division", selectedDivision);
      if (selectedSubdivision !== "all")
        params.set("subdivision", selectedSubdivision);

      const response = await fetch(`/api/schemes/filters?${params.toString()}`);
      return response.json();
    },
  });

  // Fetch schemes based on active filters
  const { data: schemes } = useQuery<any[]>({
    queryKey: [
      "/api/schemes",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedBlock,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.set("region", selectedRegion);
      if (selectedCircle !== "all") params.set("circle", selectedCircle);
      if (selectedDivision !== "all") params.set("division", selectedDivision);
      if (selectedSubdivision !== "all") params.set("subdivision", selectedSubdivision);
      if (selectedBlock !== "all") params.set("block", selectedBlock);
      params.set("consolidated", "true");
      const res = await fetch(`/api/schemes?${params.toString()}`);
      return res.json();
    },
    enabled: selectedRegion !== "all",
  });

  const handleRegionChange = (val: string) => {
    setSelectedRegion(val);
    setSelectedCircle("all");
    setSelectedDivision("all");
    setSelectedSubdivision("all");
    setSelectedBlock("all");
    setSelectedSchemeId("all");
  };

  const handleCircleChange = (val: string) => {
    setSelectedCircle(val);
    setSelectedDivision("all");
    setSelectedSubdivision("all");
    setSelectedBlock("all");
    setSelectedSchemeId("all");
  };

  const handleDivisionChange = (val: string) => {
    setSelectedDivision(val);
    setSelectedSubdivision("all");
    setSelectedBlock("all");
    setSelectedSchemeId("all");
  };

  const handleSubdivisionChange = (val: string) => {
    setSelectedSubdivision(val);
    setSelectedBlock("all");
    setSelectedSchemeId("all");
  };

  const handleBlockChange = (val: string) => {
    setSelectedBlock(val);
    setSelectedSchemeId("all");
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams();
      params.append("region", selectedRegion);
      params.append("circle", selectedCircle);
      params.append("division", selectedDivision);
      params.append("subdivision", selectedSubdivision);
      params.append("block", selectedBlock);
      params.append("scheme_id", selectedSchemeId);
      params.append("report_month", reportMonth);
      params.append("report_type", reportType.toLowerCase());

      const response = await fetch(`/api/monthly-reports/data?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch monthly integration data");
      }

      const data = await response.json();
      console.log("[MonthlyReport] API data received:", data);

      if (reportType === "LPCD") {
        await generateMonthlyReportPDF(data);
      } else if (reportType === "Chlorine") {
        await generateMonthlyChlorineReportPDF(data);
      } else if (reportType === "Pressure") {
        await generateMonthlyPressureReportPDF(data);
      }

      toast({
        title: "Success",
        description: "Monthly PDF report generated successfully.",
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error generating PDF:", errMsg, error);
      toast({
        title: "Error",
        description: `Failed to generate PDF: ${errMsg}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              Monthly Integration Reports
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Generate comprehensive monthly PDF reports with integration status
              for ESRs, RCAs, PTs, and FMs.
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Report Configuration
            </CardTitle>
            <CardDescription>
              Select the region and month to generate the integration report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cascading Geo Filters */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border">
              <GeographicalFilters
                filters={filterOptions}
                selectedRegion={selectedRegion}
                selectedCircle={selectedCircle}
                selectedDivision={selectedDivision}
                selectedSubdivision={selectedSubdivision}
                selectedBlock={selectedBlock}
                onRegionChange={handleRegionChange}
                onCircleChange={handleCircleChange}
                onDivisionChange={handleDivisionChange}
                onSubdivisionChange={handleSubdivisionChange}
                onBlockChange={handleBlockChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Report Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="report-type" className="text-sm font-medium">
                  Report Type
                </Label>
                <Select
                  value={reportType}
                  onValueChange={(val: any) => setReportType(val)}
                >
                  <SelectTrigger id="report-type" className="w-full h-10">
                    <SelectValue placeholder="Select Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LPCD">LPCD</SelectItem>
                    <SelectItem value="Chlorine">Chlorine</SelectItem>
                    <SelectItem value="Pressure">Pressure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scheme Filter */}
              <div className="space-y-2">
                <Label htmlFor="scheme" className="text-sm font-medium">
                  Scheme
                </Label>
                <Select
                  value={selectedSchemeId}
                  onValueChange={setSelectedSchemeId}
                  disabled={selectedRegion === "all"}
                >
                  <SelectTrigger id="scheme" className="w-full h-10">
                    <SelectValue placeholder={selectedRegion === "all" ? "Select a Region first" : "All Schemes"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schemes</SelectItem>
                    {schemes?.map((scheme) => (
                      <SelectItem key={scheme.scheme_id} value={scheme.scheme_id}>
                        {scheme.scheme_name} ({scheme.scheme_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Filter */}
              <div className="space-y-2">
                <Label htmlFor="month" className="text-sm font-medium">
                  Report Month
                </Label>
                <div className="relative">
                  <Input
                    id="month"
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-full h-10 pl-10"
                  />
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Generate PDF Button */}
            <div className="pt-4 border-t dark:border-gray-800">
              <Button
                data-testid="button-generate-pdf"
                onClick={handleGeneratePDF}
                disabled={isGenerating || !reportMonth}
                className="w-full md:w-auto"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Monthly PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Generate & Download Monthly Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
