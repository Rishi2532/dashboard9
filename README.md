# Maharashtra Water Infrastructure Management Platform

An advanced water infrastructure management platform for Maharashtra, providing intelligent insights into regional water projects through comprehensive data analysis and multi-block scheme management.

## Key Features

- **TypeScript/React Frontend**: Dynamic, consolidated data visualization
- **Express.js Backend**: Robust data import, processing, and aggregation
- **PostgreSQL Database**: Enhanced scheme and block-level tracking
- **PI Vision Dashboard Integration**: Automatic URL generation and regional data synchronization
- **Multi-Region Monitoring**: Comprehensive water infrastructure performance tracking

## Project Structure

- `/client`: Frontend React application
- `/server`: Backend Express API
- `/shared`: Shared types and schemas
- `/uploads`: Temporary storage for uploaded files

## Getting Started

This project is already configured to run properly on Replit. When you fork/remix this project, the database will be automatically set up for you.

### 1. Automatic Database Setup

The project includes an automatic database initialization script that runs on startup. This ensures that:
- All required database tables are created
- All necessary columns are present
- Default admin user is created (if needed)

### 2. Running the Application

The application starts automatically when you run the project. It uses the following startup command:

```
npm run dev
```

### 3. Default Login

You can access the administrative features using the default credentials:
- Username: `admin`
- Password: `admin123`

**Note**: For production use, it's recommended to change these default credentials.

## CSV Import Feature

The platform supports importing water consumption data via CSV files with automatic column mapping and intelligent date format parsing.

**See [CSV-IMPORT-GUIDE.md](./CSV-IMPORT-GUIDE.md) for detailed import instructions and supported formats.**

Key features:
- Automatic 29-column mapping for water consumption data
- Intelligent date format parsing (DD-MMM, DD/MM/YYYY, etc.)
- Comprehensive error handling and validation
- Dashboard URL generation for imported records

## Development Guidelines

If you're developing or extending this project, here are some key points to remember:

1. Database schema is defined in `shared/schema.ts`
2. API routes are defined in `server/routes.ts`
3. The frontend uses React Query for data fetching
4. The application uses Tailwind CSS for styling

## Troubleshooting

If you encounter any issues:

1. Check the server logs for error messages
2. Ensure the database connection is working properly
3. Verify that all database tables and columns match the schema in `shared/schema.ts`

## License

MIT