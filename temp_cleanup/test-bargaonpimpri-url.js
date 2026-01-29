/**
 * Test script to verify the special URL generation for Bargaonpimpri scheme
 */
import { storage } from './server/storage.js';

async function testBargaonpimpriUrl() {
  try {
    // Get the Bargaonpimpri scheme
    const scheme = await storage.getSchemeById('20019176');
    
    if (!scheme) {
      console.error('Scheme with ID 20019176 not found');
      return;
    }
    
    console.log('Original URL:', scheme.dashboard_url);
    
    // Clear the dashboard URL to force regeneration
    const updatedScheme = { ...scheme, dashboard_url: null };
    
    // Update the scheme - this will trigger URL regeneration
    const result = await storage.updateScheme(updatedScheme);
    
    console.log('New URL:', result.dashboard_url);
    
    // Check if the URL contains the non-breaking space
    if (result.dashboard_url.includes('%C2%A0')) {
      console.log('SUCCESS: URL contains non-breaking space character');
    } else {
      console.log('FAIL: URL does not contain non-breaking space character');
    }
  } catch (error) {
    console.error('Error testing Bargaonpimpri URL:', error);
  }
}

testBargaonpimpriUrl();
