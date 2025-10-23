import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameUI } from './components/GameUI';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from './lib/stores/useGameStore';
import { useAudio } from './lib/stores/useAudio';
import { socketClient } from './lib/socketClient';
import { GameRenderer } from './lib/gameEngine';
import '@fontsource/inter';

function App() {
  const [gameRenderer, setGameRenderer] = useState<GameRenderer | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [gameMode, setGameMode] = useState<'select' | 'multiplayer' | 'singleplayer'>('select');
  const [numBots, setNumBots] = useState(3);
  const [botDifficulties, setBotDifficulties] = useState<string[]>(['medium', 'medium', 'medium']);
  
  const {
    connected,
    gameState,
    setConnected,
    setGameState,
    setLocalPlayerId,
    setPlayerName: setStoreName
  } = useGameStore();

  const { 
    setBackgroundMusic, 
    setHitSound, 
    setSuccessSound,
    isMuted 
  } = useAudio();

  // Initialize audio
  useEffect(() => {
    const backgroundMusic = new Audio('/sounds/background.mp3');
    const hitSound = new Audio('/sounds/hit.mp3');
    const successSound = new Audio('/sounds/success.mp3');
    
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;
    
    setBackgroundMusic(backgroundMusic);
    setHitSound(hitSound);
    setSuccessSound(successSound);

    // Cleanup
    return () => {
      backgroundMusic.pause();
      hitSound.pause();
      successSound.pause();
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  // Handle socket events
  useEffect(() => {
    if (!connected) return;

    const handleGameState = (newGameState: any) => {
      // Convert Maps from JSON
      const gameStateWithMaps = {
        ...newGameState,
        players: new Map(Object.entries(newGameState.players || {})),
        territories: new Map(Object.entries(newGameState.territories || {})),
        missiles: new Map(Object.entries(newGameState.missiles || {}))
      };
      
      setGameState(gameStateWithMaps);
    };

    const handlePlayerJoined = (data: any) => {
      console.log('Player joined:', data);
    };

    const handlePlayerLeft = (data: any) => {
      console.log('Player left:', data);
    };

    const handleJoinFailed = (data: any) => {
      alert(data.reason || 'Failed to join game');
      setConnected(false);
      setShowNameInput(true);
      setGameMode('select');
    };

    socketClient.on('game_state', handleGameState);
    socketClient.on('player_joined', handlePlayerJoined);
    socketClient.on('player_left', handlePlayerLeft);
    socketClient.on('join_failed', handleJoinFailed);

    return () => {
      socketClient.off('game_state', handleGameState);
      socketClient.off('player_joined', handlePlayerJoined);
      socketClient.off('player_left', handlePlayerLeft);
      socketClient.off('join_failed', handleJoinFailed);
    };
  }, [connected, setGameState, setConnected]);

  const handleConnect = async () => {
    if (!playerName.trim()) return;
    
    setIsConnecting(true);
    
    try {
      await socketClient.connect();
      setConnected(true);
      setStoreName(playerName);
      setLocalPlayerId(socketClient.getSocketId());
      
      if (gameMode === 'singleplayer') {
        socketClient.joinGame(playerName, true, numBots, botDifficulties);
      } else {
        socketClient.joinGame(playerName, false);
      }
      setShowNameInput(false);
      
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to connect to game server');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBotDifficultyChange = (index: number, difficulty: string) => {
    const newDifficulties = [...botDifficulties];
    newDifficulties[index] = difficulty;
    setBotDifficulties(newDifficulties);
  };

  const handleNumBotsChange = (value: number) => {
    setNumBots(value);
    const newDifficulties = Array(value).fill('medium');
    botDifficulties.forEach((diff, i) => {
      if (i < value) newDifficulties[i] = diff;
    });
    setBotDifficulties(newDifficulties);
  };

  const handleRendererReady = useCallback((renderer: GameRenderer) => {
    setGameRenderer(renderer);
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Enter' && showNameInput && playerName.trim()) {
        handleConnect();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showNameInput, playerName]);

  if (showNameInput) {
    if (gameMode === 'select') {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          <Card className="w-full max-w-md mx-4 bg-black/90 text-white border-gray-700">
            <CardContent className="p-6">
              <div className="text-center space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-green-400 mb-2">Territory.io</h1>
                  <p className="text-gray-400">Multiplayer Strategy Game</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Player Name</label>
                    <Input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your name..."
                      className="bg-gray-800 border-gray-600 text-white"
                      maxLength={20}
                      autoFocus
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">Select Game Mode</label>
                    <Button 
                      onClick={() => setGameMode('singleplayer')}
                      disabled={!playerName.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Single Player (vs Bots)
                    </Button>
                    <Button 
                      onClick={() => setGameMode('multiplayer')}
                      disabled={!playerName.trim()}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Multiplayer
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Expand your territory by conquering adjacent tiles</p>
                  <p>• Build cities, defenses, and missile silos</p>
                  <p>• Form alliances and launch nuclear strikes</p>
                  <p>• Last player standing wins!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (gameMode === 'singleplayer') {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          <Card className="w-full max-w-md mx-4 bg-black/90 text-white border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-green-400 mb-2">Single Player</h1>
                  <p className="text-gray-400">Configure Bot Opponents</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Bots: {numBots}</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={numBots}
                      onChange={(e) => handleNumBotsChange(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">Bot Difficulties</label>
                    {Array.from({ length: numBots }).map((_, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm w-16">Bot {index + 1}:</span>
                        <select
                          value={botDifficulties[index] || 'medium'}
                          onChange={(e) => handleBotDifficultyChange(index, e.target.value)}
                          className="flex-1 bg-gray-800 border-gray-600 text-white rounded px-3 py-2"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="peaceful">Peaceful</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setGameMode('select')}
                      className="flex-1 bg-gray-600 hover:bg-gray-700"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isConnecting ? 'Starting...' : 'Start Game'}
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1 border-t border-gray-700 pt-4">
                  <p><strong>Easy:</strong> Slow and passive, good for beginners</p>
                  <p><strong>Medium:</strong> Balanced strategy and aggression</p>
                  <p><strong>Hard:</strong> Aggressive and strategic, challenging</p>
                  <p><strong>Peaceful:</strong> Defensive, only attacks if provoked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <Card className="w-full max-w-md mx-4 bg-black/90 text-white border-gray-700">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-green-400 mb-2">Multiplayer</h1>
                <p className="text-gray-400">Join Online Game</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setGameMode('select')}
                    className="flex-1 bg-gray-600 hover:bg-gray-700"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isConnecting ? 'Connecting...' : 'Join Game'}
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Play against other players online</p>
                <p>• Real-time multiplayer battles</p>
                <p>• Form alliances with other players</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!connected || !gameState) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <Card className="bg-black/90 text-white border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-xl font-bold mb-2">Connecting to Game Server...</div>
              <div className="text-gray-400">Finding players...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      <GameCanvas onRendererReady={handleRendererReady} />
      <GameUI />
    </div>
  );
}

export default App;
