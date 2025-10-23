import { io, Socket } from 'socket.io-client';
import { GameState, GameAction } from '@shared/gameTypes';

class SocketClient {
  private socket: Socket | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  connect(serverUrl: string = window.location.origin): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(serverUrl);

      this.socket.on('connect', () => {
        console.log('Connected to game server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection failed:', error);
        reject(error);
      });

      this.socket.on('game_state', (gameState: GameState) => {
        this.emit('game_state', gameState);
      });

      this.socket.on('player_joined', (data) => {
        this.emit('player_joined', data);
      });

      this.socket.on('player_left', (data) => {
        this.emit('player_left', data);
      });

      this.socket.on('game_action', (action: GameAction) => {
        this.emit('game_action', action);
      });

      this.socket.on('missile_launched', (data) => {
        this.emit('missile_launched', data);
      });

      this.socket.on('missile_intercepted', (data) => {
        this.emit('missile_intercepted', data);
      });

      this.socket.on('nuke_impact', (data) => {
        this.emit('nuke_impact', data);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks.clear();
  }

  joinGame(playerName: string): void {
    if (this.socket) {
      this.socket.emit('join_game', { playerName });
    }
  }

  sendAction(action: GameAction): void {
    if (this.socket) {
      this.socket.emit('game_action', action);
    }
  }

  getSocketId(): string {
    return this.socket?.id || '';
  }

  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.callbacks.delete(event);
    } else {
      const callbacks = this.callbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const socketClient = new SocketClient();
