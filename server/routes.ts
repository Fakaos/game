import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { GameServer } from "./gameServer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Basic health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // In production, specify your domain
      methods: ["GET", "POST"]
    }
  });

  // Initialize game server
  const gameServer = new GameServer(io);

  console.log('Game server initialized with Socket.IO');

  return httpServer;
}
