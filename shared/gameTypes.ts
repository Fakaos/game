export interface Position {
  x: number;
  y: number;
}

export interface Territory {
  id: string;
  position: Position;
  playerId: string;
  troops: number;
  buildings: Building[];
  terrain: TerrainType;
}

export enum TerrainType {
  PLAINS = 'plains',
  MOUNTAINS = 'mountains',
  WATER = 'water',
  COAST = 'coast'
}

export enum BuildingType {
  CITY = 'city',
  DEFENSE_POST = 'defense_post',
  PORT = 'port',
  MISSILE_SILO = 'missile_silo',
  SAM_SITE = 'sam_site'
}

export interface Building {
  id: string;
  type: BuildingType;
  position: Position;
  playerId: string;
  cooldown: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  gold: number;
  population: number;
  maxPopulation: number;
  workers: number;
  troops: number;
  territories: string[];
  buildings: Building[];
  alliances: string[];
  isEliminated: boolean;
}

export interface Missile {
  id: string;
  playerId: string;
  startPosition: Position;
  targetPosition: Position;
  launchTime: number;
  intercepted: boolean;
}

export interface GameState {
  id: string;
  players: Map<string, Player>;
  territories: Map<string, Territory>;
  missiles: Map<string, Missile>;
  mapWidth: number;
  mapHeight: number;
  gameStarted: boolean;
  winner: string | null;
}

export interface GameAction {
  type: string;
  playerId: string;
  data: any;
}

export const BUILDING_COSTS = {
  [BuildingType.CITY]: 100,
  [BuildingType.DEFENSE_POST]: 50,
  [BuildingType.PORT]: 75,
  [BuildingType.MISSILE_SILO]: 200,
  [BuildingType.SAM_SITE]: 150
};

export const BUILDING_EFFECTS = {
  [BuildingType.CITY]: { populationIncrease: 50 },
  [BuildingType.DEFENSE_POST]: { defenseBonus: 2 },
  [BuildingType.PORT]: { tradeIncome: 5 },
  [BuildingType.MISSILE_SILO]: { cooldown: 10000 },
  [BuildingType.SAM_SITE]: { interceptRadius: 3, cooldown: 10000 }
};

export const NUKE_COST = 100;
export const NUKE_DAMAGE_RADIUS = 2;
export const MISSILE_TRAVEL_TIME = 5000; // 5 seconds
