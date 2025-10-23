import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '../lib/stores/useGameStore';
import { socketClient } from '../lib/socketClient';

export const PopulationSlider: React.FC = () => {
  const { gameState, localPlayerId, getLocalPlayer } = useGameStore();
  const localPlayer = getLocalPlayer();

  if (!localPlayer || !gameState) return null;

  const workerPercentage = localPlayer.population > 0 ? (localPlayer.workers / localPlayer.population) * 100 : 50;

  const handleSliderChange = (value: number[]) => {
    const newWorkerPercentage = value[0];
    const newWorkers = Math.floor((localPlayer.population * newWorkerPercentage) / 100);
    const newTroops = localPlayer.population - newWorkers;

    socketClient.sendAction({
      type: 'ALLOCATE_POPULATION',
      playerId: localPlayerId,
      data: { workers: newWorkers, troops: newTroops }
    });
  };

  return (
    <Card className="bg-black/80 text-white border-gray-700 min-w-[300px]">
      <CardContent className="p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-center">Population Allocation</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Workers: {localPlayer.workers}</span>
              <span>Troops: {localPlayer.troops}</span>
            </div>
            
            <Slider
              value={[workerPercentage]}
              onValueChange={handleSliderChange}
              max={100}
              min={0}
              step={1}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-gray-300">
              <span>All Workers</span>
              <span>All Troops</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-yellow-400 font-bold">{localPlayer.gold}💰</div>
              <div className="text-xs">Gold</div>
              <div className="text-xs text-gray-400">+{Math.floor(localPlayer.workers * 0.5)}/sec</div>
            </div>
            
            <div className="text-center">
              <div className="text-green-400 font-bold">{localPlayer.population}/{localPlayer.maxPopulation}</div>
              <div className="text-xs">Population</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
