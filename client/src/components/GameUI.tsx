import React, { useEffect } from 'react';
import { PopulationSlider } from './PopulationSlider';
import { BuildingPanel } from './BuildingPanel';
import { PlayerList } from './PlayerList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '../lib/stores/useGameStore';
import { socketClient } from '../lib/socketClient';
import { useAudio } from '../lib/stores/useAudio';
import { NUKE_COST } from '@shared/gameTypes';

export const GameUI: React.FC = () => {
  const { 
    gameState, 
    localPlayerId, 
    selectedTerritory, 
    toggleBuildingPanel,
    getSelectedTerritory,
    getLocalPlayer,
    nukeLaunchMode,
    nukeLaunchSiteId,
    setNukeLaunchMode
  } = useGameStore();
  
  const { toggleMute, isMuted } = useAudio();
  const territory = getSelectedTerritory();
  const localPlayer = getLocalPlayer();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'KeyB' && selectedTerritory) {
        toggleBuildingPanel();
      } else if (event.code === 'KeyM') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedTerritory, toggleBuildingPanel, toggleMute]);

  const attackTerritory = () => {
    if (!territory || !selectedTerritory || !localPlayer) return;
    
    // Calculate troops to send (half of available troops, minimum 1)
    const troopCount = Math.max(1, Math.floor(localPlayer.troops / 2));
    
    socketClient.sendAction({
      type: 'ATTACK_TERRITORY',
      playerId: localPlayerId,
      data: {
        targetTerritoryId: selectedTerritory,
        troopCount
      }
    });
  };

  const launchNuke = () => {
    if (!territory || !selectedTerritory || !nukeLaunchSiteId || !localPlayer) return;
    
    socketClient.sendAction({
      type: 'LAUNCH_NUKE',
      playerId: localPlayerId,
      data: {
        targetPosition: territory.position,
        launchSiteId: nukeLaunchSiteId
      }
    });
    
    // Exit nuke launch mode
    setNukeLaunchMode(false, null);
  };

  const cancelNukeLaunch = () => {
    setNukeLaunchMode(false, null);
  };

  if (!gameState || !localPlayer) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
        <Card className="bg-black/90 text-white border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-xl font-bold mb-2">Connecting to Game...</div>
              <div className="text-gray-400">Please wait while we find you a match</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Main Game UI */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <PopulationSlider />
      </div>

      {/* Player List */}
      <PlayerList />

      {/* Building Panel */}
      <BuildingPanel />

      {/* Nuke Launch Mode Overlay */}
      {nukeLaunchMode && (
        <div className="absolute inset-0 bg-red-900/30 pointer-events-none">
          <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-950/95 text-white border-red-700 pointer-events-auto">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold mb-2 text-red-400">⚠️ NUKE TARGETING ⚠️</div>
              <div className="text-sm mb-4">Click any territory to target</div>
              <div className="text-xs mb-4 text-gray-300">
                Cost: {NUKE_COST}💰 | Damage Radius: 2 tiles
              </div>
              <Button 
                onClick={cancelNukeLaunch}
                variant="outline"
                className="w-full"
              >
                Cancel Launch
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Territory Actions */}
      {territory && !nukeLaunchMode && (
        <Card className="absolute bottom-4 right-4 bg-black/90 text-white border-gray-700">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h4 className="font-bold text-sm">
                Territory ({territory.position.x}, {territory.position.y})
              </h4>
              
              <div className="text-xs text-gray-400">
                Owner: {gameState.players.get(territory.playerId)?.name || 'Unknown'}
              </div>
              
              <div className="text-xs text-gray-400">
                Troops: {territory.troops} | Terrain: {territory.terrain}
              </div>

              <div className="flex gap-2">
                {territory.playerId === localPlayerId ? (
                  <Button 
                    onClick={toggleBuildingPanel}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Build (B)
                  </Button>
                ) : (
                  <Button 
                    onClick={attackTerritory}
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    disabled={(localPlayer?.troops || 0) < 1}
                  >
                    Attack
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Nuke Target Confirmation */}
      {territory && nukeLaunchMode && (
        <Card className="absolute bottom-4 right-4 bg-red-950/95 text-white border-red-700">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-red-400">
                Target: ({territory.position.x}, {territory.position.y})
              </h4>
              
              <div className="text-xs text-gray-300">
                This will destroy all buildings and troops in a 2-tile radius
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={launchNuke}
                  size="sm"
                  variant="destructive"
                  className="flex-1 text-xs bg-red-700 hover:bg-red-800"
                  disabled={!localPlayer || localPlayer.gold < NUKE_COST}
                >
                  LAUNCH NUKE
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls Help */}
      <Card className="absolute top-4 right-4 bg-black/90 text-white border-gray-700 max-w-xs">
        <CardContent className="p-3">
          <div className="text-xs space-y-1">
            <div><strong>Controls:</strong></div>
            <div>Click territory to select</div>
            <div>B - Build menu</div>
            <div>M - Toggle sound</div>
            <div className="pt-2">
              <Button 
                onClick={toggleMute}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                Sound: {isMuted ? 'OFF' : 'ON'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Over Screen */}
      {gameState.winner && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <Card className="bg-black/90 text-white border-gray-700 max-w-md">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold mb-4 text-green-400">Game Over!</div>
              <div className="text-lg mb-4">
                Winner: {gameState.players.get(gameState.winner)?.name || 'Unknown'}
              </div>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Play Again
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
