import { useEffect, useCallback } from 'react';

interface ActivityData {
  activity_type: string;
  activity_description: string;
  file_name?: string;
  file_type?: string;
  page_url?: string;
  metadata?: any;
}

export function useActivityTracker() {
  // Function to log user activity
  const logActivity = useCallback(async (activityData: ActivityData) => {
    try {
      await fetch('/api/auth/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activityData,
          page_url: activityData.page_url || window.location.href
        })
      });
    } catch (error) {
      // Silent fail for activity logging
      console.debug('Activity logging failed:', error);
    }
  }, []);

  // Track file downloads
  const trackFileDownload = useCallback((fileName: string, fileType?: string, description?: string) => {
    logActivity({
      activity_type: 'file_download',
      activity_description: description || `Downloaded file: ${fileName}`,
      file_name: fileName,
      file_type: fileType
    });
  }, [logActivity]);

  // Track page visits
  const trackPageVisit = useCallback((pageName: string, pageUrl?: string) => {
    logActivity({
      activity_type: 'page_visit',
      activity_description: `Visited page: ${pageName}`,
      page_url: pageUrl
    });
  }, [logActivity]);

  // Track data exports
  const trackDataExport = useCallback((exportType: string, fileName?: string, recordCount?: number) => {
    logActivity({
      activity_type: 'data_export',
      activity_description: `Exported ${exportType}${recordCount ? ` (${recordCount} records)` : ''}`,
      file_name: fileName,
      file_type: 'excel',
      metadata: { export_type: exportType, record_count: recordCount }
    });
  }, [logActivity]);

  // Automatic session closure setup
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable logging on page unload
      navigator.sendBeacon('/api/auth/logout', new FormData());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logActivity({
          activity_type: 'page_visibility',
          activity_description: 'User navigated away from page or minimized window'
        });
      }
    };

    // Set up event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Log page visit on mount
    logActivity({
      activity_type: 'page_visit',
      activity_description: `Visited page: ${document.title || window.location.pathname}`
    });

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [logActivity]);

  return {
    logActivity,
    trackFileDownload,
    trackPageVisit,
    trackDataExport
  };
}

// Utility function to enhance download links with activity tracking
export function createTrackedDownloadLink(
  href: string, 
  fileName: string, 
  description?: string
): { href: string; onClick: () => void } {
  return {
    href,
    onClick: () => {
      // Extract file extension for file type
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      fetch('/api/auth/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'file_download',
          activity_description: description || `Downloaded file: ${fileName}`,
          file_name: fileName,
          file_type: fileExtension,
          page_url: window.location.href
        })
      }).catch(() => {}); // Silent fail
    }
  };
}