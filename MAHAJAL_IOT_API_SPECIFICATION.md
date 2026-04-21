# Mahajal IoT Data Integration – Core Technical Specification

This reference details the core data endpoints for integration with the CM Dashboard.

## 1. Authentication & Base URL

- **Base URL:** `https://mahajal-iot.mjp.maharashtra.gov.in`
- **Auth Header:** `X-External-Proxy-Key`
- **Auth Value:** `h`

---

## 2. Regions List Table
Fetch the master list of regions available in the system.
- **Endpoint:** `GET /api/water-scheme-data/village-counts`
- **Purpose:** Identifies all active regions (Pune, Nagpur, Nashik, etc.) for filtering in other APIs.
- **Example:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/water-scheme-data/village-counts`
- **Output Format:**
```json
{
  "success": true,
  "data": [
    { "region": "Pune", "total_schemes": 42, "total_villages": 150 },
    { "region": "Nashik", "total_schemes": 38, "total_villages": 112 }
  ]
}
```

---

## 3. Water Scheme Metrics
Primary endpoint for village-level population and LPCD status.
- **Endpoint:** `GET /api/water-scheme-data`
- **Params:** `region`
- **Example Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/water-scheme-data?region=Pune`
- **Output Format:**
```json
{
  "success": true,
  "data": [
    {
      "scheme_id": "7940695",
      "village_name": "Village A",
      "population": 1250,
      "lpcd_value_day7": 58.4,
      "water_value_day7": 0.73,
      "status": "Safe"
    }
  ]
}
```

---

## 4. Live Sensor APIs (Current 7-Day Context)

### 4.1 Residual Chlorine
- **Endpoint:** `GET /api/chlorine`
- **Output Format:**
```json
{
  "success": true,
  "data": [
    {
      "esr_name": "ESR-1",
      "chlorine_value_7": 0.35,
      "chlorine_date_day_7": "2024-04-20"
    }
  ]
}
```

### 4.2 Water Consumption (ESR Level)
- **Endpoint:** `GET /api/water-consumption`
- **Output Format:**
```json
{
  "success": true,
  "data": [
    {
      "esr_name": "Main ESR",
      "water_value_day7": 125000,
      "flow_rate_m3": 45.2
    }
  ]
}
```

### 4.3 Pressure Measurements
- **Endpoint:** `GET /api/pressure`
- **Output Format:**
```json
{
  "success": true,
  "data": [
    { "esr_name": "ESR-1", "pressure_value_7": 0.45 }
  ]
}
```

---

## 5. Global History Tables (Bulk Download)

These endpoints provide deep historical logs. For large datasets, use `?limit=10000000`.

### 5.1 Water Consumption History
- **Endpoint:** `GET /api/water-consumption/historical`
- **Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/water-consumption/historical?startDate=2024-03-01&endDate=2024-03-31`
- **Output:** Array of ESR-specific daily water logs.

### 5.2 Chlorine & Pressure History
- **Chlorine:** `GET /api/chlorine/historical?startDate=2024-03-01`
- **Pressure:** `GET /api/pressure/historical?startDate=2024-03-01`
- **Output:** Array of sensor-specific daily quality logs.

### 5.3 Consolidated Historical Table (Combined)
Recommended for bulk ingestion. Merges Water, Chlorine, and Pressure into one response.
- **Endpoint:** `GET /api/combined-esr-download/historical`
- **Example:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/combined-esr-download/historical?startDate=2024-04-01&endDate=2024-04-07`

---
**Maintained by:** Mahajal IoT Dev Team
**Last Updated:** April 2026
