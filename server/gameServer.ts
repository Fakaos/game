import { Server, Socket } from 'socket.io';
import { GameStateManager } from './gameState';
import { GameAction, BotDifficulty } from '@shared/gameTypes';
import { BotController } from './botController';

export class GameServer {
  private io: Server;
  private gameManager: GameStateManager;
  private botController: BotController;
  private players: Map<string, string> = new Map(); // socketId -> playerId
  private singlePlayerSessions: Map<string, boolean> = new Map(); // socketId -> isSinglePlayer

  constructor(io: Server) {
    this.io = io;
    this.gameManager = new GameStateManager(this.broadcastGameState.bind(this));
    this.botController = new BotController(this.gameManager);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Player connected:', socket.id);

      socket.on('join_game', (data: { playerName: string; isSinglePlayer?: boolean; numBots?: number; botDifficulties?: string[] }) => {
        this.handlePlayerJoin(socket, data.playerName, data.isSinglePlayer, data.numBots, data.botDifficulties);
      });

      socket.on('game_action', (action: GameAction) => {
        this.handleGameAction(socket, action);
      });

      socket.on('disconnect', () => {
        this.handlePlayerLeave(socket);
      });
    });
  }

  private handlePlayerJoin(socket: Socket, playerName: string, isSinglePlayer?: boolean, numBots?: number, botDifficulties?: string[]): void {
    const playerId = socket.id;

    if (isSinglePlayer) {
      if (this.players.size > 0) {
        console.log('Rejecting single-player join - other players are connected');
        socket.emit('join_failed', { reason: 'Game in progress. Please wait or start a new session.' });
        return;
      }

      this.players.set(socket.id, playerId);
      this.singlePlayerSessions.set(socket.id, true);
      
      this.resetGameState();
      
      const player = this.gameManager.addPlayer(playerId, playerName);
      
      if (numBots && numBots > 0 && botDifficulties) {
        console.log(`Starting single player game with ${numBots} bots`);
        
        for (let i = 0; i < numBots; i++) {
          const difficulty = botDifficulties[i] as BotDifficulty || BotDifficulty.MEDIUM;
          this.botController.addBot(difficulty);
        }
        
        this.botController.startBotUpdates();
      }
    } else {
      const hasSinglePlayerSession = Array.from(this.singlePlayerSessions.values()).some(v => v === true);
      
      if (hasSinglePlayerSession) {
        console.log('Rejecting multiplayer join - single-player session is active');
        socket.emit('join_failed', { reason: 'Single-player game in progress. Please wait.' });
        return;
      }

      this.players.set(socket.id, playerId);
      this.singlePlayerSessions.set(socket.id, false);
      
      if (this.players.size === 1 && this.botController.hasBots()) {
        console.log('First multiplayer player joining - clearing leftover bots');
        this.resetGameState();
      }
      
      const player = this.gameManager.addPlayer(playerId, playerName);
    }
    
    // Send initial game state to the new player
    socket.emit('game_state', this.gameManager.getGameState());
    
    // Notify other players
    socket.broadcast.emit('player_joined', { 
      playerId, 
      playerName: this.gameManager.getGameState().players.get(playerId)?.name || playerName
    });

    console.log(`Player ${playerName} joined as ${playerId} (${isSinglePlayer ? 'single-player' : 'multiplayer'})`);
  }

  private handlePlayerLeave(socket: Socket): void {
    const playerId = this.players.get(socket.id);
    if (!playerId) return;

    const wasSinglePlayer = this.singlePlayerSessions.get(socket.id);

    this.gameManager.removePlayer(playerId);
    this.players.delete(socket.id);
    this.singlePlayerSessions.delete(socket.id);

    if (wasSinglePlayer) {
      console.log(`Single-player session ended - resetting game state`);
      this.resetGameState();
    }

    // Notify other players
    socket.broadcast.emit('player_left', { playerId });
    
    console.log(`Player ${playerId} left the game`);
  }

  private handleGameAction(socket: Socket, action: GameAction): void {
    const playerId = this.players.get(socket.id);
    if (!playerId || action.playerId !== playerId) return;

    let success = false;

    try {
      switch (action.type) {
        case 'ALLOCATE_POPULATION':
          success = this.gameManager.allocatePopulation(
            playerId,
            action.data.workers,
            action.data.troops
          );
          break;

        case 'BUILD_STRUCTURE':
          success = this.gameManager.buildStructure(
            playerId,
            action.data.buildingType,
            action.data.territoryId
          );
          break;

        case 'LAUNCH_NUKE':
          success = this.gameManager.launchNuke(
            playerId,
            action.data.targetPosition,
            action.data.launchSiteId
          );
          if (success) {
            this.io.emit('missile_launched', {
              playerId,
              targetPosition: action.data.targetPosition
            });
          }
          break;

        case 'ATTACK_TERRITORY':
          success = this.gameManager.attackTerritory(
            playerId,
            action.data.targetTerritoryId,
            action.data.troopCount
          );
          break;

        case 'REQUEST_ALLIANCE':
          success = this.gameManager.requestAlliance(
            playerId,
            action.data.targetPlayerId
          );
          break;

        case 'BREAK_ALLIANCE':
          success = this.gameManager.breakAlliance(
            playerId,
            action.data.targetPlayerId
          );
          break;

        default:
          console.warn('Unknown action type:', action.type);
      }

      if (success) {
        // Broadcast updated game state
        this.broadcastGameState();
      } else {
        // Send error to player
        socket.emit('action_failed', { 
          action: action.type, 
          reason: 'Action could not be completed' 
        });
      }
    } catch (error) {
      console.error('Error handling game action:', error);
      socket.emit('action_failed', { 
        action: action.type, 
        reason: 'Server error' 
      });
    }
  }

  private broadcastGameState(): void {
    const gameState = this.gameManager.getGameState();
    this.io.emit('game_state', gameState);
  }

  private resetGameState(): void {
    console.log('Resetting game state and clearing all bots');
    
    this.botController.destroy();
    this.gameManager.destroy();
    
    this.gameManager = new GameStateManager(this.broadcastGameState.bind(this));
    this.botController = new BotController(this.gameManager);
  }

  destroy(): void {
    this.botController.destroy();
    this.gameManager.destroy();
  }
}
