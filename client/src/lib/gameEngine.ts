import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import { GameState, Territory, Player, Building, Missile, TerrainType, BuildingType, Position, MISSILE_TRAVEL_TIME } from '@shared/gameTypes';

export class GameRenderer {
  private app: Application | null = null;
  private gameContainer: Container;
  private territoryContainer: Container;
  private buildingContainer: Container;
  private missileContainer: Container;
  private uiContainer: Container;
  
  private tileSize: number = 32;
  private gameState: GameState | null = null;
  private localPlayerId: string = '';
  private canvas: HTMLCanvasElement;
  private isInitialized: boolean = false;
  private boundHandleResize: () => void;
  private animationFrameId: number | null = null;
  private missileClientStartTimes: Map<string, number> = new Map(); // Track when we first saw each missile
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Create containers
    this.gameContainer = new Container();
    this.territoryContainer = new Container();
    this.buildingContainer = new Container();
    this.missileContainer = new Container();
    this.uiContainer = new Container();

    this.gameContainer.addChild(this.territoryContainer);
    this.gameContainer.addChild(this.buildingContainer);
    this.gameContainer.addChild(this.missileContainer);

    // Bind resize handler
    this.boundHandleResize = this.handleResize.bind(this);

    // Initialize PixiJS asynchronously
    this.initializePixi();
  }

  private async initializePixi(): Promise<void> {
    this.app = new Application();
    
    await this.app.init({
      canvas: this.canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a1a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    
    this.app.stage.addChild(this.gameContainer);
    this.app.stage.addChild(this.uiContainer);

    // Handle window resize
    window.addEventListener('resize', this.boundHandleResize);
    
    this.isInitialized = true;
    
    // Start animation loop for missile updates
    this.startAnimationLoop();
    
    // Render if we already have game state
    if (this.gameState) {
      this.render();
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      if (this.gameState && this.gameState.missiles.size > 0) {
        // Only re-render missiles when there are active missiles
        this.renderMissiles();
      }
      
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private handleResize(): void {
    if (!this.app) return;
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.centerCamera();
  }

  private centerCamera(): void {
    if (!this.gameState || !this.app) return;
    
    const centerX = (this.gameState.mapWidth * this.tileSize) / 2;
    const centerY = (this.gameState.mapHeight * this.tileSize) / 2;
    
    this.gameContainer.x = this.app.screen.width / 2 - centerX;
    this.gameContainer.y = this.app.screen.height / 2 - centerY;
  }

  setLocalPlayerId(playerId: string): void {
    this.localPlayerId = playerId;
  }

  updateGameState(gameState: GameState): void {
    this.gameState = gameState;
    if (this.isInitialized) {
      this.render();
    }
  }

  private render(): void {
    if (!this.gameState || !this.app) return;

    this.renderTerritories();
    this.renderBuildings();
    this.renderMissiles();
    this.centerCamera();
  }

  private renderTerritories(): void {
    this.territoryContainer.removeChildren();
    
    this.gameState!.territories.forEach((territory, territoryId) => {
      const tileGraphics = new Graphics();
      
      // Get player color
      const player = this.gameState!.players.get(territory.playerId);
      const color = player ? parseInt(player.color.replace('#', ''), 16) : 0x666666;
      
      // Base territory color
      tileGraphics.beginFill(color, 0.7);
      tileGraphics.lineStyle(1, 0xffffff, 0.3);
      tileGraphics.drawRect(0, 0, this.tileSize, this.tileSize);
      tileGraphics.endFill();
      
      // Terrain overlay
      this.renderTerrainOverlay(tileGraphics, territory.terrain);
      
      // Position the tile
      tileGraphics.x = territory.position.x * this.tileSize;
      tileGraphics.y = territory.position.y * this.tileSize;
      
      // Add troop count text
      if (territory.troops > 0) {
        const troopText = new Text(territory.troops.toString(), {
          fontSize: 12,
          fill: 0xffffff,
          fontWeight: 'bold'
        });
        troopText.anchor.set(0.5);
        troopText.x = this.tileSize / 2;
        troopText.y = this.tileSize / 2;
        tileGraphics.addChild(troopText);
      }
      
      // Make interactive
      tileGraphics.interactive = true;
      tileGraphics.buttonMode = true;
      tileGraphics.on('click', () => this.onTerritoryClick(territoryId));
      
      this.territoryContainer.addChild(tileGraphics);
    });
  }

  private renderTerrainOverlay(graphics: Graphics, terrain: TerrainType): void {
    switch (terrain) {
      case TerrainType.MOUNTAINS:
        graphics.beginFill(0x8b4513, 0.5);
        graphics.drawPolygon([
          this.tileSize * 0.2, this.tileSize * 0.8,
          this.tileSize * 0.5, this.tileSize * 0.2,
          this.tileSize * 0.8, this.tileSize * 0.8
        ]);
        graphics.endFill();
        break;
      case TerrainType.WATER:
        graphics.beginFill(0x0077be, 0.8);
        graphics.drawRect(0, 0, this.tileSize, this.tileSize);
        graphics.endFill();
        break;
      case TerrainType.COAST:
        graphics.beginFill(0x0077be, 0.4);
        graphics.drawRect(0, this.tileSize * 0.7, this.tileSize, this.tileSize * 0.3);
        graphics.endFill();
        break;
    }
  }

  private renderBuildings(): void {
    this.buildingContainer.removeChildren();
    
    this.gameState!.players.forEach(player => {
      player.buildings.forEach(building => {
        const buildingGraphics = this.createBuildingGraphics(building);
        buildingGraphics.x = building.position.x * this.tileSize + this.tileSize * 0.7;
        buildingGraphics.y = building.position.y * this.tileSize + this.tileSize * 0.1;
        this.buildingContainer.addChild(buildingGraphics);
      });
    });
  }

  private createBuildingGraphics(building: Building): Graphics {
    const graphics = new Graphics();
    const size = this.tileSize * 0.25;
    
    switch (building.type) {
      case BuildingType.CITY:
        graphics.beginFill(0xffff00);
        graphics.drawRect(0, 0, size, size);
        graphics.endFill();
        break;
      case BuildingType.DEFENSE_POST:
        graphics.beginFill(0xff0000);
        graphics.drawCircle(size/2, size/2, size/2);
        graphics.endFill();
        break;
      case BuildingType.PORT:
        graphics.beginFill(0x00ffff);
        graphics.drawPolygon([0, size, size/2, 0, size, size]);
        graphics.endFill();
        break;
      case BuildingType.MISSILE_SILO:
        graphics.beginFill(0xff00ff);
        graphics.drawRect(0, 0, size, size);
        graphics.endFill();
        break;
      case BuildingType.SAM_SITE:
        graphics.beginFill(0x00ff00);
        graphics.drawCircle(size/2, size/2, size/2);
        graphics.endFill();
        break;
    }
    
    // Cooldown indicator
    if (building.cooldown > 0) {
      graphics.beginFill(0x000000, 0.5);
      graphics.drawRect(0, 0, size, size);
      graphics.endFill();
    }
    
    return graphics;
  }

  private renderMissiles(): void {
    this.missileContainer.removeChildren();
    
    const now = Date.now();
    const currentMissileIds = new Set<string>();
    
    this.gameState!.missiles.forEach(missile => {
      if (missile.intercepted) return;
      
      currentMissileIds.add(missile.id);
      
      // Track client-side start time for each missile to avoid clock skew
      if (!this.missileClientStartTimes.has(missile.id)) {
        this.missileClientStartTimes.set(missile.id, now);
      }
      
      const clientStartTime = this.missileClientStartTimes.get(missile.id)!;
      const progress = Math.min(1, (now - clientStartTime) / MISSILE_TRAVEL_TIME);
      
      const currentX = missile.startPosition.x + (missile.targetPosition.x - missile.startPosition.x) * progress;
      const currentY = missile.startPosition.y + (missile.targetPosition.y - missile.startPosition.y) * progress;
      
      // Draw trajectory line
      const trajectoryGraphics = new Graphics();
      trajectoryGraphics.lineStyle(1, 0xff4444, 0.3);
      trajectoryGraphics.moveTo(missile.startPosition.x * this.tileSize + this.tileSize / 2, 
                                missile.startPosition.y * this.tileSize + this.tileSize / 2);
      trajectoryGraphics.lineTo(missile.targetPosition.x * this.tileSize + this.tileSize / 2, 
                                missile.targetPosition.y * this.tileSize + this.tileSize / 2);
      this.missileContainer.addChild(trajectoryGraphics);
      
      // Draw missile
      const missileGraphics = new Graphics();
      missileGraphics.beginFill(0xff0000);
      missileGraphics.drawCircle(0, 0, 6);
      missileGraphics.endFill();
      
      // Add glow effect
      missileGraphics.beginFill(0xff4444, 0.5);
      missileGraphics.drawCircle(0, 0, 10);
      missileGraphics.endFill();
      
      missileGraphics.x = currentX * this.tileSize + this.tileSize / 2;
      missileGraphics.y = currentY * this.tileSize + this.tileSize / 2;
      
      this.missileContainer.addChild(missileGraphics);
      
      // Draw target indicator
      if (progress < 1) {
        const targetGraphics = new Graphics();
        targetGraphics.lineStyle(2, 0xff0000, 0.5);
        targetGraphics.drawCircle(missile.targetPosition.x * this.tileSize + this.tileSize / 2, 
                                  missile.targetPosition.y * this.tileSize + this.tileSize / 2, 
                                  this.tileSize * 2);
        this.missileContainer.addChild(targetGraphics);
      }
    });
    
    // Clean up tracking for missiles that no longer exist
    for (const [id] of this.missileClientStartTimes) {
      if (!currentMissileIds.has(id)) {
        this.missileClientStartTimes.delete(id);
      }
    }
  }

  private onTerritoryClick(territoryId: string): void {
    // Emit event for territory selection
    const event = new CustomEvent('territory-click', { detail: territoryId });
    window.dispatchEvent(event);
  }

  worldToScreen(worldPos: Position): Position {
    return {
      x: worldPos.x * this.tileSize + this.gameContainer.x,
      y: worldPos.y * this.tileSize + this.gameContainer.y
    };
  }

  screenToWorld(screenPos: Position): Position {
    return {
      x: Math.floor((screenPos.x - this.gameContainer.x) / this.tileSize),
      y: Math.floor((screenPos.y - this.gameContainer.y) / this.tileSize)
    };
  }

  destroy(): void {
    window.removeEventListener('resize', this.boundHandleResize);
    
    // Cancel animation loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.app) {
      this.app.destroy(true, true);
    }
  }
}
