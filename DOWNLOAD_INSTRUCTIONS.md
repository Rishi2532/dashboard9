# Maharashtra Water Infrastructure Management Platform - Download Package

## Package Contents

This download contains the complete Maharashtra Water Infrastructure Management Platform source code:

### Core Application Files
- `client/` - React frontend application with TypeScript
- `server/` - Express.js backend with TypeScript
- `shared/` - Shared schemas and types
- `public/` - Static assets and resources

### Configuration Files
- `package.json` - Node.js dependencies and scripts
- `package-lock.json` - Dependency lock file
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS styling configuration
- `postcss.config.js` - PostCSS configuration
- `drizzle.config.ts` - Database ORM configuration

### Database & Documentation
- `database_create_scripts.sql` - Complete database schema (13 tables)
- `replit.md` - Project documentation and architecture overview
- `README.md` - Setup and deployment instructions
- `theme.json` - UI theme configuration
- `.env.example` - Environment variables template
- `.gitignore` - Git ignore rules

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   - Create a PostgreSQL database
   - Run the SQL scripts in `database_create_scripts.sql`
   - Update environment variables with your database URL

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Configure DATABASE_URL and other required variables

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Default Admin Access**
   - Username: `admin`
   - Password: `admin123`

## Features Included

- Water scheme monitoring and LPCD tracking
- Chlorine and pressure data analysis
- Communication status monitoring
- Real-time dashboard with maps
- Data import functionality (Excel/CSV)
- Multi-language support
- AI-powered chatbot assistance
- User authentication and role management
- Historical data tracking and exports

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Charts**: Custom visualization components
- **Maps**: Leaflet for geospatial data
- **State Management**: TanStack Query

## Database Schema

The platform includes 13 database tables:
1. users - User authentication
2. region - Regional infrastructure summaries
3. scheme_status - Water scheme tracking
4. water_scheme_data - Village LPCD data
5. chlorine_data - ESR chlorine monitoring
6. pressure_data - ESR pressure monitoring
7. communication_status - Sensor connectivity
8. And 6 additional supporting tables for historical data and monitoring

## Support

For technical assistance or questions about deployment, refer to the comprehensive documentation in `replit.md` and `README.md`.

---
**Package Generated**: June 25, 2025
**Platform Version**: 2.0
**Database Tables**: 13 complete schemas included