import { useCallback } from 'react';

interface FilterDetails {
  region?: string;
  scheme?: string;
  status?: string;
  cardFilter?: string;
  searchTerm?: string;
  dateRange?: string;
  [key: string]: any;
}

interface ExportMetadata {
  exportType: string;
  fileName: string;
  fileType: string;
  recordCount: number;
  filtersApplied: FilterDetails;
  timestamp: string;
  pageUrl: string;
}

export function useComprehensiveActivityTracker() {
  const logActivity = useCallback(async (params: any) => {
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
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString(),
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

  // Enhanced page visit tracking
  const trackPageVisit = useCallback((pageName: string, additionalData?: any) => {
    const pageMap: { [key: string]: string } = {
      '/': 'Dashboard Home',
      '/schemes': 'Schemes Overview',
      '/chlorine': 'Chlorine Dashboard',
      '/pressure': 'Pressure Dashboard',
      '/lpcd': 'LPCD Dashboard',
      '/reports': 'Reports Page',
      '/admin': 'Admin Panel',
      '/admin/login-logs': 'User Activity Logs',
      '/admin/reports': 'Report Management',
      '/admin/regions': 'Region Management',
      '/admin/schemes': 'Scheme Management',
    };

    const currentPath = window.location.pathname;
    const resolvedPageName = pageMap[currentPath] || pageName || currentPath;

    logActivity({
      activity_type: 'page_visit',
      activity_description: `Visited ${resolvedPageName}`,
      page_url: window.location.href,
      metadata: {
        page_name: resolvedPageName,
        page_path: currentPath,
        previous_page: document.referrer,
        visit_timestamp: new Date().toISOString(),
        ...additionalData
      }
    });
  }, [logActivity]);

  // Enhanced data export tracking with detailed filter information
  const trackDataExport = useCallback((
    exportType: string,
    fileName: string,
    recordCount: number,
    appliedFilters: FilterDetails = {},
    additionalData?: any
  ) => {
    const filterDescription = Object.entries(appliedFilters)
      .filter(([_, value]) => value && value !== '' && value !== 'all')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    const description = `Exported ${recordCount} ${exportType} records to ${fileName}${
      filterDescription ? ` with filters: ${filterDescription}` : ''
    }`;

    logActivity({
      activity_type: 'data_export',
      activity_description: description,
      file_name: fileName,
      file_type: fileName.split('.').pop()?.toLowerCase() || 'excel',
      metadata: {
        export_type: exportType,
        record_count: recordCount,
        filters_applied: appliedFilters,
        filter_summary: filterDescription,
        export_timestamp: new Date().toISOString(),
        page_context: window.location.pathname,
        ...additionalData
      }
    });
  }, [logActivity]);

  // File download tracking with enhanced metadata
  const trackFileDownload = useCallback((
    fileName: string,
    fileType: string,
    source: string = 'direct_download',
    additionalData?: any
  ) => {
    logActivity({
      activity_type: 'file_download',
      activity_description: `Downloaded ${fileType} file: ${fileName}`,
      file_name: fileName,
      file_type: fileType,
      metadata: {
        download_source: source,
        download_timestamp: new Date().toISOString(),
        page_context: window.location.pathname,
        file_size: additionalData?.fileSize,
        ...additionalData
      }
    });
  }, [logActivity]);

  // Filter application tracking
  const trackFilterUsage = useCallback((
    filterType: string,
    filterValue: string,
    resultCount?: number,
    context?: string
  ) => {
    logActivity({
      activity_type: 'filter_applied',
      activity_description: `Applied ${filterType} filter: ${filterValue}${
        resultCount !== undefined ? ` (${resultCount} results)` : ''
      }`,
      metadata: {
        filter_type: filterType,
        filter_value: filterValue,
        result_count: resultCount,
        context: context || window.location.pathname,
        filter_timestamp: new Date().toISOString()
      }
    });
  }, [logActivity]);

  // Dashboard access tracking
  const trackDashboardAccess = useCallback((dashboardUrl: string, dashboardType: string) => {
    logActivity({
      activity_type: 'dashboard_access',
      activity_description: `Accessed external ${dashboardType} dashboard`,
      page_url: dashboardUrl,
      metadata: {
        dashboard_type: dashboardType,
        dashboard_url: dashboardUrl,
        access_timestamp: new Date().toISOString(),
        referring_page: window.location.href
      }
    });
  }, [logActivity]);

  // Search tracking
  const trackSearch = useCallback((searchTerm: string, resultCount?: number, searchType?: string) => {
    logActivity({
      activity_type: 'search_performed',
      activity_description: `Searched for: ${searchTerm}${
        resultCount !== undefined ? ` (${resultCount} results)` : ''
      }`,
      metadata: {
        search_term: searchTerm,
        search_type: searchType || 'general',
        result_count: resultCount,
        search_timestamp: new Date().toISOString(),
        page_context: window.location.pathname
      }
    });
  }, [logActivity]);

  // Report generation tracking
  const trackReportGeneration = useCallback((
    reportType: string,
    fileName: string,
    parameters?: any
  ) => {
    logActivity({
      activity_type: 'report_generation',
      activity_description: `Generated ${reportType} report: ${fileName}`,
      file_name: fileName,
      file_type: 'report',
      metadata: {
        report_type: reportType,
        report_parameters: parameters,
        generation_timestamp: new Date().toISOString(),
        page_context: window.location.pathname
      }
    });
  }, [logActivity]);

  return {
    logActivity,
    trackPageVisit,
    trackDataExport,
    trackFileDownload,
    trackFilterUsage,
    trackDashboardAccess,
    trackSearch,
    trackReportGeneration
  };
}

// Enhanced utility function for download links with comprehensive tracking
export function createEnhancedDownloadLink(
  href: string,
  fileName: string,
  description?: string,
  additionalData?: any
): { href: string; onClick: () => void } {
  return {
    href,
    onClick: () => {
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'unknown';
      
      fetch('/api/auth/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'file_download',
          activity_description: description || `Downloaded file: ${fileName}`,
          file_name: fileName,
          file_type: fileExtension,
          page_url: window.location.href,
          metadata: {
            download_source: 'link_click',
            download_timestamp: new Date().toISOString(),
            page_context: window.location.pathname,
            ...additionalData
          }
        })
      }).catch(() => {}); // Silent fail
    }
  };
}