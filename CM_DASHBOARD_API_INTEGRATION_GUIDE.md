# CM Dashboard Data Integration – API Documentation

This document specifies the REST API endpoints provided by the Mahajal IoT platform for integration with the CM Dashboard.

## 1. Authentication

All API requests must be authenticated using a static API key passed in the HTTP headers. For this integration, please use the following configuration:

- **Header Name:** `X-External-Proxy-Key` (or `X-API-Key`)
- **API Key Value:** `h`

> [!IMPORTANT]
> Failure to provide the correct header and key will result in a `401 Unauthorized` response.

---

## 2. Base URL
All API requests are relative to the following base URL:
`https://mahajal-iot.mjp.maharashtra.gov.in` (Replace with the actual production domain)

---

## 3. Water Scheme & LPCD Data APIs

These endpoints provide top-level metrics for water schemes across Maharashtra.

### A. All Water Schemes Data
Returns a comprehensive list of commissioned water schemes with their 7-day LPCD and water supply history.
- **Endpoint:** `GET /api/water-scheme-data`
- **Query Parameters:**
  - `region` (optional): Filter by region.
  - `agencyType` (optional): Filter by agency (e.g., 'MJP', 'ZP').
  - `minLpcd` (optional): Filter schemes with LPCD greater than this value.

### B. Village Counts & Statistics
Returns aggregated counts of villages, including those commissioned, those above/below 55 LPCD, and zero supply counts.
- **Endpoint:** `GET /api/water-scheme-data/village-counts`

### C. Population-Based Statistics
Returns the total population covered, population receiving safe water, and population receiving water above 55 LPCD.
- **Endpoint:** `GET /api/water-scheme-data/population-stats`

---

## 4. Live Sensor Data (Current Status)

### D. Residual Chlorine Status
Returns current residual chlorine measurements (mg/l) for every ESR.
- **Endpoint:** `GET /api/chlorine`
- **Extra:** Use `/api/chlorine/dashboard-stats` for aggregated counts.

### E. Water Consumption Status
Returns current water volume (liters) and flow metrics for ESRs.
- **Endpoint:** `GET /api/water-consumption`

### F. Water Pressure Status
Returns current pressure measurements (bar) at delivery points.
- **Endpoint:** `GET /api/pressure`

### G. Flowmeter Online/Offline Statistics
Returns counts of online and offline flowmeters categorized by region.
- **Endpoint:** `GET /api/flowmeter/overall-region-comparison`

---

## 5. Historical Data APIs

### H. Historical Data (Consolidated ESR Data)
Fetches historical data for Water, Chlorine, and Pressure in a single request.
- **Endpoint:** `GET /api/combined-esr-download/historical`
- **Required Params:** `startDate`, `endDate` (YYYY-MM-DD)

### I. Historical LPCD (Scheme Level)
Returns bulk historical LPCD data.
- **Endpoint:** `GET /api/scheme-lpcd-data/history`
- **Note:** Use `?limit=10000000` to fetch the complete dataset.

---

## 6. Smart Report APIs

Use these endpoints to generate or search for comprehensive scheme reports.

### J. Search Schemes
Search for schemes by name or ID to get the correct `schemeId` for reporting.
- **Endpoint:** `GET /api/smart-reports/search`
- **Query Params:** `query` (string)

### K. Comprehensive Scheme Report Data
Returns every metric (vitals, ESR data, 7-day arrays) for a specific scheme.
- **Endpoint:** `GET /api/smart-reports/scheme/:schemeId`

---

## 7. Sample Request Implementation (cURL)

**Fetch Live Regional Flowmeter Status:**
```bash
curl -X GET "https://mahajal-iot.mjp.maharashtra.gov.in/api/flowmeter/overall-region-comparison" \
     -H "X-External-Proxy-Key: h"
```

**Fetch Consolidated Historical Data:**
```bash
curl -X GET "https://mahajal-iot.mjp.maharashtra.gov.in/api/combined-esr-download/historical?startDate=2024-03-01&endDate=2024-03-31" \
     -H "X-External-Proxy-Key: h"
```

---
**Maintained by:** Mahajal IoT Technical Team
**Contact:** support@mahajal-iot.gov.in
