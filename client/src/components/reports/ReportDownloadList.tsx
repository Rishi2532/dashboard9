import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileSpreadsheet,
  Download,
  Calendar,
  SearchIcon,
  FileDown
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnhancedActivityTracker } from "@/hooks/use-enhanced-activity-tracker";

type ReportFile = {
  id: number;
  file_name: string;
  original_name: string;
  file_path: string;
  report_type: string;
  upload_date: string;
  file_size: number;
};

export default function ReportDownloadList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { logFileDownload } = useEnhancedActivityTracker();
  
  // Fetch report files
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["/api/reports"],
    queryFn: async () => {
      const response = await fetch("/api/reports");
      if (!response.ok) {
        throw new Error("Failed to fetch report files");
      }
      return response.json() as Promise<ReportFile[]>;
    }
  });

  // Get friendly name for report type
  const getReportTypeName = (type: string) => {
    const reportTypeMap: Record<string, string> = {
      "esr_level": "ESR Level Datalink Report",
      "water_consumption": "Water Consumption Datalink Report",
      "lpcd_village": "LPCD Village Level Datalink Report",
      "chlorine": "Chlorine Datalink Report",
      "pressure": "Pressure Datalink Report",
      "village_level": "Village Level Datalink Report",
      "scheme_level": "Scheme Level Datalink Report"
    };
    
    return reportTypeMap[type] || type;
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter reports based on search term
  const filteredReports = reports?.filter(report => 
    report.original_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    getReportTypeName(report.report_type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group reports by type (to ensure we show only the latest version of each type)
  const reportsByType = filteredReports?.reduce((acc, report) => {
    if (!acc[report.report_type] || 
        new Date(report.upload_date) > new Date(acc[report.report_type].upload_date)) {
      acc[report.report_type] = report;
    }
    return acc;
  }, {} as Record<string, ReportFile>) || {};

  // Convert back to array and sort by upload date (newest first)
  const latestReports = Object.values(reportsByType).sort((a, b) => 
    new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
  );

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          <span>Available Reports</span>
          <Badge variant="outline" className="ml-2">
            {latestReports.length} Report{latestReports.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search reports..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          // Loading state
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="text-center p-4 text-red-500">
            <p>Failed to load reports. Please try again later.</p>
          </div>
        ) : latestReports.length === 0 ? (
          // Empty state
          <div className="text-center p-8 border rounded-md bg-gray-50">
            <FileDown className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No reports available</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? "No reports match your search criteria." 
                : "Reports will appear here once they are uploaded."}
            </p>
          </div>
        ) : (
          // Reports list
          <div className="space-y-3">
            {latestReports.map((report) => (
              <div 
                key={report.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 mb-2 sm:mb-0">
                  <div className="bg-blue-50 p-2 rounded">
                    <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{report.original_name}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(report.upload_date), "MMM d, yyyy")}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>{formatFileSize(report.file_size)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-blue-600">{getReportTypeName(report.report_type)}</span>
                    </div>
                  </div>
                </div>
                <a 
                  href={`/api/reports/${report.id}`}
                  download
                  className="inline-block"
                  onClick={() => {
                    logFileDownload(
                      report.original_name,
                      'xlsx',
                      {
                        report_type: report.report_type,
                        report_type_name: getReportTypeName(report.report_type),
                        file_size: report.file_size,
                        upload_date: report.upload_date,
                        report_id: report.id
                      }
                    );
                  }}
                >
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}