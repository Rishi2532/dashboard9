// Region summary data for dashboard
export interface RegionSummary {
  region_name?: string;
  total_schemes_integrated?: number;
  fully_completed_schemes?: number;
  partial_schemes?: number;
  total_esr_in_scheme?: number;
  total_esr_integrated?: number;
  fully_completed_esr?: number;
  partial_esr?: number; // Added to match schema and fix TypeScript error
  total_villages_in_scheme?: number;
  total_villages_integrated?: number;
  fully_completed_villages?: number;
  flow_meter_integrated?: number;
  rca_integrated?: number; // Added to match schema and fix TypeScript error
  pressure_transmitter_integrated?: number; // Added to match schema and fix TypeScript error
  updated_at?: string;
}

// Region data with metrics
export interface Region {
  region_name: string;
  region_id?: string | number;
  total_schemes_integrated: number;
  fully_completed_schemes: number;
  total_esr_integrated: number;
  fully_completed_esr: number;
  partial_esr?: number;
  total_villages_integrated: number;
  fully_completed_villages: number;
  flow_meter_integrated: number;
  rca_integrated?: number;
  pressure_transmitter_integrated?: number;
  updated_at?: string;
}

// Scheme status data
export interface SchemeStatus {
  scheme_id: string;
  scheme_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  agency: string; // Implementing agency for the scheme
  number_of_village: number;
  total_villages_integrated: number;
  fully_completed_villages: number;
  total_number_of_esr: number;
  total_esr_integrated: number;
  no_fully_completed_esr: number;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  scheme_functional_status?: string;
  fully_completion_scheme_status?: string;
  mjp_commissioned?: string; // Yes/No values
  mjp_fully_completed?: string; // Fully Completed/In Progress values
  water_supply?: string; // Yes/Blank values
  flow_meters_connected?: boolean;
  flow_meter_working?: boolean;
  flow_meter_data_on_cloud?: boolean;
  pressure_transmitter_connected?: boolean;
  residual_chlorine_analyzer_connected?: boolean;
  implementation_date?: string;
  last_updated?: string;
  updated_at?: string;
}
