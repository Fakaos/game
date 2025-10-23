import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '../lib/stores/useGameStore';
import { socketClient } from '../lib/socketClient';

export const PlayerList: React.FC = () => {
  const { gameState, localPlayerId, getLocalPlayer } = useGameStore();

  if (!gameState) return null;

  const localPlayer = getLocalPlayer();
  const players = Array.from(gameState.players.values()).filter(p => !p.isEliminated);

  const requestAlliance = (targetPlayerId: string) => {
    socketClient.sendAction({
      type: 'REQUEST_ALLIANCE',
      playerId: localPlayerId,
      data: { targetPlayerId }
    });
  };

  const breakAlliance = (targetPlayerId: string) => {
    socketClient.sendAction({
      type: 'BREAK_ALLIANCE',
      playerId: localPlayerId,
      data: { targetPlayerId }
    });
  };

  return (
    <Card className="absolute top-4 left-4 bg-black/90 text-white border-gray-700 min-w-[250px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Players ({players.length})</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
        {players.map(player => {
          const isLocal = player.id === localPlayerId;
          const isAlly = localPlayer?.alliances.includes(player.id) || false;
          const territoryCount = player.territories.length;
          
          return (
            <div 
              key={player.id}
              className="flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: player.color }}
                />
                <div>
                  <div className="font-bold text-sm">
                    {player.name} {isLocal && '(You)'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {territoryCount} territories | Pop: {player.population}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                {isAlly && (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                    Allied
                  </Badge>
                )}
                
                {!isLocal && (
                  <Button
                    onClick={() => isAlly ? breakAlliance(player.id) : requestAlliance(player.id)}
                    size="sm"
                    variant={isAlly ? "destructive" : "outline"}
                    className="text-xs h-6 px-2"
                  >
                    {isAlly ? 'Break' : 'Ally'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        
        {gameState.winner && (
          <div className="mt-4 p-3 bg-green-900/50 border border-green-700 rounded text-center">
            <div className="text-lg font-bold text-green-400">Game Over!</div>
            <div className="text-sm">
              Winner: {gameState.players.get(gameState.winner)?.name || 'Unknown'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
