import React, { useRef, useEffect } from 'react';
import { GameRenderer } from '../lib/gameEngine';
import { useGameStore } from '../lib/stores/useGameStore';
import { socketClient } from '../lib/socketClient';

interface GameCanvasProps {
  onRendererReady: (renderer: GameRenderer) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onRendererReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const { gameState, localPlayerId, selectTerritory } = useGameStore();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize renderer
    rendererRef.current = new GameRenderer(canvasRef.current);
    rendererRef.current.setLocalPlayerId(localPlayerId);
    onRendererReady(rendererRef.current);

    // Handle territory clicks
    const handleTerritoryClick = (event: CustomEvent) => {
      selectTerritory(event.detail);
    };

    window.addEventListener('territory-click', handleTerritoryClick as EventListener);

    return () => {
      window.removeEventListener('territory-click', handleTerritoryClick as EventListener);
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, [localPlayerId, onRendererReady, selectTerritory]);

  useEffect(() => {
    if (rendererRef.current && gameState) {
      rendererRef.current.updateGameState(gameState);
    }
  }, [gameState]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setLocalPlayerId(localPlayerId);
    }
  }, [localPlayerId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none'
      }}
    />
  );
};
