import {
  GameState,
  Player,
  Territory,
  BotDifficulty,
  BuildingType,
  TerrainType,
  Position,
  BUILDING_COSTS,
  NUKE_COST
} from '@shared/gameTypes';
import { GameStateManager } from './gameState';

export class BotAI {
  private botId: string;
  private difficulty: BotDifficulty;
  private gameManager: GameStateManager;
  private lastActionTime: number = 0;
  private actionCooldown: number;

  constructor(botId: string, difficulty: BotDifficulty, gameManager: GameStateManager) {
    this.botId = botId;
    this.difficulty = difficulty;
    this.gameManager = gameManager;
    
    this.actionCooldown = this.getActionCooldown();
  }

  private getActionCooldown(): number {
    switch (this.difficulty) {
      case BotDifficulty.EASY:
        return 5000;
      case BotDifficulty.MEDIUM:
        return 3000;
      case BotDifficulty.HARD:
        return 2000;
      case BotDifficulty.PEACEFUL:
        return 4000;
      default:
        return 3000;
    }
  }

  update(gameState: GameState): void {
    const now = Date.now();
    if (now - this.lastActionTime < this.actionCooldown) return;

    const bot = gameState.players.get(this.botId);
    if (!bot || bot.isEliminated) return;

    this.lastActionTime = now;
    this.makeDecision(gameState, bot);
  }

  private makeDecision(gameState: GameState, bot: Player): void {
    this.allocateResources(bot);

    const strategies = [
      () => this.expandTerritory(gameState, bot),
      () => this.buildStructures(gameState, bot),
      () => this.attackEnemies(gameState, bot),
      () => this.useNukes(gameState, bot),
      () => this.manageAlliances(gameState, bot)
    ];

    const strategyWeights = this.getStrategyWeights(gameState, bot);
    
    for (let i = 0; i < strategies.length; i++) {
      if (Math.random() < strategyWeights[i]) {
        strategies[i]();
      }
    }
  }

  private getStrategyWeights(gameState: GameState, bot: Player): number[] {
    switch (this.difficulty) {
      case BotDifficulty.EASY:
        return [0.3, 0.2, 0.1, 0.0, 0.1];
      case BotDifficulty.MEDIUM:
        return [0.5, 0.4, 0.3, 0.1, 0.2];
      case BotDifficulty.HARD:
        return [0.7, 0.6, 0.5, 0.3, 0.3];
      case BotDifficulty.PEACEFUL:
        const wasAttacked = bot.attackedBy && bot.attackedBy.size > 0;
        return [0.4, 0.3, wasAttacked ? 0.4 : 0.0, 0.0, 0.3];
      default:
        return [0.4, 0.3, 0.2, 0.1, 0.2];
    }
  }

  private allocateResources(bot: Player): void {
    const workerRatio = this.difficulty === BotDifficulty.HARD ? 0.4 : 
                       this.difficulty === BotDifficulty.PEACEFUL ? 0.6 : 0.5;
    
    const workers = Math.floor(bot.population * workerRatio);
    const troops = bot.population - workers;

    this.gameManager.allocatePopulation(this.botId, workers, troops);
  }

  private expandTerritory(gameState: GameState, bot: Player): void {
    if (bot.territories.length === 0) return;

    const expandableTerritories = this.findExpandableTerritories(gameState, bot);
    if (expandableTerritories.length === 0) return;

    const target = expandableTerritories[Math.floor(Math.random() * expandableTerritories.length)];
    const troopCount = this.calculateAttackTroops(bot, target);

    if (troopCount > 0) {
      this.gameManager.attackTerritory(this.botId, target.id, troopCount);
    }
  }

  private findExpandableTerritories(gameState: GameState, bot: Player): Territory[] {
    const expandable: Territory[] = [];
    const botTerritories = bot.territories.map(id => gameState.territories.get(id)).filter(Boolean) as Territory[];

    botTerritories.forEach(territory => {
      const adjacent = this.getAdjacentTerritories(gameState, territory.position);
      adjacent.forEach(adj => {
        if (adj.playerId === '' || (adj.playerId !== this.botId && !bot.alliances.includes(adj.playerId))) {
          expandable.push(adj);
        }
      });
    });

    return expandable;
  }

  private getAdjacentTerritories(gameState: GameState, position: Position): Territory[] {
    const adjacent: Territory[] = [];
    const directions = [
      { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: 1, y: 0 }, { x: -1, y: 0 }
    ];

    directions.forEach(dir => {
      const newPos = { x: position.x + dir.x, y: position.y + dir.y };
      const territoryId = `${newPos.x}-${newPos.y}`;
      const territory = gameState.territories.get(territoryId);
      
      if (territory && territory.terrain !== TerrainType.WATER) {
        adjacent.push(territory);
      }
    });

    return adjacent;
  }

  private calculateAttackTroops(bot: Player, target: Territory): number {
    const defensePower = target.troops * (target.terrain === TerrainType.MOUNTAINS ? 2 : 1);
    const neededTroops = Math.ceil(defensePower * 1.5);
    
    const availableTroops = bot.troops;
    const maxCommit = Math.floor(availableTroops * 0.4);

    return Math.min(neededTroops, maxCommit);
  }

  private buildStructures(gameState: GameState, bot: Player): void {
    if (bot.gold < 50) return;

    const buildPriority = this.getBuildingPriority(gameState, bot);
    
    for (const buildingType of buildPriority) {
      if (bot.gold < BUILDING_COSTS[buildingType]) continue;

      const territory = this.findBuildLocation(gameState, bot, buildingType);
      if (territory) {
        this.gameManager.buildStructure(this.botId, buildingType, territory.id);
        break;
      }
    }
  }

  private getBuildingPriority(gameState: GameState, bot: Player): BuildingType[] {
    switch (this.difficulty) {
      case BotDifficulty.EASY:
        return [BuildingType.CITY, BuildingType.DEFENSE_POST];
      case BotDifficulty.MEDIUM:
        return [BuildingType.CITY, BuildingType.DEFENSE_POST, BuildingType.PORT];
      case BotDifficulty.HARD:
        return [BuildingType.CITY, BuildingType.MISSILE_SILO, BuildingType.SAM_SITE, BuildingType.DEFENSE_POST, BuildingType.PORT];
      case BotDifficulty.PEACEFUL:
        return [BuildingType.CITY, BuildingType.SAM_SITE, BuildingType.DEFENSE_POST, BuildingType.PORT];
      default:
        return [BuildingType.CITY, BuildingType.DEFENSE_POST];
    }
  }

  private findBuildLocation(gameState: GameState, bot: Player, buildingType: BuildingType): Territory | null {
    const botTerritories = bot.territories
      .map(id => gameState.territories.get(id))
      .filter(Boolean) as Territory[];

    const suitable = botTerritories.filter(territory => {
      if (buildingType === BuildingType.PORT && territory.terrain !== TerrainType.COAST) {
        return false;
      }
      
      if (territory.buildings.some(b => b.type === buildingType)) {
        return false;
      }
      
      return true;
    });

    return suitable.length > 0 ? suitable[Math.floor(Math.random() * suitable.length)] : null;
  }

  private attackEnemies(gameState: GameState, bot: Player): void {
    if (this.difficulty === BotDifficulty.PEACEFUL) {
      if (!bot.attackedBy || bot.attackedBy.size === 0) return;
    }

    if (bot.troops < 10) return;

    const enemies = this.findEnemies(gameState, bot);
    if (enemies.length === 0) return;

    const target = this.selectTarget(enemies, bot);
    if (!target) return;

    const troopCount = this.calculateAttackTroops(bot, target);
    if (troopCount > 0) {
      this.gameManager.attackTerritory(this.botId, target.id, troopCount);
    }
  }

  private findEnemies(gameState: GameState, bot: Player): Territory[] {
    const enemies: Territory[] = [];
    const botTerritories = bot.territories.map(id => gameState.territories.get(id)).filter(Boolean) as Territory[];

    botTerritories.forEach(territory => {
      const adjacent = this.getAdjacentTerritories(gameState, territory.position);
      adjacent.forEach(adj => {
        if (adj.playerId && adj.playerId !== this.botId && !bot.alliances.includes(adj.playerId)) {
          if (this.difficulty === BotDifficulty.PEACEFUL) {
            if (bot.attackedBy && bot.attackedBy.has(adj.playerId)) {
              enemies.push(adj);
            }
          } else {
            enemies.push(adj);
          }
        }
      });
    });

    return enemies;
  }

  private selectTarget(enemies: Territory[], bot: Player): Territory | null {
    if (enemies.length === 0) return null;

    enemies.sort((a, b) => {
      const scoreA = this.evaluateTarget(a, bot);
      const scoreB = this.evaluateTarget(b, bot);
      return scoreB - scoreA;
    });

    return enemies[0];
  }

  private evaluateTarget(territory: Territory, bot: Player): number {
    let score = 0;
    
    score -= territory.troops * 2;
    
    if (territory.terrain === TerrainType.PLAINS) score += 10;
    if (territory.terrain === TerrainType.COAST) score += 5;
    
    score += territory.buildings.length * 5;
    
    if (this.difficulty === BotDifficulty.PEACEFUL && bot.attackedBy?.has(territory.playerId)) {
      score += 50;
    }
    
    return score;
  }

  private useNukes(gameState: GameState, bot: Player): void {
    if (this.difficulty === BotDifficulty.PEACEFUL || this.difficulty === BotDifficulty.EASY) return;
    if (bot.gold < NUKE_COST) return;

    const missileSilos = bot.buildings.filter(b => b.type === BuildingType.MISSILE_SILO && b.cooldown === 0);
    if (missileSilos.length === 0) return;

    const targets = this.findNukeTargets(gameState, bot);
    if (targets.length === 0) return;

    const target = targets[Math.floor(Math.random() * targets.length)];
    const silo = missileSilos[0];
    const siloTerritory = bot.territories.find(id => {
      const t = gameState.territories.get(id);
      return t && t.position.x === silo.position.x && t.position.y === silo.position.y;
    });

    if (siloTerritory) {
      this.gameManager.launchNuke(this.botId, target.position, siloTerritory);
    }
  }

  private findNukeTargets(gameState: GameState, bot: Player): Territory[] {
    const targets: Territory[] = [];
    
    gameState.territories.forEach(territory => {
      if (territory.playerId && territory.playerId !== this.botId && !bot.alliances.includes(territory.playerId)) {
        if (territory.troops > 20 || territory.buildings.length > 2) {
          targets.push(territory);
        }
      }
    });

    return targets;
  }

  private manageAlliances(gameState: GameState, bot: Player): void {
    if (this.difficulty === BotDifficulty.EASY) return;

    const alivePlayers = Array.from(gameState.players.values()).filter(p => 
      !p.isEliminated && p.id !== this.botId && !p.isBot
    );

    if (alivePlayers.length === 0) return;

    if (bot.alliances.length === 0 && Math.random() < 0.3) {
      const potential = alivePlayers.filter(p => !bot.alliances.includes(p.id));
      if (potential.length > 0) {
        const target = potential[Math.floor(Math.random() * potential.length)];
        this.gameManager.requestAlliance(this.botId, target.id);
      }
    }
  }
}
