import { Server, Socket } from 'socket.io';
import { GameStateManager } from './gameState';
import { GameAction } from '@shared/gameTypes';

export class GameServer {
  private io: Server;
  private gameManager: GameStateManager;
  private players: Map<string, string> = new Map(); // socketId -> playerId

  constructor(io: Server) {
    this.io = io;
    this.gameManager = new GameStateManager(this.broadcastGameState.bind(this));
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Player connected:', socket.id);

      socket.on('join_game', (data: { playerName: string }) => {
        this.handlePlayerJoin(socket, data.playerName);
      });

      socket.on('game_action', (action: GameAction) => {
        this.handleGameAction(socket, action);
      });

      socket.on('disconnect', () => {
        this.handlePlayerLeave(socket);
      });
    });
  }

  private handlePlayerJoin(socket: Socket, playerName: string): void {
    const playerId = socket.id;
    this.players.set(socket.id, playerId);

    const player = this.gameManager.addPlayer(playerId, playerName);
    
    // Send initial game state to the new player
    socket.emit('game_state', this.gameManager.getGameState());
    
    // Notify other players
    socket.broadcast.emit('player_joined', { 
      playerId, 
      playerName: player.name 
    });

    console.log(`Player ${playerName} joined as ${playerId}`);
  }

  private handlePlayerLeave(socket: Socket): void {
    const playerId = this.players.get(socket.id);
    if (!playerId) return;

    this.gameManager.removePlayer(playerId);
    this.players.delete(socket.id);

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

  destroy(): void {
    this.gameManager.destroy();
  }
}
