# Mahajal IoT Data Integration – API Documentation

This guide provides the necessary details for third-party systems (like the CM Dashboard) to programmatically access Mahajal IoT water metrics. 

## 1. Authentication
To ensure security, all server-to-server requests must be authenticated using a static API key.

For **every** HTTP GET request, you must include the following custom header:
- **Key:** `X-External-Proxy-Key`
- **Value:** `MAHAJAL_IOT_SECURE_KEY_25`

*(Note: Failure to include this exact header will result in an `HTTP 401 Unauthorized` response).*

---

## 2. Historical & Raw Data APIs
These are the primary endpoints for pulling long-term historical records and raw database tables. 

**Important Note on Date Filters:** 
All historical endpoints support optional `startDate` and `endDate` query parameters. 
- If you **do** provide them, the API will return data specifically for that time window.
- If you **do not** provide them, the API will automatically default to returning the **entire history** available in the database.

### A. Water Consumption History
Returns historical water consumption volumes and flow rates for ESRs.
- **Endpoint:** `GET /api/water-consumption/historical`
- **Optional Query Params:**
  - `startDate` (Format: YYYY-MM-DD)
  - `endDate` (Format: YYYY-MM-DD)
  - `region` (e.g., 'Pune', 'Nashik')

### B. Chlorine History
Returns historical residual chlorine measurements recorded across ESRs.
- **Endpoint:** `GET /api/chlorine/historical`
- **Optional Query Params:**
  - `startDate` (Format: YYYY-MM-DD)
  - `endDate` (Format: YYYY-MM-DD)
  - `region` (e.g., 'Pune')

### C. Pressure History
Returns historical pressure measurements (measured in bar) across ESRs.
- **Endpoint:** `GET /api/pressure/historical`
- **Optional Query Params:**
  - `startDate` (Format: YYYY-MM-DD)
  - `endDate` (Format: YYYY-MM-DD)
  - `region` (e.g., 'Pune')

### D. Scheme LPCD History
Returns aggregations of historical Liters Per Capita per Day (LPCD) at the scheme and village level.
- **Endpoint:** `GET /api/scheme-lpcd-data/history`
- **Pagination Params:** Because this dataset is massive, it returns 1,000 rows by default. To pull the entire dataset in a single request, pass a massive limit parameter: `?limit=10000000`
- **Optional Date Params:**
  - `start_date` (Format: YYYY-MM-DD)
  - `end_date` (Format: YYYY-MM-DD)

---

## 3. Current Live Snapshot APIs
If you only need the most recent 7-day snapshot rather than full historical logs, you can use these endpoints.

### E. Live Water Scheme Status
Provides the most recent data on all commissioned water schemes, including population metrics and 7-day data arrays.
- **Endpoint:** `GET /api/water-scheme-data`
- **Optional Query Params:**
  - `region` (e.g., 'Pune' or 'all')

### F. Live Water Consumption Status
Provides current water consumption logs mapped per ESR and scheme.
- **Endpoint:** `GET /api/water-consumption`
- **Optional Query Params:**
  - `region` (e.g., 'Pune' or 'all')
  - `agencyType` (e.g., 'MJP')

### G. Live Chlorine Status
Provides the current residual chlorine tests mapped per ESR.
- **Endpoint:** `GET /api/chlorine`
- **Optional Query Params:**
  - `region` (e.g., 'Pune')

### H. Live Pressure Status
Provides the current pressure test values mapped per ESR.
- **Endpoint:** `GET /api/pressure`
- **Optional Query Params:**
  - `region` (e.g., 'Pune')

---

## 4. Derived Dashboard Statistics (Aggregations)
If your dashboard just needs the top-level metric rollups (like "Total Safe Tests" or "Total ESRs With Good Pressure") without aggregating the raw arrays manually, use these endpoints:

### I. Chlorine Summary Stats
- **Endpoint:** `GET /api/chlorine/dashboard-stats`

### J. Pressure Summary Stats
- **Endpoint:** `GET /api/pressure/dashboard-stats`

---

## 5. Sample Request (cURL)

Below is an example of fetching the full Water Consumption History for the month of March via terminal/cURL:

```bash
curl -X GET "https://your-domain.com/api/water-consumption/historical?startDate=2024-03-01&endDate=2024-03-31" \
     -H "X-External-Proxy-Key: MAHAJAL_IOT_SECURE_KEY_25"
```

To fetch the **entire** Water Consumption History table (no date filters):

```bash
curl -X GET "https://your-domain.com/api/water-consumption/historical" \
     -H "X-External-Proxy-Key: MAHAJAL_IOT_SECURE_KEY_25"
```
