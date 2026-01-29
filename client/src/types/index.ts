// Region types
export interface Region {
  region_id: number;
  region_name: string;
  agency: string;
  total_esr_integrated: number;
  fully_completed_esr: number;
  partial_esr: number;
  total_villages_integrated: number;
  fully_completed_villages: number;
  partially_integrated_villages: number;
  total_schemes_integrated: number;
  fully_completed_schemes: number;
  partially_completed_schemes: number;
  flow_meter_integrated: number;
  updated_at: string;
}

// Summary types
export interface RegionSummary {
  total_regions: number;
  total_esr_integrated: number;
  fully_completed_esr: number;
  partial_esr: number;  // Changed from partial_esr to match the SQL column name
  total_villages_integrated: number;
  fully_completed_villages: number;
  partially_integrated_villages: number;
  total_schemes_integrated: number;
  fully_completed_schemes: number;
  partially_completed_schemes: number;
  flow_meter_integrated: number;
  rca_integrated: number; // Added this field to match what's being used in stats-cards.tsx
  pressure_transmitter_integrated: number; // Added this field to match what's being used in stats-cards.tsx
  last_updated_at: string;
}

// Scheme types
export interface Scheme {
  scheme_id: string;
  scheme_name: string;
  region: string;
  district: string;
  taluka: string;
  village: string;
  constituency: string;
  agency: string;
  scheme_type: string;
  technology: string;
  stage: string;
  contract_cap_mld: number;
  population_covered: number;
  households_covered: number;
  agency_involved: string;
  esr_status: string;
  scheme_status: string;
  village_status: string;
  has_flow_meter: boolean;
  latitude: number | null;
  longitude: number | null;
  updated_at: string;
}

// Scheme status types
export interface SchemeStatus {
  id: number;
  scheme_id: string;
  region: string;
  district: string;
  completed_civil_works: number;
  pending_civil_works: number;
  households_connected: number;
  households_pending: number;
  esr_constructed: boolean;
  esr_functional: boolean;
  pump_house_completed: boolean;
  pipe_laying_completed: boolean;
  standpost_completed: boolean;
  electrical_work_completed: boolean;
  issues_reported: string | null;
  issue_resolution_status: string | null;
  updated_at: string;
}

// Map location type is now imported directly from EnhancedGeoFilterMap.tsx