import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GameState, Player, Territory, Building, GameAction } from '@shared/gameTypes';
import { ClientGameState } from '../types/game';

interface GameStore extends ClientGameState {
  gameState: GameState | null;
  connected: boolean;
  playerName: string;
  
  // Actions
  setGameState: (gameState: GameState) => void;
  setConnected: (connected: boolean) => void;
  setPlayerName: (name: string) => void;
  setLocalPlayerId: (id: string) => void;
  selectTerritory: (territoryId: string | null) => void;
  toggleBuildingPanel: () => void;
  selectBuilding: (buildingId: string | null) => void;
  setNukeLaunchMode: (enabled: boolean, launchSiteId: string | null) => void;
  
  // Computed getters
  getLocalPlayer: () => Player | null;
  getSelectedTerritory: () => Territory | null;
  canAffordBuilding: (cost: number) => boolean;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Client state
    localPlayerId: '',
    selectedTerritory: null,
    showBuildingPanel: false,
    selectedBuilding: null,
    uiScale: 1,
    nukeLaunchMode: false,
    nukeLaunchSiteId: null,
    
    // Game state
    gameState: null,
    connected: false,
    playerName: '',
    
    // Actions
    setGameState: (gameState) => set({ gameState }),
    setConnected: (connected) => set({ connected }),
    setPlayerName: (playerName) => set({ playerName }),
    setLocalPlayerId: (localPlayerId) => set({ localPlayerId }),
    selectTerritory: (territoryId) => set({ selectedTerritory: territoryId }),
    toggleBuildingPanel: () => set((state) => ({ showBuildingPanel: !state.showBuildingPanel })),
    selectBuilding: (buildingId) => set({ selectedBuilding: buildingId }),
    setNukeLaunchMode: (enabled, launchSiteId) => set({ nukeLaunchMode: enabled, nukeLaunchSiteId: launchSiteId }),
    
    // Computed getters
    getLocalPlayer: () => {
      const { gameState, localPlayerId } = get();
      return gameState?.players.get(localPlayerId) || null;
    },
    
    getSelectedTerritory: () => {
      const { gameState, selectedTerritory } = get();
      return selectedTerritory && gameState ? gameState.territories.get(selectedTerritory) || null : null;
    },
    
    canAffordBuilding: (cost) => {
      const localPlayer = get().getLocalPlayer();
      return localPlayer ? localPlayer.gold >= cost : false;
    }
  }))
);
