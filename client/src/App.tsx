import { updateProfile } from './state/PlayerProfile';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CharacterType, GameEvent, PlayerState, RoomState } from '@shared/types';
import { GameEngine } from './engine/GameEngine';
import { StartScreen } from './components/StartScreen';
import { GameHUD } from './components/GameHUD';
import { DeathScreen } from './components/DeathScreen';
import { RoundEndModal } from './components/RoundEndModal';
import { MobileControls } from './components/MobileControls';
import { LandscapeOrientationModal } from './components/LandscapeOrientationModal';

import { isMobileDevice } from './utils/device';

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [isInGame, setIsInGame] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myPlayer, setMyPlayer] = useState<PlayerState | undefined>(undefined);
  const [killFeed, setKillFeed] = useState<GameEvent[]>([]);
  const [ping, setPing] = useState(0);
  const [cinematic, setCinematic] = useState(!isMobileDevice() && window.innerWidth > 900);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!isInGame) return;
    let accumulated = 0;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const player = engineRef.current?.getMyPlayer();
      if (!document.hidden && player?.isAlive && engineRef.current?.currentRoomState?.roundState === 'playing') accumulated += Math.min(2, (now - last) / 1000);
      last = now;
      if (accumulated >= 10) { updateProfile({ experienceSeconds: accumulated }); accumulated = 0; }
    }, 1000);
    return () => { clearInterval(timer); if (accumulated > 0) updateProfile({ experienceSeconds: accumulated }); };
  }, [isInGame]);

  const handleStartPlay = (name: string, character: CharacterType, color: string) => {
    if (!containerRef.current) return;
    setIsConnecting(true);

    // Initialize GameEngine
    if (engineRef.current) {
      engineRef.current.destroy();
    }

    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;
    engine.setGraphicsQuality(cinematic);

    engine.onConnected = () => {
      setIsConnecting(false);
      setIsInGame(true);

      updateProfile({ matches: 1 });
    };

    engine.onStateUpdate = (state, localPlayer) => {
      setRoomState(state);
      setMyPlayer(localPlayer);
      setPing(engine.ping);
    };

    engine.onKillFeed = (event) => {
      setKillFeed((prev) => [...prev.slice(-6), event]);

      if (event.attackerId === engine.myPlayerId && event.victimId !== engine.myPlayerId) updateProfile({ kills: 1, score: 100 });
    };

    engine.onDisconnected = () => {
      setIsInGame(false);
      setIsConnecting(false);
    };

    // Connect into match
    engine.connect(name, character, color);
  };

  const handleRespawn = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.respawnNow();
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100dvh', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />

      {/* Start Screen / Instant Entrance */}
      {!isInGame && (
        <StartScreen onPlay={handleStartPlay} isConnecting={isConnecting} />
      )}

      {/* In-Game HUD & Modals */}
      {isInGame && roomState && (
        <>
          <GameHUD
            roomState={roomState}
            myPlayer={myPlayer}
            killFeed={killFeed}
            ping={ping}
            cinematic={cinematic}
            onQualityChange={() => { setCinematic(!cinematic); engineRef.current?.setGraphicsQuality(!cinematic); }}
          />

          {/* Touch Joystick & Actions for Mobile */}
          {engineRef.current && (
            <MobileControls
              inputManager={engineRef.current.inputManager}
              isCarryingOpponent={!!myPlayer?.carriedPlayerId}
              isHoldingBomb={!!myPlayer?.heldBombId}
            />
          )}

          {/* Quick Death / Respawn Screen */}
          {myPlayer && !myPlayer.isAlive && (
            <DeathScreen onRespawn={handleRespawn} />
          )}

          {/* Round End Podium Celebration */}
          {roomState.roundState === 'round_over' && (
            <RoundEndModal leaderboard={roomState.leaderboard} />
          )}
        </>
      )}

      {/* Landscape Orientation Prompt for Mobile devices */}
      <LandscapeOrientationModal />
    </div>
  );
};
