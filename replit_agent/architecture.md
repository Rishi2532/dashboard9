# Architecture Overview

## 1. Overview

The Maharashtra Water Infrastructure Management Platform is a comprehensive web application designed to track, monitor, and provide insights into water infrastructure projects across Maharashtra, India. The system consolidates data from multiple regions including Pune, Nashik, Konkan, Chhatrapati Sambhajinagar, Amravati, and Nagpur. It focuses on water schemes, villages, and infrastructure components such as flow meters, pressure transmitters, and chlorine analyzers.

The platform provides:
- Regional data visualization and summaries
- Detailed scheme status reporting
- Village-level water supply data tracking (LPCD - Liters Per Capita per Day)
- PI Vision Dashboard integration for real-time monitoring
- Multi-language support
- AI-powered voice chatbot assistant

## 2. System Architecture

The application follows a typical client-server architecture with clear separation between frontend and backend components:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│  Database   │
│  (React)    │◀────│  (Express)  │◀────│ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    TypeScript-based shared types    │ External APIs │
└───────────────────────────────────┘ └─────────────┘
```

### Key Architecture Decisions:

1. **TypeScript Throughout**: The entire application uses TypeScript for type safety and developer experience.

2. **Shared Type Definitions**: The `/shared` directory contains types used by both frontend and backend, ensuring consistency.

3. **Database Access Layer**: The application uses Drizzle ORM for type-safe database access.

4. **API Design**: RESTful API endpoints with JSON payloads for client-server communication.

5. **External Integration**: Integration with PI Vision dashboard system for detailed infrastructure visualization.

6. **AI Integration**: OpenAI/Perplexity API integration for natural language processing and chatbot functionality.

## 3. Key Components

### 3.1 Frontend (Client)

- **Technology**: React with TypeScript
- **Location**: `/client` directory
- **Features**:
  - Dynamic regional data visualization
  - Scheme and village filtering capabilities
  - Interactive maps of water infrastructure
  - Multi-language support
  - Voice-enabled AI chatbot interface

### 3.2 Backend (Server)

- **Technology**: Express.js with TypeScript
- **Location**: `/server` directory
- **Features**:
  - RESTful API endpoints
  - Data import and processing
  - Regional data aggregation
  - Authentication and authorization
  - External API integrations
  - Scheduled updates

### 3.3 Database

- **Technology**: PostgreSQL
- **Schema Highlights**:
  - `region` - Regional information and summaries
  - `scheme_status` - Water scheme details including dashboard URLs
  - `water_scheme_data` - Village-level water data
  - `users` - User accounts for the application
  - `app_state` - Application state information
  - `chlorine_data` - Chlorine measurements for villages
  - `updates` - Record of data updates

### 3.4 Shared Components

- **Location**: `/shared` directory
- **Content**: Type definitions, interfaces, and utility functions shared between frontend and backend

## 4. Data Flow

### 4.1 Data Import Flow

1. Users upload Excel/CSV files containing water scheme and village data
2. Server processes and validates the data
3. Data is inserted or updated in the PostgreSQL database
4. Dashboard URLs are generated for schemes and villages
5. Regional summaries are recalculated

### 4.2 User Interaction Flow

1. Users authenticate to access the dashboard
2. Client fetches regional, scheme, and village data from the server
3. Users can filter and explore data through the interface
4. Clicking on scheme or village cards opens the PI Vision dashboard via generated URLs
5. Users can interact with the AI chatbot for natural language queries

### 4.3 Scheduled Update Flow

1. Scheduled task (`scheduled-update.ts`) runs periodically
2. Task fetches latest data from external sources
3. Database is updated with new information
4. Update records are created in the `updates` table
5. Cache is invalidated to ensure users see latest data

## 5. External Dependencies

### 5.1 Database

- **PostgreSQL**: Primary data storage solution
- **Neon Database**: Serverless PostgreSQL service used for cloud deployment

### 5.2 APIs and Integrations

- **PI Vision Dashboard**: External visualization system integrated via URL generation
  - Scheme-level dashboard: Display ID 10108
  - Village-level dashboard: Display ID 10109

- **AI Services**:
  - **OpenAI API**: Used for the chatbot functionality
  - **Perplexity API**: Alternative AI provider

### 5.3 Key Libraries

- **Drizzle ORM**: Type-safe database access layer
- **XLSX**: Excel file processing
- **csv-parse**: CSV file processing
- **Multer**: File upload handling

## 6. Deployment Strategy

The application is configured for multiple deployment scenarios:

### 6.1 Cloud Deployment (Primary)

- **Platform**: Deployed on autoscaling infrastructure (likely via Replit)
- **Database**: Neon serverless PostgreSQL
- **Environment Variables**: Configured for production via environment variables
- **Startup**: Uses `npm run build` for production builds and `tsx server/scheduled-update.ts` for startup

### 6.2 Local Development

Multiple local setup options are available:

- **VS Code Setup**: Custom configuration for VS Code users
- **pgAdmin Setup**: For users with pgAdmin PostgreSQL setup
- **Replit Development**: Configuration for Replit-based development

### 6.3 Database Initialization

- Automatic database initialization on first startup
- Creates required tables and default admin user
- Migration scripts available for schema updates

## 7. Security Considerations

- Environment variables for sensitive configuration
- Database credentials stored in environment variables
- Authentication for admin access
- HTTPS for secure communications with PI Vision dashboard

## 8. Maintenance and Operations

- Scripts for data correction and URL fixes
- Database migration scripts for schema evolution
- Monitoring via the `updates` table
- Comprehensive logging

## 9. Future Architectural Considerations

- Enhanced caching for improved performance
- More robust error handling
- Potential migration to a more scalable frontend framework
- Enhanced AI integration for predictive analytics