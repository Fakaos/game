# Territory.io - Multiplayer Strategy Game

## Overview
A real-time multiplayer strategy game where players compete to expand their territory, build structures, form alliances, and conquer opponents. Features include territory control, resource management, missile launching, and alliance mechanics.

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express + Socket.IO for real-time communication
- **Database**: PostgreSQL (via Neon) with Drizzle ORM
- **3D Graphics**: Three.js via @react-three/fiber
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: Zustand

### Project Structure
```
├── client/              # Frontend React application
│   ├── public/          # Static assets (sounds, models, textures)
│   └── src/
│       ├── components/  # React components including UI components
│       ├── lib/         # Game engine, stores, utilities
│       ├── pages/       # Page components
│       └── types/       # TypeScript types
├── server/              # Backend Express server
│   ├── gameServer.ts    # Socket.IO game logic
│   ├── gameState.ts     # Game state management
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   └── vite.ts          # Vite dev server integration
└── shared/              # Shared types and schemas
    ├── gameTypes.ts     # Game action types
    └── schema.ts        # Database schema
```

## Development Setup

### Running the App
The project uses a single command that runs both frontend and backend:
```bash
npm run dev
```

This starts:
- Express server on port 5000
- Vite dev server (integrated via middleware)
- Socket.IO server for real-time game updates

### Database
The app uses PostgreSQL with Drizzle ORM. Database is already provisioned in Replit.

To push schema changes:
```bash
npm run db:push
```

### Build for Production
```bash
npm run build  # Builds both frontend and backend
npm start      # Runs production server
```

## Game Features
- **Territory Control**: Expand by conquering adjacent territories
- **Resource Management**: Allocate population between workers and troops
- **Building System**: Construct cities, defenses, and missile silos
- **Combat**: Attack territories and launch nuclear strikes
- **Alliances**: Form and break alliances with other players
- **Real-time Multiplayer**: All players see updates instantly via WebSocket

## Recent Changes
- 2025-10-23: Initial project import and setup for Replit environment
  - Configured for port 5000 with proper host settings (0.0.0.0)
  - Vite already configured with allowedHosts: true for Replit proxy
  - Database connection configured

## Configuration Notes
- Frontend served on port 5000 (required for Replit)
- Server uses 0.0.0.0 as host for external access
- Vite configured with allowedHosts: true for Replit iframe proxy
- HMR (Hot Module Replacement) enabled via Vite middleware
