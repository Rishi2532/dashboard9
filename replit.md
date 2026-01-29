# Maharashtra Water Infrastructure Management Platform

## Overview

A comprehensive platform for managing water infrastructure in Maharashtra, providing intelligent insights into regional water projects. It features real-time water consumption tracking, multi-block scheme management, and AI-powered chatbot assistance. The platform aims to enhance efficiency and decision-making in regional water management through data analysis and advanced monitoring capabilities, contributing to the business vision of optimizing water resource utilization and ensuring sustainable water supply across the state.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **UI Framework**: Shadcn/ui components with Tailwind CSS.
- **Charts & Visualization**: Custom interactive maps, LPCD filter cards, heatmaps, and circle packing.
- **Color Schemes**: Green, yellow, orange, and red for status indicators and data categorization.
- **Design Approach**: Clear, intuitive dashboards with interactive elements and export capabilities.

### Technical Implementations
- **Frontend**: React 18 with TypeScript (Vite), TanStack Query for state management, and React Hook Form with Zod for forms.
- **Backend**: Node.js with Express.js (TypeScript), RESTful API, Excel/CSV imports (XLSX library), and Express sessions for authentication.
- **Database**: PostgreSQL with Drizzle ORM, comprehensive data models for regions, schemes, villages (including ESR counts and completion status), users, population, and chlorine data.
- **AI Integration**: OpenAI-powered conversational interface for multi-language data queries, including advanced multi-condition queries, correlation analysis, and natural language SQL.
- **Data Import System**: Advanced CSV import with automatic column mapping, intelligent date format parsing, and error handling for water consumption data.
- **Authentication**: User authentication with role-based access control and session management.

### Feature Specifications
- **Regional Management**: Summaries and statistics for water infrastructure across regions.
- **Scheme Tracking**: Detailed monitoring of water scheme statuses and completion.
- **Water Consumption**: Village-level ESR consumption tracking in Lakh Liters (LL) with percentage-based capacity analysis and automatic CSV import. Includes historical data export with date range filtering.
- **Population Tracking**: Storage and analysis of historical population data.
- **Water Quality**: Tracking of chlorine levels and water quality.
- **Interactive Dashboards**: Comprehensive dashboards for regional overviews, scheme monitoring, LPCD analysis, and geospatial visualization.
- **Data Export**: Export capabilities for various data formats, including historical water consumption and LPCD data.
- **Combined ESR Download**: Dashboard feature for downloading combined ESR-level data (water consumption, chlorine, pressure) with two modes: latest data (day7 values) and historical data with date range selection. Supports region filtering and exports to Excel format.
- **Communication Status**: Monitoring of communication status for ESR locations, including real-time sensor connectivity.
- **Helpdesk System**: Enhanced helpdesk with status cards, region tracking, email notifications, admin resolution, ticket reopening, and a dashboard URL field for context.
- **Chatbot Capabilities**: Supports equipment count queries (chlorine analyzers, pressure transmitters, flow meters, ESRs) across regions, schemes, and villages. Includes a conversational AI fallback for unhandled queries, providing domain-specific guidance and multilingual support. Also handles PDF report generation requests. Enhanced keyword detection treats "graph" and "chart" identically for all widget types (LPCD, chlorine, pressure, water consumption). Scheme LPCD queries (e.g., "scheme lpcd in amravati", "lpcd in all regions") trigger CombinedSchemeLpcdWidget with Excel export. Multi-word village name extraction works without "village" suffix (e.g., "lpcd graph sawangi meghe").
- **Dynamic Multilingual Translation**: Full chatbot translation support using OpenAI API for Hindi and Marathi queries. The `translateBotResponse` function in `client/src/services/openai-service.ts` detects query language and translates responses dynamically while preserving emojis, technical terms (LPCD, ESR, mg/L, bar), and numerical values. Translation is cached to avoid redundant API calls. Widget messages and error messages are automatically translated based on the user's query language.
- **Reliable Water Consumption Widget**: Identifies villages with reliable water management based on specific consumption criteria, with ESR-level data and Excel export.

## External Dependencies

- **Database**: PostgreSQL
- **Cloud Database Hosting**: Neon Database
- **AI/NLP**: OpenAI API
- **Translation**: Google Translate
- **Runtime**: Node.js 20+
- **Package Manager**: npm