import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { File, FileDown, Loader2, FileText, Download, Database, Droplets, BarChart3, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import { useComprehensiveActivityTracker } from '@/hooks/use-comprehensive-activity-tracker';
import { useToast } from '@/hooks/use-toast';

// Admin-only button that only shows for admin users
function AdminOnlyButton() {
  // Get authentication status 
  const { data } = useQuery<{ isAdmin?: boolean; isLoggedIn?: boolean }>({
    queryKey: ['/api/auth/status'],
    retry: 1
  });

  // Only render the button if user is an admin
  if (!data?.isAdmin) return null;

  return (
    <Link href="/admin/manage-reports">
      <Button variant="outline" className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Manage Reports
      </Button>
    </Link>
  );
};

// Report file types with friendly names and descriptions
const REPORT_TYPES = [
  {
    id: 'esr_level',
    name: 'ESR Level Datalink Report',
    description: 'Comprehensive data about ESR (Elevated Storage Reservoir) infrastructure and operations'
  },
  {
    id: 'water_consumption',
    name: 'Water Consumption Datalink Report',
    description: 'Detailed water consumption metrics across regions and schemes'
  },
  {
    id: 'lpcd_village',
    name: 'LPCD Village Level Datalink Report',
    description: 'Liters Per Capita Daily (LPCD) statistics at the village level'
  },
  {
    id: 'chlorine',
    name: 'Chlorine Datalink Report',
    description: 'Chlorine analyzer data from water treatment facilities'
  },
  {
    id: 'pressure',
    name: 'Pressure Datalink Report',
    description: 'Water pressure measurements across distribution networks'
  },
  {
    id: 'village_level',
    name: 'Village Level Datalink Report',
    description: 'Comprehensive water infrastructure metrics for villages'
  },
  {
    id: 'scheme_level',
    name: 'Scheme Level Datalink Report',
    description: 'Detailed statistics and metrics for water schemes'
  },
  // Monthly Reports
  {
    id: 'water_consumption_esr_monthly',
    name: 'Water Consumption - ESR Level - Monthly',
    description: 'Monthly aggregation of water consumption data at the ESR level'
  },
  {
    id: 'water_consumption_village_monthly',
    name: 'Water Consumption - Village Level - Monthly',
    description: 'Monthly aggregation of water consumption data at the Village level'
  },
  {
    id: 'water_consumption_scheme_monthly',
    name: 'Water Consumption - Scheme Level - Monthly',
    description: 'Monthly aggregation of water consumption data at the Scheme level'
  },
  {
    id: 'lpcd_village_monthly',
    name: 'LPCD - Village Level - Monthly',
    description: 'Monthly Liters Per Capita Daily (LPCD) statistics at the Village level'
  },
  {
    id: 'lpcd_scheme_monthly',
    name: 'LPCD - Scheme Level - Monthly',
    description: 'Monthly Liters Per Capita Daily (LPCD) statistics at the Scheme level'
  }
];

// Reports page for users to download Excel reports
function ReportsPage() {
  const { trackFileDownload, trackPageVisit } = useComprehensiveActivityTracker();
  const { toast } = useToast();

  // Track page visit on component mount
  React.useEffect(() => {
    trackPageVisit("Reports Page");
  }, [trackPageVisit]);

  // Handle overall report downloads - check for uploaded file first, then fallback to database generation
  const handleOverallReportDownload = async (reportType: string, reportName: string) => {
    try {
      // First, check if there's an uploaded file for this overall report type
      const overallReportId = `overall_${reportType.replace('-', '_')}`;
      const uploadedFileResponse = await fetch(`/api/reports/type/${overallReportId}`);

      if (uploadedFileResponse.ok) {
        // There's an uploaded file, download it instead
        const fileData = await uploadedFileResponse.json();
        const downloadResponse = await fetch(`/api/reports/${fileData.id}`);

        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = fileData.original_name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          // Track the download
          trackFileDownload(
            fileData.original_name,
            'xlsx',
            'overall_reports_section',
            {
              reportType: overallReportId,
              reportName: reportName,
              source: 'uploaded_file'
            }
          );

          toast({
            title: "Download Started",
            description: `${reportName} report (uploaded file) is being downloaded`,
          });
          return;
        }
      }

      // No uploaded file, fallback to database generation
      const response = await fetch(`/api/reports/download/overall-${reportType}`);

      if (!response.ok) {
        throw new Error(`Failed to download ${reportName}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Overall_${reportName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Track the download
      trackFileDownload(
        `Overall_${reportName}_Report`,
        'xlsx',
        'overall_reports_section',
        {
          reportType: reportType,
          reportName: reportName,
          source: 'database_generated'
        }
      );

      toast({
        title: "Download Started",
        description: `${reportName} report (from database) is being downloaded`,
      });
    } catch (error) {
      console.error('Error downloading overall report:', error);
      toast({
        title: "Download Failed",
        description: `Failed to download ${reportName} report. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Fetch all available report files
  const { data: reportFiles, isLoading, error } = useQuery({
    queryKey: ['/api/reports'],
    retry: 1,
  });

  // Get the most recent active report for each type
  const getLatestReportByType = (type: string) => {
    if (!reportFiles || !Array.isArray(reportFiles)) return null;

    const typeReports = reportFiles
      .filter((file: any) => file.report_type === type)
      .sort((a: any, b: any) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());

    return typeReports.length > 0 ? typeReports[0] : null;
  };

  // Check if overall report has uploaded file
  const hasOverallReportFile = (reportType: string) => {
    const overallReportId = `overall_${reportType.replace('-', '_')}`;
    return getLatestReportByType(overallReportId) !== null;
  };

  // Handle download with enhanced activity tracking
  const handleDownload = (report: any, typeName: string) => {
    trackFileDownload(
      report.original_name,
      'excel',
      'reports_page',
      {
        reportType: report.report_type,
        reportId: report.id,
        uploadDate: report.upload_date,
        fileSize: report.file_size,
        reportCategory: typeName
      }
    );
  };

  // Track page visit on component mount
  React.useEffect(() => {
    trackPageVisit("Reports Page");
  }, [trackPageVisit]);

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports</h1>
          <p className="text-gray-600">
            Download the latest Excel report files with all formatting preserved
          </p>
        </div>
        {/* Admin-only link to manage reports - Only show for admins */}
        <AdminOnlyButton />
      </div>

      {/* Overall Report Downloads Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Download className="h-6 w-6" />
          Overall Data Reports
        </h2>
        <p className="text-gray-600 mb-6">
          Download complete datasets directly from the database in Excel format
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Droplets className="h-5 w-5 text-blue-600" />
                Chlorine Data
              </CardTitle>
              <CardDescription className="text-sm">
                {hasOverallReportFile('chlorine')
                  ? 'Uploaded file available - will download your uploaded Excel file'
                  : 'Generated from database - complete chlorine analyzer readings and quality metrics'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleOverallReportDownload('chlorine', 'Chlorine Data')}
                className="w-full"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {hasOverallReportFile('chlorine') ? 'Download Uploaded File' : 'Generate from Database'}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Pressure Data
              </CardTitle>
              <CardDescription className="text-sm">
                {hasOverallReportFile('pressure')
                  ? 'Uploaded file available - will download your uploaded Excel file'
                  : 'Generated from database - water pressure measurements and distribution network data'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleOverallReportDownload('pressure', 'Pressure Data')}
                className="w-full"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {hasOverallReportFile('pressure') ? 'Download Uploaded File' : 'Generate from Database'}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-purple-600" />
                Water Consumption
              </CardTitle>
              <CardDescription className="text-sm">
                {hasOverallReportFile('water-consumption')
                  ? 'Uploaded file available - will download your uploaded Excel file'
                  : 'Generated from database - complete water consumption data across all regions'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleOverallReportDownload('water-consumption', 'Water Consumption')}
                className="w-full"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {hasOverallReportFile('water-consumption') ? 'Download Uploaded File' : 'Generate from Database'}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-orange-600" />
                LPCD Data
              </CardTitle>
              <CardDescription className="text-sm">
                {hasOverallReportFile('lpcd')
                  ? 'Uploaded file available - will download your uploaded Excel file'
                  : 'Generated from database - liters Per Capita Daily statistics and analysis'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleOverallReportDownload('lpcd', 'LPCD')}
                className="w-full"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {hasOverallReportFile('lpcd') ? 'Download Uploaded File' : 'Generate from Database'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Uploaded Reports Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Uploaded Reports
        </h2>
        <p className="text-gray-600 mb-6">
          Download the latest uploaded Excel report files with all formatting preserved
        </p>
      </div>

      <div className="py-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading reports...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-lg">
              There was an error loading the reports. Please try again later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REPORT_TYPES.map((type) => {
              const report = getLatestReportByType(type.id);
              return (
                <Card key={type.id} className="overflow-hidden">
                  <CardHeader className="bg-secondary/10">
                    <CardTitle className="flex items-center gap-2">
                      <File className="h-5 w-5" />
                      {type.name}
                    </CardTitle>
                    <CardDescription>{type.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {report ? (
                      <div>
                        <div className="mb-4">
                          <p className="text-sm font-medium">Filename:</p>
                          <p className="text-sm text-gray-500 truncate">{report.original_name}</p>
                        </div>
                        <div className="mb-4">
                          <p className="text-sm font-medium">Last Updated:</p>
                          <p className="text-sm text-gray-500">
                            {new Date(report.upload_date).toLocaleDateString()}
                          </p>
                        </div>
                        <a
                          href={`/api/reports/${report.id}`}
                          download
                          className="w-full"
                          onClick={() => handleDownload(report, type.name)}
                        >
                          <Button className="w-full">
                            <FileDown className="h-4 w-4 mr-2" />
                            Download Report
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No report available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ReportsPage;