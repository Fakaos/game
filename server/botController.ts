import { BotAI } from './botAI';
import { GameStateManager } from './gameState';
import { GameState, BotDifficulty } from '@shared/gameTypes';

export class BotController {
  private bots: Map<string, BotAI> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private gameManager: GameStateManager;

  constructor(gameManager: GameStateManager) {
    this.gameManager = gameManager;
  }

  addBot(difficulty: BotDifficulty): string {
    const botNames = {
      [BotDifficulty.EASY]: ['EasyBot', 'Newbie', 'Rookie', 'Amateur'],
      [BotDifficulty.MEDIUM]: ['MediumBot', 'Soldier', 'Warrior', 'Fighter'],
      [BotDifficulty.HARD]: ['HardBot', 'General', 'Commander', 'Strategist'],
      [BotDifficulty.PEACEFUL]: ['PeacefulBot', 'Diplomat', 'Pacifist', 'Neutral']
    };

    const nameList = botNames[difficulty];
    const baseName = nameList[Math.floor(Math.random() * nameList.length)];
    const botId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const botName = `${baseName} #${this.bots.size + 1}`;

    const player = this.gameManager.addPlayer(botId, botName);
    player.isBot = true;
    player.botDifficulty = difficulty;
    player.attackedBy = new Set();

    const bot = new BotAI(botId, difficulty, this.gameManager);
    this.bots.set(botId, bot);

    return botId;
  }

  removeBot(botId: string): void {
    this.bots.delete(botId);
    this.gameManager.removePlayer(botId);
  }

  startBotUpdates(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      const gameState = this.gameManager.getGameState();
      this.updateBots(gameState);
    }, 1000);
  }

  stopBotUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateBots(gameState: GameState): void {
    this.bots.forEach((bot, botId) => {
      const player = gameState.players.get(botId);
      if (!player || player.isEliminated) {
        this.bots.delete(botId);
        return;
      }

      bot.update(gameState);
    });
  }

  destroy(): void {
    this.stopBotUpdates();
    this.bots.clear();
  }

  getBotCount(): number {
    return this.bots.size;
  }

  hasBots(): boolean {
    return this.bots.size > 0;
  }
}
