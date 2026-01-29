// Global TypeScript declarations for the application

// Extend Window interface to include our custom properties
interface Window {
  // Function to trigger dashboard excel export
  triggerDashboardExport?: () => Promise<void>;
}