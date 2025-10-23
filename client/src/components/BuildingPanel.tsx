import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '../lib/stores/useGameStore';
import { socketClient } from '../lib/socketClient';
import { BuildingType, BUILDING_COSTS, BUILDING_EFFECTS, TerrainType, NUKE_COST } from '@shared/gameTypes';

export const BuildingPanel: React.FC = () => {
  const { 
    showBuildingPanel, 
    toggleBuildingPanel, 
    selectedTerritory, 
    localPlayerId,
    getSelectedTerritory,
    canAffordBuilding,
    setNukeLaunchMode,
    getLocalPlayer
  } = useGameStore();

  const territory = getSelectedTerritory();
  const localPlayer = getLocalPlayer();

  if (!showBuildingPanel || !territory) return null;

  const canBuildPort = territory.terrain === TerrainType.COAST;
  const isMyTerritory = territory.playerId === localPlayerId;

  if (!isMyTerritory) {
    return (
      <Card className="absolute top-4 right-4 bg-black/90 text-white border-gray-700 max-w-sm">
        <CardContent className="p-4">
          <p className="text-center">This territory belongs to another player</p>
          <Button 
            onClick={toggleBuildingPanel}
            variant="outline"
            className="w-full mt-2"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  const buildBuilding = (buildingType: BuildingType) => {
    if (!territory || !canAffordBuilding(BUILDING_COSTS[buildingType])) return;

    socketClient.sendAction({
      type: 'BUILD_STRUCTURE',
      playerId: localPlayerId,
      data: {
        buildingType,
        territoryId: selectedTerritory
      }
    });
  };

  const initiateNukeLaunch = () => {
    if (!selectedTerritory || !localPlayer) return;
    
    // Check if player can afford nuke
    if (localPlayer.gold < NUKE_COST) {
      return;
    }
    
    // Check for missile silo in this territory
    const hasMissileSilo = territory?.buildings.some(b => 
      b.type === BuildingType.MISSILE_SILO && b.cooldown === 0
    );
    
    if (!hasMissileSilo) return;
    
    // Enter nuke launch mode
    setNukeLaunchMode(true, selectedTerritory);
    toggleBuildingPanel();
  };

  const BuildingButton: React.FC<{
    type: BuildingType;
    name: string;
    description: string;
    disabled?: boolean;
  }> = ({ type, name, description, disabled = false }) => (
    <Button
      onClick={() => buildBuilding(type)}
      disabled={disabled || !canAffordBuilding(BUILDING_COSTS[type])}
      variant="outline"
      className="w-full h-auto p-3 flex flex-col items-start"
    >
      <div className="flex justify-between w-full items-center mb-1">
        <span className="font-bold">{name}</span>
        <Badge variant="secondary">{BUILDING_COSTS[type]}💰</Badge>
      </div>
      <span className="text-xs text-left text-gray-300">{description}</span>
    </Button>
  );

  return (
    <Card className="absolute top-4 right-4 bg-black/90 text-white border-gray-700 max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Build Structures</CardTitle>
        <p className="text-xs text-gray-400">
          Territory ({territory.position.x}, {territory.position.y}) - {territory.troops} troops
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <BuildingButton
          type={BuildingType.CITY}
          name="City"
          description={`+${BUILDING_EFFECTS[BuildingType.CITY].populationIncrease} max population`}
        />
        
        <BuildingButton
          type={BuildingType.DEFENSE_POST}
          name="Defense Post"
          description={`+${BUILDING_EFFECTS[BuildingType.DEFENSE_POST].defenseBonus}x defense bonus`}
        />
        
        <BuildingButton
          type={BuildingType.PORT}
          name="Port"
          description={`+${BUILDING_EFFECTS[BuildingType.PORT].tradeIncome} gold/sec from trade`}
          disabled={!canBuildPort}
        />
        
        <BuildingButton
          type={BuildingType.MISSILE_SILO}
          name="Missile Silo"
          description="Launch nuclear missiles"
        />
        
        <BuildingButton
          type={BuildingType.SAM_SITE}
          name="SAM Site"
          description="Intercept incoming missiles"
        />
        
        {/* Existing buildings in this territory */}
        {territory.buildings.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <h4 className="text-sm font-bold mb-2">Buildings Here:</h4>
            <div className="space-y-2">
              {territory.buildings.map(building => (
                <div key={building.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="capitalize">{building.type.replace('_', ' ')}</span>
                    {building.cooldown > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        Cooldown: {Math.ceil(building.cooldown / 1000)}s
                      </Badge>
                    )}
                  </div>
                  
                  {/* Launch Nuke button for missile silos */}
                  {building.type === BuildingType.MISSILE_SILO && building.cooldown === 0 && (
                    <Button
                      onClick={initiateNukeLaunch}
                      disabled={!localPlayer || localPlayer.gold < NUKE_COST}
                      size="sm"
                      variant="destructive"
                      className="w-full text-xs"
                    >
                      Launch Nuke ({NUKE_COST}💰)
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-2 pt-3 border-t border-gray-700">
          <Button 
            onClick={toggleBuildingPanel}
            variant="outline"
            className="flex-1"
          >
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
