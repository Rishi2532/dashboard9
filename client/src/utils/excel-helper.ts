/**
 * Excel Export Helper Functions
 * 
 * This module provides utility functions to work with Excel exports throughout the application
 */

/**
 * Triggers the Excel export functionality from the dashboard
 * Used by the chatbot to respond to voice commands for downloading Excel files
 * 
 * @returns Promise that resolves when export is triggered (or rejects if not available)
 */
export const triggerExcelExport = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Attempting to trigger Excel export...');
      
      // First, try to find any export button on the page
      const exportButtonSelectors = [
        'button[aria-label="Export to Excel"]', 
        'button:has(.lucide-download)', 
        'button.border-blue-300',
        'button:contains("Export")',
        'button:has(svg.lucide-download)',
        'button.hover\\:bg-blue-50'
      ];
      
      // Try each selector until we find a button
      for (const selector of exportButtonSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          console.log(`Found export button with selector: ${selector}`);
          (button as HTMLButtonElement).click();
          console.log('Clicked export button');
          resolve();
          return;
        }
      }
      
      // If no button found, try the global function
      if (typeof window.triggerDashboardExport === 'function') {
        console.log('Using global triggerDashboardExport function');
        window.triggerDashboardExport()
          .then(() => {
            console.log('Excel export triggered successfully via global function');
            resolve();
          })
          .catch((error) => {
            console.error('Error triggering Excel export via global function:', error);
            
            // Even if the global function fails, let's try one more approach
            const downloadButtons = Array.from(document.querySelectorAll('button'))
              .filter(btn => {
                const text = btn.textContent?.toLowerCase() || '';
                return text.includes('export') || text.includes('download');
              });
              
            if (downloadButtons.length > 0) {
              console.log('Found fallback download button by text content');
              (downloadButtons[0] as HTMLButtonElement).click();
              resolve();
              return;
            }
            
            reject(error);
          });
      } else {
        console.warn('Excel export function not available - dashboard may not be loaded');
        reject(new Error('Excel export function not available'));
      }
    } catch (error) {
      console.error('Error in triggerExcelExport:', error);
      reject(error);
    }
  });
};