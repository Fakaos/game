import { 
  GameState, 
  Player, 
  Territory, 
  Building, 
  Missile, 
  TerrainType, 
  BuildingType,
  Position,
  BUILDING_COSTS,
  BUILDING_EFFECTS,
  NUKE_COST,
  NUKE_DAMAGE_RADIUS,
  MISSILE_TRAVEL_TIME
} from '@shared/gameTypes';

export class GameStateManager {
  private gameState: GameState;
  private gameLoop: NodeJS.Timeout | null = null;
  private onStateChange: (gameState: GameState) => void;

  constructor(onStateChange: (gameState: GameState) => void) {
    this.onStateChange = onStateChange;
    this.gameState = {
      id: 'game-' + Date.now(),
      players: new Map(),
      territories: new Map(),
      missiles: new Map(),
      mapWidth: 30,
      mapHeight: 20,
      gameStarted: false,
      winner: null
    };

    this.initializeMap();
    this.startGameLoop();
  }

  private initializeMap(): void {
    // Generate a simple map with different terrain types
    for (let x = 0; x < this.gameState.mapWidth; x++) {
      for (let y = 0; y < this.gameState.mapHeight; y++) {
        const territoryId = `${x}-${y}`;
        let terrain = TerrainType.PLAINS;
        
        // Create water areas
        if (y === 0 || y === this.gameState.mapHeight - 1 || 
            x === 0 || x === this.gameState.mapWidth - 1) {
          terrain = TerrainType.WATER;
        }
        
        // Create coast near water
        if ((y === 1 || y === this.gameState.mapHeight - 2 || 
             x === 1 || x === this.gameState.mapWidth - 2) && terrain === TerrainType.PLAINS) {
          terrain = TerrainType.COAST;
        }
        
        // Add some mountains
        if (Math.random() < 0.15 && terrain === TerrainType.PLAINS) {
          terrain = TerrainType.MOUNTAINS;
        }

        const territory: Territory = {
          id: territoryId,
          position: { x, y },
          playerId: '', // Neutral initially
          troops: 0,
          buildings: [],
          terrain
        };

        this.gameState.territories.set(territoryId, territory);
      }
    }
  }

  private startGameLoop(): void {
    this.gameLoop = setInterval(() => {
      this.updateGame();
    }, 1000); // Update every second
  }

  private updateGame(): void {
    // Update player resources
    this.gameState.players.forEach(player => {
      if (player.isEliminated) return;

      // Generate gold from workers
      player.gold += Math.floor(player.workers * 0.5);

      // Add trade income from ports
      const ports = player.buildings.filter(b => b.type === BuildingType.PORT);
      player.gold += ports.length * BUILDING_EFFECTS[BuildingType.PORT].tradeIncome;

      // Update building cooldowns
      player.buildings.forEach(building => {
        if (building.cooldown > 0) {
          building.cooldown = Math.max(0, building.cooldown - 1000);
        }
      });
    });

    // Update missile positions and check for impacts
    this.updateMissiles();

    // Check for eliminated players
    this.checkPlayerElimination();

    // Check win condition
    this.checkWinCondition();

    this.onStateChange(this.gameState);
  }

  private updateMissiles(): void {
    const now = Date.now();
    const missilesToRemove: string[] = [];

    this.gameState.missiles.forEach((missile, missileId) => {
      if (missile.intercepted) {
        missilesToRemove.push(missileId);
        return;
      }

      const flightTime = now - missile.launchTime;
      if (flightTime >= MISSILE_TRAVEL_TIME) {
        // Missile impact
        this.processMissileImpact(missile);
        missilesToRemove.push(missileId);
      }
    });

    missilesToRemove.forEach(id => {
      this.gameState.missiles.delete(id);
    });
  }

  private processMissileImpact(missile: Missile): void {
    const { targetPosition } = missile;
    
    // Damage all territories within radius
    this.gameState.territories.forEach(territory => {
      const distance = Math.abs(territory.position.x - targetPosition.x) + 
                      Math.abs(territory.position.y - targetPosition.y);
      
      if (distance <= NUKE_DAMAGE_RADIUS) {
        // Destroy buildings
        territory.buildings = [];
        
        // Kill population
        const player = this.gameState.players.get(territory.playerId);
        if (player) {
          const troopsLost = Math.min(territory.troops, territory.troops);
          territory.troops = Math.max(0, territory.troops - troopsLost);
          
          // Reduce player population
          player.troops = Math.max(0, player.troops - troopsLost);
          player.population = player.workers + player.troops;
        }
        
        // If no troops left, territory becomes neutral
        if (territory.troops === 0) {
          territory.playerId = '';
        }
      }
    });
  }

  private checkPlayerElimination(): void {
    this.gameState.players.forEach(player => {
      if (player.isEliminated) return;

      // Player is eliminated if they have no territories
      const hasTerritory = Array.from(this.gameState.territories.values())
        .some(territory => territory.playerId === player.id);

      if (!hasTerritory) {
        player.isEliminated = true;
      }
    });
  }

  private checkWinCondition(): void {
    if (this.gameState.winner) return;

    const alivePlayers = Array.from(this.gameState.players.values())
      .filter(player => !player.isEliminated);

    if (alivePlayers.length <= 1 && alivePlayers.length > 0) {
      this.gameState.winner = alivePlayers[0].id;
    }
  }

  addPlayer(playerId: string, playerName: string): Player {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const color = colors[this.gameState.players.size % colors.length];

    const player: Player = {
      id: playerId,
      name: playerName,
      color,
      gold: 100,
      population: 10,
      maxPopulation: 50,
      workers: 5,
      troops: 5,
      territories: [],
      buildings: [],
      alliances: [],
      isEliminated: false
    };

    this.gameState.players.set(playerId, player);

    // Assign starting territory
    this.assignStartingTerritory(player);

    return player;
  }

  private assignStartingTerritory(player: Player): void {
    // Find a suitable starting location (plains, not too close to others)
    const availableTerritories = Array.from(this.gameState.territories.values())
      .filter(territory => 
        territory.playerId === '' && 
        territory.terrain === TerrainType.PLAINS
      );

    if (availableTerritories.length > 0) {
      const startTerritory = availableTerritories[Math.floor(Math.random() * availableTerritories.length)];
      startTerritory.playerId = player.id;
      startTerritory.troops = 5;
      player.territories.push(startTerritory.id);
    }
  }

  removePlayer(playerId: string): void {
    const player = this.gameState.players.get(playerId);
    if (!player) return;

    // Make all player territories neutral
    this.gameState.territories.forEach(territory => {
      if (territory.playerId === playerId) {
        territory.playerId = '';
        territory.troops = 0;
        territory.buildings = [];
      }
    });

    this.gameState.players.delete(playerId);
  }

  allocatePopulation(playerId: string, workers: number, troops: number): boolean {
    const player = this.gameState.players.get(playerId);
    if (!player || workers + troops !== player.population) return false;

    player.workers = workers;
    player.troops = troops;
    return true;
  }

  buildStructure(playerId: string, buildingType: BuildingType, territoryId: string): boolean {
    const player = this.gameState.players.get(playerId);
    const territory = this.gameState.territories.get(territoryId);
    
    if (!player || !territory || territory.playerId !== playerId) return false;
    if (player.gold < BUILDING_COSTS[buildingType]) return false;

    // Check terrain requirements
    if (buildingType === BuildingType.PORT && territory.terrain !== TerrainType.COAST) {
      return false;
    }

    // Check if building already exists
    if (territory.buildings.some(b => b.type === buildingType)) {
      return false;
    }

    // Deduct cost
    player.gold -= BUILDING_COSTS[buildingType];

    // Create building
    const building: Building = {
      id: `${buildingType}-${Date.now()}`,
      type: buildingType,
      position: territory.position,
      playerId,
      cooldown: 0
    };

    territory.buildings.push(building);
    player.buildings.push(building);

    // Apply building effects
    if (buildingType === BuildingType.CITY) {
      player.maxPopulation += BUILDING_EFFECTS[buildingType].populationIncrease;
    }

    return true;
  }

  launchNuke(playerId: string, targetPosition: Position, launchSiteId: string): boolean {
    const player = this.gameState.players.get(playerId);
    const launchSite = this.gameState.territories.get(launchSiteId);
    
    if (!player || !launchSite || launchSite.playerId !== playerId) return false;
    if (player.gold < NUKE_COST) return false;

    // Check for missile silo
    const missileSilo = launchSite.buildings.find(b => 
      b.type === BuildingType.MISSILE_SILO && b.cooldown === 0
    );
    
    if (!missileSilo) return false;

    // Deduct cost and set cooldown
    player.gold -= NUKE_COST;
    missileSilo.cooldown = BUILDING_EFFECTS[BuildingType.MISSILE_SILO].cooldown;

    // Create missile
    const missile: Missile = {
      id: `missile-${Date.now()}`,
      playerId,
      startPosition: launchSite.position,
      targetPosition,
      launchTime: Date.now(),
      intercepted: false
    };

    this.gameState.missiles.set(missile.id, missile);

    // Check for SAM interception
    this.checkSamInterception(missile);

    return true;
  }

  private checkSamInterception(missile: Missile): void {
    // Find all SAM sites that could intercept this missile
    this.gameState.territories.forEach(territory => {
      if (territory.playerId === missile.playerId) return; // Can't intercept own missiles

      const samSites = territory.buildings.filter(b => 
        b.type === BuildingType.SAM_SITE && b.cooldown === 0
      );

      samSites.forEach(samSite => {
        const distanceToTarget = Math.abs(territory.position.x - missile.targetPosition.x) + 
                                Math.abs(territory.position.y - missile.targetPosition.y);
        
        if (distanceToTarget <= BUILDING_EFFECTS[BuildingType.SAM_SITE].interceptRadius) {
          missile.intercepted = true;
          samSite.cooldown = BUILDING_EFFECTS[BuildingType.SAM_SITE].cooldown;
        }
      });
    });
  }

  attackTerritory(playerId: string, targetTerritoryId: string, troopCount: number): boolean {
    const attacker = this.gameState.players.get(playerId);
    const targetTerritory = this.gameState.territories.get(targetTerritoryId);
    
    if (!attacker || !targetTerritory) return false;
    if (attacker.troops < troopCount) return false;
    if (targetTerritory.playerId === playerId) return false; // Can't attack own territory

    // Calculate combat result
    let attackPower = troopCount;
    let defensePower = targetTerritory.troops;

    // Apply terrain bonuses
    if (targetTerritory.terrain === TerrainType.MOUNTAINS) {
      defensePower *= 2; // Mountains provide defensive bonus
    }

    // Apply building bonuses
    const defensePosts = targetTerritory.buildings.filter(b => b.type === BuildingType.DEFENSE_POST);
    defensePower *= (1 + defensePosts.length * BUILDING_EFFECTS[BuildingType.DEFENSE_POST].defenseBonus);

    // Simple combat resolution
    const attackerWins = attackPower > defensePower;

    if (attackerWins) {
      // Attacker wins - capture territory
      const defender = this.gameState.players.get(targetTerritory.playerId);
      
      if (defender) {
        // Remove from defender's territories
        defender.territories = defender.territories.filter(id => id !== targetTerritoryId);
      }

      // Transfer to attacker
      targetTerritory.playerId = playerId;
      targetTerritory.troops = Math.floor(attackPower - defensePower);
      targetTerritory.buildings = []; // Destroy buildings in conquest
      
      attacker.territories.push(targetTerritoryId);
      attacker.troops -= troopCount;
    } else {
      // Defender wins
      targetTerritory.troops = Math.floor(defensePower - attackPower);
      attacker.troops -= troopCount;
    }

    // Update population counts
    attacker.population = attacker.workers + attacker.troops;
    
    if (targetTerritory.playerId) {
      const newOwner = this.gameState.players.get(targetTerritory.playerId);
      if (newOwner) {
        newOwner.population = newOwner.workers + newOwner.troops;
      }
    }

    return true;
  }

  requestAlliance(playerId: string, targetPlayerId: string): boolean {
    const player = this.gameState.players.get(playerId);
    const target = this.gameState.players.get(targetPlayerId);
    
    if (!player || !target) return false;
    if (player.alliances.includes(targetPlayerId)) return false;

    // For simplicity, auto-accept alliance requests
    player.alliances.push(targetPlayerId);
    target.alliances.push(playerId);
    
    return true;
  }

  breakAlliance(playerId: string, targetPlayerId: string): boolean {
    const player = this.gameState.players.get(playerId);
    const target = this.gameState.players.get(targetPlayerId);
    
    if (!player || !target) return false;

    player.alliances = player.alliances.filter(id => id !== targetPlayerId);
    target.alliances = target.alliances.filter(id => id !== playerId);
    
    return true;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  destroy(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }
}
