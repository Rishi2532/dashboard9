import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  FileText,
  Download,
  Loader2,
  BarChart3,
  Droplets,
  Activity,
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
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { generateProfessionalSchemePDF } from "@/lib/pdf-generator-professional";

interface SchemeSearchResult {
  scheme_id: string;
  scheme_name: string;
  region: string;
  division: string;
  block: string;
}

interface ESRData {
  esr_name: string;
  chlorine: {
    value_1: string | null;
    value_2: string | null;
    value_3: string | null;
    value_4: string | null;
    value_5: string | null;
    value_6: string | null;
    value_7: string | null;
    date_1: string | null;
    date_2: string | null;
    date_3: string | null;
  };
  pressure: {
    value_1: string | null;
    value_2: string | null;
    value_3: string | null;
    value_4: string | null;
    value_5: string | null;
    value_6: string | null;
    value_7: string | null;
    date_1: string | null;
    date_2: string | null;
    date_3: string | null;
  };
  water_consumption?: {
    day1: string | null;
    day2: string | null;
    day3: string | null;
    day4: string | null;
    day5: string | null;
    day6: string | null;
    day7: string | null;
    date1: string | null;
    date2: string | null;
    date3: string | null;
  };
  flow_rate_m3?: string | null;
  flow_meter_connected?: string | null;
  chlorine_connected?: string | null;
  pressure_connected?: string | null;
}

interface VillageData {
  village_name: string;
  population: number;
  water_consumption: {
    day1: string | null;
    day2: string | null;
    day3: string | null;
    day4: string | null;
    day5: string | null;
    day6: string | null;
    day7: string | null;
    date1: string | null;
    date2: string | null;
    date3: string | null;
  };
  lpcd: {
    day1: string | null;
    day2: string | null;
    day3: string | null;
    day4: string | null;
    day5: string | null;
    day6: string | null;
    day7: string | null;
    date1: string | null;
    date2: string | null;
    date3: string | null;
  };
  esrs: ESRData[];
}

interface SchemeReportData {
  schemeInfo: {
    scheme_id: string;
    scheme_name: string;
    region: string;
    division: string;
    block: string;
    total_villages: number;
    total_esr: number;
  };
  villagesData: VillageData[];
}

function parseESRName(esrName: string): { baseName: string; outlet: string } {
  const trimmed = esrName.trim();
  
  const outletPatterns = [
    /[-\s]+Outlet[-\s]+\d+[-\s]*P?\d*/i,
    /[-\s]+Outlet[-\s]+[A-Z]\d*/i,
    /[-\s]+P\d+$/i,
    /[-\s]+[A-Z]\d+$/,
  ];
  
  for (const pattern of outletPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const baseName = trimmed.substring(0, match.index).trim();
      const outlet = match[0].trim().replace(/^[-\s]+/, '');
      return { baseName, outlet };
    }
  }
  
  return { baseName: trimmed, outlet: '' };
}

function countUniqueESRs(villagesData: VillageData[]): number {
  const uniqueESRs = new Set<string>();
  
  villagesData.forEach(village => {
    village.esrs.forEach(esr => {
      const { baseName } = parseESRName(esr.esr_name);
      uniqueESRs.add(baseName);
    });
  });
  
  return uniqueESRs.size;
}

export default function SmartReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScheme, setSelectedScheme] =
    useState<SchemeSearchResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Search schemes
  const { data: searchResults, isLoading: isSearching } = useQuery<
    SchemeSearchResult[]
  >({
    queryKey: ["/api/smart-reports/search", searchQuery],
    queryFn: async () => {
      const response = await fetch(
        `/api/smart-reports/search?query=${encodeURIComponent(searchQuery)}`,
      );
      if (!response.ok) throw new Error("Failed to search schemes");
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  // Fetch scheme data for report
  const { data: schemeData, isLoading: isLoadingScheme } =
    useQuery<SchemeReportData>({
      queryKey: ["/api/smart-reports/scheme", selectedScheme?.scheme_id],
      queryFn: async () => {
        const response = await fetch(
          `/api/smart-reports/scheme/${selectedScheme?.scheme_id}`,
        );
        if (!response.ok) throw new Error("Failed to fetch scheme data");
        return response.json();
      },
      enabled: !!selectedScheme?.scheme_id,
    });

  const handleSchemeSelect = (scheme: SchemeSearchResult) => {
    setSelectedScheme(scheme);
    setSearchQuery("");
  };

  const handleGeneratePDF = async () => {
    if (!schemeData) {
      toast({
        title: "Error",
        description: "No scheme data available",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      await generateProfessionalSchemePDF(schemeData);
      toast({
        title: "Success",
        description:
          "Professional PDF report with analytics generated successfully",
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              Smart Reports
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Generate comprehensive scheme-level PDF reports with water
              consumption, LPCD, chlorine, and pressure data
            </p>
          </div>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Scheme
            </CardTitle>
            <CardDescription>
              Search by scheme name or scheme ID to generate a detailed report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                data-testid="input-search-scheme"
                placeholder="Type scheme name or ID (e.g., Bidgaon Tarodi, 7940695)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Search Results */}
            {searchQuery.length >= 2 &&
              searchResults &&
              searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Found {searchResults.length} scheme(s)
                  </p>
                  <div className="border rounded-lg divide-y dark:border-gray-700">
                    {searchResults.map((scheme) => (
                      <button
                        key={scheme.scheme_id}
                        data-testid={`button-select-scheme-${scheme.scheme_id}`}
                        onClick={() => handleSchemeSelect(scheme)}
                        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {scheme.scheme_name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          ID: {scheme.scheme_id} | {scheme.region} -{" "}
                          {scheme.division} - {scheme.block}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {searchQuery.length >= 2 && searchResults?.length === 0 && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                No schemes found matching "{searchQuery}"
              </p>
            )}
          </CardContent>
        </Card>

        {/* Selected Scheme Info & Generate Report */}
        {selectedScheme && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Selected Scheme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {selectedScheme.scheme_name}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Scheme ID:
                      </span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {selectedScheme.scheme_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Region:
                      </span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {selectedScheme.region}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Division:
                      </span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {selectedScheme.division}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Block:
                      </span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {selectedScheme.block}
                      </span>
                    </div>
                  </div>
                </div>

                {isLoadingScheme ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">
                      Loading scheme data...
                    </span>
                  </div>
                ) : schemeData ? (
                  <>
                    {/* Data Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {schemeData.schemeInfo.total_villages}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Total Villages
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {schemeData.schemeInfo.total_esr}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Total ESRs
                        </div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {schemeData.villagesData.length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Villages with Data
                        </div>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {countUniqueESRs(schemeData.villagesData)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          ESRs with Data
                        </div>
                      </div>
                    </div>

                    {/* Generate PDF Button */}
                    <Button
                      data-testid="button-generate-pdf"
                      onClick={handleGeneratePDF}
                      disabled={isGenerating}
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
                          Generate & Download PDF Report
                        </>
                      )}
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Report Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Droplets className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Water Consumption
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Village-level daily water consumption data with totals
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    LPCD Analysis
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Liters per capita daily calculations for each village
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-purple-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    ESR Monitoring
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Chlorine and pressure data for each ESR with color-coded
                    status
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
