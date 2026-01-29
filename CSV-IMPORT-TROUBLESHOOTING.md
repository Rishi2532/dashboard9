# CSV Import Troubleshooting Guide

This guide helps resolve common CSV import issues in the Maharashtra Water Infrastructure Management Platform.

## Quick Fix for Common Issues

### 1. "Unexpected field" Error

**Problem**: CSV uploads fail with "Unexpected field" error message.

**Solution**: This error typically occurs when there's a field name mismatch between frontend and backend.

**Files to check**:
- `server/routes/water-consumption-routes.ts` - should use `upload.single("file")`
- `client/src/components/admin/enhanced-csv-importer.tsx` - should use `formData.append("file", file)`

### 2. Numeric Field Overflow Error

**Problem**: Database rejects values with error like "precision 5, scale 2 must round to an absolute value less than 10^3"

**Solution**: Update database schema to handle larger values.

**Files to update**:
- `shared/schema.ts` - Update decimal fields to use higher precision (e.g., `precision: 15, scale: 2`)

**Apply changes**:
```bash
npm run db:push
```

### 3. File Upload Size Limits

**Problem**: Large CSV files fail to upload.

**Solution**: Check multer configuration in route files:
```javascript
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});
```

## Testing CSV Import

After making changes, test with a small CSV file first:

1. Go to Admin Dashboard
2. Select "Water Consumption Data" tab
3. Use "Enhanced CSV Data Import"
4. Select target table: "Water Consumption Table"
5. Upload a test CSV file
6. Check console logs for any errors

## Database Schema Updates

When adding new fields or changing precision:

1. Update `shared/schema.ts`
2. Run `npm run db:push` to apply changes
3. Test import functionality

## Common Field Mappings

Water consumption CSV should have these columns (29 total):
- Region, Circle, Division, Sub Division, Block
- Scheme ID, Scheme Name, Village Name, ESR Name
- Flow Rate, Flow Meter Connected, Online Status, ESR Capacity
- Water Value Day 1-7, Water Date Day 1-7
- Consistent Zero Consumption, Percentage Consumption Previous Day

## Error Monitoring

Check these log sources for troubleshooting:
- Browser console (F12 → Console)
- Application logs in Replit console
- Database error messages
- Network tab for HTTP request/response details