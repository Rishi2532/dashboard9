# Core Data API Integration Guide

This document describes the primary data endpoints for Mahajal IoT.

## 1. Authentication & Headers
All requests must include the following headers:
- **X-External-Proxy-Key:** `MAHAJAL_IOT_SECURE_KEY_25`
- **Content-Type:** `application/json`

---

## 2. Master Region Table
Fetch all columns and metrics directly from the primary `regions` master table.
- **Endpoint:** `GET https://dashboard1.mahajaliot.in/api/regions`
- **Output Format:**
```json
[
  {
    "id": 1,
    "region_name": "Pune",
    "total_esr_integrated": 156,
    "flow_meter_integrated": 142,
    "rca_integrated": 128,
    "pressure_transmitter_integrated": 145,
    "total_villages": 42
  }
]
```

---

## 3. Water Scheme Data
Detailed village-level population and 7-day LPCD metrics.
- **Endpoint:** `GET https://dashboard1.mahajaliot.in/api/water-scheme-data`
- **Example:** `GET /api/water-scheme-data?region=Pune`
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
      "status": "Safe"
    }
  ]
}
```

---

## 4. Water Consumption Data
Individual ESR water logs for the last 7 days.
- **Endpoint:** `GET https://dashboard1.mahajaliot.in/api/water-consumption`
- **Example:** `GET /api/water-consumption?region=Nashik`
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

---

## 5. Chlorine Data
Residual chlorine measurements (mg/l) for all ESRs.
- **Endpoint:** `GET https://dashboard1.mahajaliot.in/api/chlorine`
- **Example:** `GET /api/chlorine?region=Pune`
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

---

## 6. Pressure Data
Pressure readings (bar) for all ESR points.
- **Endpoint:** `GET https://dashboard1.mahajaliot.in/api/pressure`
- **Example:** `GET /api/pressure?region=Nagpur`
- **Output Format:**
```json
{
  "success": true,
  "data": [
    {
      "esr_name": "Delivery ESR",
      "pressure_value_7": 0.45
    }
  ]
}
```

---

## 7. History Data Tables
Primary endpoints for bulk ingestion of historical logs across all sensor types. 
*Note: Use `?limit=10000000` for bulk fetches.*

### 7.1 Water Scheme & Village LPCD History (`water_scheme_data_history`)
Historical LPCD and water supply records at the village level.
- **Endpoint:** `GET /api/category-data/history/water`
- **Example:** `GET /api/category-data/history/water?startDate=2024-04-01&endDate=2024-04-30`

### 7.2 Bulk Scheme LPCD History (`scheme_lpcd_data_history`)
Aggregated historical LPCD metrics per water scheme.
- **Endpoint:** `GET /api/scheme-lpcd-data/history`
- **Example:** `GET /api/scheme-lpcd-data/history?limit=5000`

### 7.3 Chlorine History (`chlorine_history`)
Historical residual chlorine levels recorded per ESR.
- **Endpoint:** `GET /api/chlorine/historical`
- **Example:** `GET /api/chlorine/historical?startDate=2024-01-01&endDate=2024-03-31`

### 7.4 Pressure History (`pressure_history`)
Historical pressure readings recorded across the network.
- **Endpoint:** `GET /api/pressure/historical`
- **Example:** `GET /api/pressure/historical?startDate=2024-01-01`

### 7.5 Water Consumption History (`water_consumption_history`)
Historical bulk water consumption (MLD/LL) recorded at ESR inlet/outlets.
- **Endpoint:** `GET /api/water-consumption/historical`
- **Example:** `GET /api/water-consumption/historical?region=Pune&startDate=2024-03-01`

### 7.6 Consolidated Sensor History (Multi-Table Merge)
Merges Water, Chlorine, and Pressure into a single historical time-series.
- **Endpoint:** `GET /api/combined-esr-download/historical`
- **Parameters:** `startDate`, `endDate`, `region` (optional)

---
**Maintained by:** Mahajal IoT Dev Team
