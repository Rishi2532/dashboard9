# CSV Import Guide for Maharashtra Water Infrastructure Platform

## Water Consumption CSV Import

The platform supports automatic import of water consumption data from CSV files with the following specifications:

### Supported CSV Format

**Required Columns (30 total):**
1. Region
2. Circle  
3. Division
4. Sub Division
5. Block
6. Scheme ID
7. Scheme Name
8. Village Name
9. ESR Name
10. Flow Rate (m³)
11. Flow Meter Connected
12. Online Status
13. Time Duration
14. ESR Capacity
15. Water Value Day 1
16. Water Value Day 2
17. Water Value Day 3
18. Water Value Day 4
19. Water Value Day 5
20. Water Value Day 6
21. Water Value Day 7
22. Water Date Day 1
23. Water Date Day 2
24. Water Date Day 3
25. Water Date Day 4
26. Water Date Day 5
27. Water Date Day 6
28. Water Date Day 7
29. Consistent Zero Consumption
30. Percentage Consumption Previous Day

### Automatic Column Mapping

When uploading a CSV file with 30+ columns to the Water Consumption Data section, the system will:

- Automatically map columns 0-29 to the correct database fields
- No manual field mapping required
- Direct upload without validation errors

### Supported Date Formats

The system automatically handles multiple date formats:

- **DD-MMM format**: `28-Jul`, `01-Aug`, `15-Dec`
- **DD/MM/YYYY format**: `28/07/2025`, `01/08/2025`
- **MM/DD/YYYY format**: `07/28/2025`, `08/01/2025`
- **YYYY-MM-DD format**: `2025-07-28`, `2025-08-01`

### Usage Instructions

1. Navigate to Admin Dashboard → Water Consumption Data
2. Click "Import CSV"
3. Select your CSV file (must have 30+ columns)
4. System automatically selects "Water Consumption Table"
5. System automatically maps all columns
6. Click "Import" - no manual mapping needed

### Error Handling

The system provides:
- Comprehensive error reporting with row numbers
- Date format validation and automatic conversion
- Data type validation
- Duplicate record detection and updates

### Dashboard URL Generation

Each imported record automatically gets a dashboard URL generated based on:
- Region, Circle, Division, Sub Division, Block
- Scheme ID and Scheme Name
- Special case handling for specific schemes

This ensures seamless integration with existing PI Vision dashboards.