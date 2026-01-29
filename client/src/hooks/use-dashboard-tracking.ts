import { useCallback } from 'react';
import { useComprehensiveActivityTracker } from './use-comprehensive-activity-tracker';

/**
 * Hook for tracking external dashboard URL visits and interactions
 */
export function useDashboardTracking() {
  const { trackDashboardAccess, logActivity } = useComprehensiveActivityTracker();

  const trackExternalDashboardClick = useCallback((
    dashboardUrl: string, 
    dashboardType: string,
    schemeId?: string,
    schemeName?: string,
    villageName?: string,
    esrName?: string,
    context?: string
  ) => {
    const activityDescription = `Accessed external ${dashboardType} dashboard${
      schemeName ? ` for ${schemeName}` : ''
    }${villageName ? ` - ${villageName}` : ''}${esrName ? ` (${esrName})` : ''}`;

    logActivity({
      activity_type: 'external_dashboard_access',
      activity_description: activityDescription,
      page_url: dashboardUrl,
      metadata: {
        dashboard_type: dashboardType,
        dashboard_url: dashboardUrl,
        scheme_id: schemeId,
        scheme_name: schemeName,
        village_name: villageName,
        esr_name: esrName,
        context: context || 'dashboard_table',
        access_timestamp: new Date().toISOString(),
        referring_page: window.location.href,
        user_agent: navigator.userAgent
      }
    });
  }, [logActivity]);

  const trackSchemeDataLinkClick = useCallback((
    url: string,
    schemeId: string,
    schemeName?: string
  ) => {
    trackExternalDashboardClick(
      url,
      'Scheme Data Link',
      schemeId,
      schemeName,
      undefined,
      undefined,
      'scheme_dashboard'
    );
  }, [trackExternalDashboardClick]);

  const trackVillageDataLinkClick = useCallback((
    url: string,
    schemeId: string,
    villageName: string,
    schemeName?: string
  ) => {
    trackExternalDashboardClick(
      url,
      'Village Data Link',
      schemeId,
      schemeName,
      villageName,
      undefined,
      'village_dashboard'
    );
  }, [trackExternalDashboardClick]);

  const trackEsrDataLinkClick = useCallback((
    url: string,
    schemeId: string,
    esrName: string,
    villageName?: string,
    schemeName?: string
  ) => {
    trackExternalDashboardClick(
      url,
      'ESR Data Link',
      schemeId,
      schemeName,
      villageName,
      esrName,
      'esr_dashboard'
    );
  }, [trackExternalDashboardClick]);

  const trackChlorineDashboardClick = useCallback((
    url: string,
    schemeId: string,
    esrName: string,
    villageName?: string,
    schemeName?: string
  ) => {
    trackExternalDashboardClick(
      url,
      'Chlorine Analysis Dashboard',
      schemeId,
      schemeName,
      villageName,
      esrName,
      'chlorine_dashboard'
    );
  }, [trackExternalDashboardClick]);

  const trackPressureDashboardClick = useCallback((
    url: string,
    schemeId: string,
    esrName: string,
    villageName?: string,
    schemeName?: string
  ) => {
    trackExternalDashboardClick(
      url,
      'Pressure Monitoring Dashboard',
      schemeId,
      schemeName,
      villageName,
      esrName,
      'pressure_dashboard'
    );
  }, [trackExternalDashboardClick]);

  return {
    trackExternalDashboardClick,
    trackSchemeDataLinkClick,
    trackVillageDataLinkClick,
    trackEsrDataLinkClick,
    trackChlorineDashboardClick,
    trackPressureDashboardClick
  };
}