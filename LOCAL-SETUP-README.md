# Local Setup Guide for Maharashtra Water Infrastructure Dashboard

## Initial Setup

1. Make sure you have Node.js and PostgreSQL installed on your system
2. Create a PostgreSQL database for the project
3. Copy `.env.example` to `.env` and update it with your database credentials
4. Run `npm install` to install all dependencies
5. Start the application with `npm run dev`

## Fixing Dashboard Buttons Not Appearing

When running the application locally after downloading the ZIP file, you might notice that the dashboard buttons for schemes and villages are not visible. This happens because the dashboard URLs need to be generated first.

### Automatic Solution

Run the following command from the project root directory to automatically generate all dashboard URLs:

```bash
node fix-missing-dashboard-urls.cjs
```

This script will:

1. Connect to your database using the credentials in your `.env` file
2. Generate dashboard URLs for all schemes in the `scheme_status` table
3. Generate dashboard URLs for all villages in the `water_scheme_data` table
4. Add the `dashboard_url` column to these tables if it doesn't exist

After running the script, refresh your browser and you should see the dashboard buttons appearing for both schemes and villages.

### Troubleshooting

If you encounter any issues:

1. Make sure your database is properly initialized and contains data
2. Verify that your `.env` file has the correct database connection string
3. Check the console for any error messages during script execution
4. If needed, manually add a `dashboard_url` column to the `scheme_status` and `water_scheme_data` tables in your database

## Database Schema Information

The application uses 8 main tables:

1. `region` - Regional information and summaries
2. `scheme_status` - Details about water schemes (including dashboard URLs)
3. `water_scheme_data` - Village-level water data (including dashboard URLs)
4. `users` - User accounts for the application
5. `app_state` - Application state information
6. `chlorine_data` - Chlorine measurements for villages
7. `pressure_data` - Pressure measurements for villages
8. `global_summary` - Aggregate summaries across regions

## Dashboard URL Structure

The dashboard URLs use the following structure:

- **Scheme URLs**: Use display ID 10108 with "SCHEME_LEVEL_DASHBOARD" in the URL
- **Village URLs**: Use display ID 10109 with "VILLAGE_LEVEL_DASHBOARD" in the URL
- All URLs follow the path hierarchy: Region > Circle > Division > Sub Division > Block > Scheme > [Village]
- Special cases are handled for Amravati region (displays as "Amaravati" in URLs) and the Bargaonpimpri scheme (requires a non-breaking space character)

## Questions and Support

If you need further assistance with your local setup, please reach out to the development team or refer to the main README.md file for additional information.
