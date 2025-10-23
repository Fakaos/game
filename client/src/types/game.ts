export * from '@shared/gameTypes';

export interface ClientGameState {
  localPlayerId: string;
  selectedTerritory: string | null;
  showBuildingPanel: boolean;
  selectedBuilding: string | null;
  uiScale: number;
  nukeLaunchMode: boolean;
  nukeLaunchSiteId: string | null;
}
