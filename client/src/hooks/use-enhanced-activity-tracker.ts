import { useCallback } from 'react';

interface ActivityMetadata {
  filter_applied?: string;
  export_format?: string;
  data_count?: number;
  scheme_filter?: string;
  region_filter?: string;
  [key: string]: any;
}

interface LogActivityParams {
  activity_type: string;
  activity_description: string;
  file_name?: string;
  file_type?: string;
  page_url?: string;
  metadata?: ActivityMetadata;
  filter_applied?: string;
  export_format?: string;
  data_count?: number;
  scheme_filter?: string;
  region_filter?: string;
}

export function useEnhancedActivityTracker() {
  const logActivity = useCallback(async (params: LogActivityParams) => {
    try {
      const response = await fetch('/api/auth/log-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          page_url: params.page_url || window.location.href,
          metadata: {
            ...params.metadata,
            url_pathname: window.location.pathname,
            url_search: window.location.search,
          }
        }),
      });

      if (!response.ok) {
        console.warn('Failed to log activity:', response.statusText);
      }
    } catch (error) {
      console.warn('Error logging activity:', error);
    }
  }, []);

  // Specific activity loggers
  const logPageVisit = useCallback((pageName: string, pageUrl?: string) => {
    logActivity({
      activity_type: 'page_visit',
      activity_description: `Visited ${pageName} page`,
      page_url: pageUrl || window.location.href,
      metadata: {
        page_name: pageName,
        previous_page: document.referrer
      }
    });
  }, [logActivity]);

  const logFileDownload = useCallback((fileName: string, fileType: string, metadata?: ActivityMetadata) => {
    logActivity({
      activity_type: 'file_download',
      activity_description: `Downloaded ${fileType} file: ${fileName}`,
      file_name: fileName,
      file_type: fileType,
      metadata: {
        ...metadata,
        download_timestamp: new Date().toISOString()
      }
    });
  }, [logActivity]);

  const logDataExport = useCallback((exportType: string, format: string, count: number, filters?: any) => {
    logActivity({
      activity_type: 'data_export',
      activity_description: `Exported ${count} ${exportType} records in ${format} format`,
      file_type: format,
      export_format: format,
      data_count: count,
      metadata: {
        export_type: exportType,
        filters_applied: filters,
        record_count: count
      }
    });
  }, [logActivity]);

  const logFilterUsage = useCallback((filterType: string, filterValue: string, resultCount?: number) => {
    logActivity({
      activity_type: 'filter_applied',
      activity_description: `Applied ${filterType} filter: ${filterValue}`,
      filter_applied: `${filterType}: ${filterValue}`,
      data_count: resultCount,
      metadata: {
        filter_type: filterType,
        filter_value: filterValue,
        result_count: resultCount
      }
    });
  }, [logActivity]);

  const logSchemeFilter = useCallback((schemeId: string, schemeName: string, resultCount?: number) => {
    logActivity({
      activity_type: 'scheme_filter',
      activity_description: `Filtered by scheme: ${schemeName} (${schemeId})`,
      scheme_filter: `${schemeName} (${schemeId})`,
      data_count: resultCount,
      metadata: {
        scheme_id: schemeId,
        scheme_name: schemeName,
        result_count: resultCount
      }
    });
  }, [logActivity]);

  const logRegionFilter = useCallback((regionName: string, resultCount?: number) => {
    logActivity({
      activity_type: 'region_filter',
      activity_description: `Filtered by region: ${regionName}`,
      region_filter: regionName,
      data_count: resultCount,
      metadata: {
        region_name: regionName,
        result_count: resultCount
      }
    });
  }, [logActivity]);

  const logDashboardAccess = useCallback((dashboardType: string, dashboardUrl: string) => {
    logActivity({
      activity_type: 'dashboard_access',
      activity_description: `Accessed ${dashboardType} dashboard`,
      page_url: dashboardUrl,
      metadata: {
        dashboard_type: dashboardType,
        dashboard_url: dashboardUrl
      }
    });
  }, [logActivity]);

  const logReportGeneration = useCallback((reportType: string, fileName: string, parameters?: any) => {
    logActivity({
      activity_type: 'report_generation',
      activity_description: `Generated ${reportType} report: ${fileName}`,
      file_name: fileName,
      file_type: 'report',
      metadata: {
        report_type: reportType,
        report_parameters: parameters,
        generation_timestamp: new Date().toISOString()
      }
    });
  }, [logActivity]);

  return {
    logActivity,
    logPageVisit,
    logFileDownload,
    logDataExport,
    logFilterUsage,
    logSchemeFilter,
    logRegionFilter,
    logDashboardAccess,
    logReportGeneration
  };
}