# Mahajal IoT Data Integration – Comprehensive API Reference

This document provides a detailed reference for every API endpoint available for integration with the CM Dashboard.

## 1. Global Configuration

| Parameter | Value |
| :--- | :--- |
| **Base URL** | `https://mahajal-iot.mjp.maharashtra.gov.in` |
| **Auth Header** | `X-External-Proxy-Key` |
| **Auth Value** | `h` |
| **Content-Type**| `application/json` |

---

## 2. Water Scheme & LPCD Status APIs

### 2.1 Get All Water Schemes
Fetch detailed metrics for all commissioned schemes, including 7-day LPCD and supply arrays.
*   **Endpoint:** `GET /api/water-scheme-data`
*   **Parameters:** `region`, `minLpcd`, `agencyType`
*   **Example Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/water-scheme-data?region=Pune&agencyType=MJP`
*   **cURL:**
    ```bash
    curl -X GET "https://mahajal-iot.mjp.maharashtra.gov.in/api/water-scheme-data?region=Pune" \
         -H "X-External-Proxy-Key: h"
    ```

### 2.2 Village Counts & Summary
Provides top-level counts of safe vs. unsafe villages and commissioning status.
*   **Endpoint:** `GET /api/water-scheme-data/village-counts`
*   **Example Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/water-scheme-data/village-counts?region=Nagpur`
*   **cURL:**
    ```bash
    curl -X GET "https://mahajal-iot.mjp.maharashtra.gov.in/api/water-scheme-data/village-counts" \
         -H "X-External-Proxy-Key: h"
    ```

---

## 3. Live Sensor & IoT Monitoring

### 3.1 Live Residual Chlorine
Returns the latest chlorine measurements for all ESRs.
*   **Endpoint:** `GET /api/chlorine`
*   **Parameters:** `region`, `chlorineRange` (below_0.2, between_0.2_0.5, above_0.5)
*   **Example Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/chlorine?chlorineRange=below_0.2`
*   **cURL:**
    ```bash
    curl -X GET "https://mahajal-iot.mjp.maharashtra.gov.in/api/chlorine?region=Pune" \
         -H "X-External-Proxy-Key: h"
    ```

### 3.2 Regional Flowmeter Comparison
Checks hardware connectivity for flowmeters across all regions.
*   **Endpoint:** `GET /api/flowmeter/overall-region-comparison`
*   **Example Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/flowmeter/overall-region-comparison`
*   **cURL:**
    ```bash
    curl -X GET "https://mahajal-iot.mjp.maharashtra.gov.in/api/flowmeter/overall-region-comparison" \
         -H "X-External-Proxy-Key: h"
    ```

---

## 4. Historical & Analytical Data

### 4.1 Consolidated ESR History
Fetches a merged table of Water Consumption, Chlorine, and Pressure values for a date range.
*   **Endpoint:** `GET /api/combined-esr-download/historical`
*   **Parameters:** `startDate`, `endDate` (Required)
*   **Example Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/combined-esr-download/historical?startDate=2024-03-01&endDate=2024-03-07`
*   **cURL:**
    ```bash
    curl -X GET "https://mahajal-iot.mjp.maharashtra.gov.in/api/combined-esr-download/historical?startDate=2024-03-01&endDate=2024-03-07" \
         -H "X-External-Proxy-Key: h"
    ```

### 4.2 Bulk LPCD History
Aggregated LPCD metrics at the scheme and village level across any date range.
*   **Endpoint:** `GET /api/scheme-lpcd-data/history`
*   **Parameters:** `start_date`, `end_date`, `limit` (max 10,000,000)
*   **Example Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/scheme-lpcd-data/history?limit=100000`
*   **cURL:**
    ```bash
    curl -X GET "https://mahajal-iot.mjp.maharashtra.gov.in/api/scheme-lpcd-data/history?start_date=2024-01-01&limit=50000" \
         -H "X-External-Proxy-Key: h"
    ```

---

## 5. Smart Reporting (Search & Drill-down)

### 5.1 Search Scheme Index
Find the correct internal Scheme ID for any partial scheme name.
*   **Endpoint:** `GET /api/smart-reports/search`
*   **Parameters:** `query` (e.g., 'Bidgaon')
*   **Example Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/smart-reports/search?query=Bidgaon`

### 5.2 Deep-Dive Scheme Report
Returns every single metric (population, LPCD history, ESR vitals, Sensor state) for one specific scheme.
*   **Endpoint:** `GET /api/smart-reports/scheme/:schemeId`
*   **Example Link:** `https://mahajal-iot.mjp.maharashtra.gov.in/api/smart-reports/scheme/SCM-7940695`
*   **cURL:**
    ```bash
    curl -X GET "https://mahajal-iot.mjp.maharashtra.gov.in/api/smart-reports/scheme/7940695" \
         -H "X-External-Proxy-Key: h"
    ```

---

## 6. Dashboard Aggregation Endpoints

These endpoints provide summary numbers suitable for high-level cards on the CM Dashboard.

| Metric Type | URL |
| :--- | :--- |
| **Chlorine Summary** | `/api/chlorine/dashboard-stats` |
| **Pressure Summary** | `/api/pressure/dashboard-stats` |
| **Village Stats** | `/api/water-scheme-data/village-stats` |
| **Population Stats**| `/api/water-scheme-data/population-stats` |

### Sample Response Format (JSON)
All APIs follow this standard structure:
```json
{
  "success": true,
  "data": [
    {
      "region": "Pune",
      "scheme_id": "7940695",
      "lpcd_value": 65.4,
      "status": "Safe"
    }
  ]
}
```

---
**Maintained by:** Mahajal IoT Development Team
**Support:** support@mahajal-iot.gov.in
