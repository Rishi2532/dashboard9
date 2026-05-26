import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { generateMonthlyProgressPDF } from "@/lib/pdf-generator-monthly";

export default function MonthlyReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [region, setRegion] = useState("All Regions");
  const [circle, setCircle] = useState("");
  const [division, setDivision] = useState("");
  const [subDivision, setSubDivision] = useState("");
  const [block, setBlock] = useState("");
  const [schemeId, setSchemeId] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGeneratePDF = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both Start Date and End Date.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (region && region !== "All Regions") params.append("region", region);
      if (circle) params.append("circle", circle);
      if (division) params.append("division", division);
      if (subDivision) params.append("sub_division", subDivision);
      if (block) params.append("block", block);
      if (schemeId) params.append("scheme_id", schemeId);

      const response = await fetch(`/api/monthly-reports/progress?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch progress data");
      }

      const result = await response.json();
      
      if (!result.data || result.data.length === 0) {
        toast({
          title: "No Data",
          description: "No historical data found for the selected dates and filters.",
          variant: "destructive",
        });
        return;
      }

      await generateMonthlyProgressPDF(result.data, {
        region, circle, division, sub_division: subDivision, block, scheme_id: schemeId
      }, startDate, endDate);

      toast({
        title: "Success",
        description: "Monthly Progress PDF report generated successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              Monthly Progress Reports
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Generate custom date range progress reports based on historical data snapshots.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range & Filters
            </CardTitle>
            <CardDescription>
              Select the start and end dates to calculate the progress, and apply any location filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Region</label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="All Regions">All Regions</option>
                  <option value="Amravati">Amravati</option>
                  <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
                  <option value="Konkan">Konkan</option>
                  <option value="Nagpur">Nagpur</option>
                  <option value="Nashik">Nashik</option>
                  <option value="Pune">Pune</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Circle</label>
                <Input
                  placeholder="Enter Circle..."
                  value={circle}
                  onChange={(e) => setCircle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Division</label>
                <Input
                  placeholder="Enter Division..."
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sub Division</label>
                <Input
                  placeholder="Enter Sub Division..."
                  value={subDivision}
                  onChange={(e) => setSubDivision(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Block</label>
                <Input
                  placeholder="Enter Block..."
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Scheme ID</label>
                <Input
                  placeholder="Enter Scheme ID..."
                  value={schemeId}
                  onChange={(e) => setSchemeId(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-6">
              <Button
                onClick={handleGeneratePDF}
                disabled={isGenerating || !startDate || !endDate}
                className="w-full md:w-auto"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Generate & Download Progress Report
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
