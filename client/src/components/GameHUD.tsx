import { difficultyLabel } from '@shared/gameplay';
import React, { useState } from 'react';
import { GameEvent, MapType, PlayerState, RoomState, MAP_INFO } from '@shared/types';
import { Heart, Shield, Zap, Flame, Trophy, Volume2, VolumeX, Clock, Wifi } from 'lucide-react';
import { soundManager } from '../engine/SoundEffects';

interface GameHUDProps {
  roomState: RoomState | null;
  myPlayer: PlayerState | undefined;
  killFeed: GameEvent[];
  ping: number;
  cinematic: boolean;
  onQualityChange: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ roomState, myPlayer, killFeed, ping, cinematic, onQualityChange }) => {
  const [audioEnabled, setAudioEnabled] = useState(true);

  if (!roomState) return null;

  const currentMap = MAP_INFO[roomState.mapType] || { name: 'Arena de Batalla' };
  const healthRatio = myPlayer ? Math.max(0, myPlayer.health / myPlayer.maxHealth) : 1;

  // Format time mm:ss
  const minutes = Math.floor(roomState.timeRemaining / 60);
  const seconds = roomState.timeRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    soundManager.enabled = next;
    soundManager.playClick();
  };

  // Find my rank
  const myRank = roomState.leaderboard.findIndex((e) => e.id === myPlayer?.id) + 1;

  return (
    <div className="hud-container" style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      zIndex: 20,
    }}>
      <button className="hud-quality-toggle" onClick={onQualityChange} title="Alternar calidad gráfica" aria-label={`Gráficos: ${cinematic ? 'Cine' : 'Rendimiento'}`} style={{ position: 'absolute', left: 16, top: 124, zIndex: 25, pointerEvents: 'auto', background: '#182637', border: '1px solid #43536a', borderRadius: 7, color: '#dce8f5', padding: '5px 8px', fontSize: 10, cursor: 'pointer' }}>
        {cinematic ? '◈ CINE' : '◇ RENDIMIENTO'}
      </button>
      {/* Top Row: Player Bar, Round Timer, Top Leaderboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        {/* Top-Left: Player Badge */}
        {myPlayer && (
          <div className="glass-panel hud-player-badge" style={{
            borderRadius: '16px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            minWidth: '220px',
            pointerEvents: 'auto',
          }}>
            {/* Color Avatar */}
            <div className="hud-avatar" style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: myPlayer.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: `0 0 14px ${myPlayer.color}88`,
              border: '2px solid rgba(255, 255, 255, 0.4)',
            }}>
              {myPlayer.character === 'robot' ? '🤖' :
               myPlayer.character === 'pirate' ? '🏴‍☠️' :
               myPlayer.character === 'ninja' ? '🥷' :
               myPlayer.character === 'astronaut' ? '👨‍🚀' :
               myPlayer.character === 'alien' ? '👾' : '🤠'}
            </div>

            {/* Name and Health Bar */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="hud-player-name" style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff' }}>
                  {myPlayer.name}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
                  {myPlayer.kills} Kills
                </span>
              </div>

              {/* Health Progress Bar */}
              <div style={{
                width: '100%',
                height: '12px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{
                  width: `${healthRatio * 100}%`,
                  height: '100%',
                  background: healthRatio > 0.5 ? 'linear-gradient(90deg, #10b981, #34d399)' :
                             healthRatio > 0.25 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                             'linear-gradient(90deg, #ef4444, #f87171)',
                  transition: 'width 0.2s ease-out',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                }} />
              </div>

              {/* Status Effect Banner (Poison, Burn, Paralysis) */}
              {myPlayer.statusEffect && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: myPlayer.statusEffect.type === 'poison' ? 'rgba(34, 197, 94, 0.25)' :
                             myPlayer.statusEffect.type === 'burn' ? 'rgba(239, 68, 68, 0.25)' :
                             myPlayer.statusEffect.type === 'freeze' ? 'rgba(14, 165, 233, 0.35)' :
                             'rgba(56, 189, 248, 0.25)',
                  color: myPlayer.statusEffect.type === 'poison' ? '#4ade80' :
                         myPlayer.statusEffect.type === 'burn' ? '#f87171' :
                         myPlayer.statusEffect.type === 'freeze' ? '#7dd3fc' : '#38bdf8',
                  border: `1px solid ${myPlayer.statusEffect.type === 'poison' ? '#22c55e' : myPlayer.statusEffect.type === 'burn' ? '#ef4444' : myPlayer.statusEffect.type === 'freeze' ? '#38bdf8' : '#38bdf8'}`,
                  marginTop: '2px',
                }}>
                  <span>
                    {myPlayer.statusEffect.type === 'poison' ? '🧪 ENVENENADO (Daño progresivo)' :
                     myPlayer.statusEffect.type === 'burn' ? '🔥 EN LLAMAS (Quemadura)' :
                     myPlayer.statusEffect.type === 'freeze' ? '❄️ CONGELADO (Inmóvil)' : '⚡ PARALIZADO (Inmóvil)'}
                  </span>
                  <span>({Math.ceil(myPlayer.statusEffect.timer)}s)</span>
                </div>
              )}

              {/* Active Power-up badge if any */}
              {myPlayer.powerUp && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: myPlayer.powerUp === 'shield' ? '#38bdf8' :
                         myPlayer.powerUp === 'speed' ? '#facc15' :
                         myPlayer.powerUp === 'boxing_gloves' ? '#ef4444' :
                         myPlayer.powerUp === 'jump_boots' ? '#fbbf24' : '#f43f5e',
                  marginTop: '2px',
                }}>
                  {myPlayer.powerUp === 'shield' && <Shield size={13} />}
                  {myPlayer.powerUp === 'speed' && <Zap size={13} />}
                  {myPlayer.powerUp === 'boxing_gloves' && <span>🥊</span>}
                  {myPlayer.powerUp === 'jump_boots' && <span>🥾</span>}
                  {myPlayer.powerUp === 'strength' && <Flame size={13} />}
                  <span>
                    {myPlayer.powerUp === 'shield' ? 'ESCUDO ACTIVO' :
                     myPlayer.powerUp === 'speed' ? 'SUPER VELOCIDAD' :
                     myPlayer.powerUp === 'boxing_gloves' ? 'GUANTES DE BOX (Daño x2)' :
                     myPlayer.powerUp === 'jump_boots' ? 'BOTAS DE SALTO (+75%)' : 'MEGA PUÑETAZO'}
                  </span>
                  <span>({Math.ceil(myPlayer.powerUpTimer)}s)</span>
                </div>
              )}

              {/* Special bomb ammo loaded */}
              {myPlayer.specialBombType && (myPlayer.specialBombAmmo ?? 0) > 0 && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: myPlayer.specialBombType === 'fire' ? '#f97316' :
                         myPlayer.specialBombType === 'poison' ? '#22c55e' :
                         myPlayer.specialBombType === 'paralysis' ? '#38bdf8' : '#ec4899',
                  marginTop: '2px',
                }}>
                  <span>
                    {myPlayer.specialBombType === 'fire' ? '🔥 BOMBA DE FUEGO' :
                     myPlayer.specialBombType === 'poison' ? '🧪 BOMBA DE VENENO' :
                     myPlayer.specialBombType === 'paralysis' ? '⚡ BOMBA DE PARÁLISIS' : '🟣 BOMBA PEGAJOSA'}
                  </span>
                  <span>x{myPlayer.specialBombAmmo}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top-Center: Match Timer, Arena Name & Tournament Fighters count */}
        <div className="glass-panel hud-timer-badge" style={{
          borderRadius: '16px',
          padding: '8px 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
        }}>
          <span style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#c084fc',
            fontWeight: 800,
          }}>
            {currentMap.name}
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '20px',
            fontWeight: 900,
            color: roomState.timeRemaining < 30 ? '#ef4444' : '#f8fafc',
          }} className={`hud-timer-time ${roomState.timeRemaining < 30 ? 'glow-pulse' : ''}`}>
            <Clock size={18} />
            <span>{timeFormatted}</span>
          </div>
          {/* Dragon Ball Torneo del Poder Alive count */}
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span>🥋</span>
            <span>{Object.values(roomState.players).filter(p => p.isAlive).length} / {Object.keys(roomState.players).length} EN PIE</span>
          </div>
        </div>

        <div className="adaptive-badge combat-desktop-help" style={{ position: 'absolute', top: 90, left: 16, fontSize: 11, color: '#a5f3fc', background: 'rgba(15,23,42,.85)', padding: '7px 10px', borderRadius: 10 }}>
          IA · {difficultyLabel(roomState.difficulty ?? 0.08)}
          {(myPlayer?.spawnGrace ?? 0) > 0 && <span> · Protección {Math.ceil(myPlayer!.spawnGrace!)} s</span>}
        </div>

        {/* Grab Escape / Tech Recovery QTE Banner */}
        {myPlayer?.isCarried && (
          <div
            style={{
              position: 'absolute',
              top: '36%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 150,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              background: myPlayer.techWindow ? 'rgba(5, 150, 105, 0.95)' : 'rgba(15, 23, 42, 0.94)',
              padding: '14px 28px',
              borderRadius: '20px',
              boxShadow: myPlayer.techWindow
                ? '0 0 35px rgba(16, 185, 129, 0.9), 0 0 15px #34d399'
                : '0 10px 30px rgba(0,0,0,0.7)',
              border: myPlayer.techWindow ? '3px solid #6ee7b7' : '2px solid rgba(255, 255, 255, 0.25)',
              transition: 'all 0.12s ease',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: myPlayer.techWindow ? '#a7f3d0' : '#f59e0b',
              }}
            >
              {myPlayer.techWindow ? '⚡ ¡ZONA DE ESCAPE ACTIVA! ⚡' : '⚠️ ¡HAS SIDO ATRAPADO!'}
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 950,
                color: '#ffffff',
                textAlign: 'center',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}
            >
              ¡PULSA <span style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '6px' }}>[ESPACIO]</span> O <span style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '6px' }}>[SALTAR]</span>!
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: myPlayer.techWindow ? '#ecfdf5' : '#cbd5e1',
                background: 'rgba(0,0,0,0.35)',
                padding: '3px 12px',
                borderRadius: '12px',
              }}
            >
              {myPlayer.techWindow ? '🎯 ¡ZÁFATE AHORA Y ATURDE AL RIVAL!' : '⏳ Espera a que brille en verde...'}
            </div>
          </div>
        )}

        {/* Top-Right: Leaderboard & Controls */}
        <div className="combat-leaderboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {/* Audio & Ping pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
            <div className="glass-panel" style={{
              borderRadius: '10px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#94a3b8',
            }}>
              <Wifi size={12} color={ping < 80 ? '#10b981' : '#f59e0b'} />
              <span>{ping} ms</span>
            </div>

            <button
              onClick={toggleAudio}
              className="glass-panel"
              style={{
                borderRadius: '10px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#f8fafc',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {audioEnabled ? <Volume2 size={14} color="#34d399" /> : <VolumeX size={14} color="#ef4444" />}
            </button>
          </div>

          {/* Leaderboard Table */}
          <div className="glass-panel hud-leaderboard-preview combat-leaderboard" style={{
            borderRadius: '16px',
            padding: '10px 14px',
            minWidth: '200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#f59e0b',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trophy size={13} />
                <span>TOP JUGADORES</span>
              </div>
              {myRank > 0 && <span>#{myRank}</span>}
            </div>

            {roomState.leaderboard.map((entry, idx) => {
              const isMe = entry.id === myPlayer?.id;
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    fontWeight: isMe ? 800 : 600,
                    color: isMe ? '#38bdf8' : '#e2e8f0',
                    background: isMe ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    padding: '2px 6px',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ opacity: 0.6, fontSize: '10px' }}>{idx + 1}.</span>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: entry.color,
                    }} />
                    <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, opacity: 0.9 }}>
                    {entry.kills} 💥
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {myPlayer?.heldBombId && (
        <div className="glass-panel" style={{ alignSelf: 'center', padding: '10px 20px', borderRadius: 14, background: '#9a3412', fontWeight: 800 }}>
          💣 {Math.max(0, roomState.bombs[myPlayer.heldBombId]?.fuse ?? 0).toFixed(1)} s · E / clic derecho: lanzar · Q: soltar
        </div>
      )}
      {/* Dynamic Carry / Grab Banner Notice */}
      {myPlayer?.carriedPlayerId && (
        <div className="glass-panel glow-pulse" style={{
          alignSelf: 'center',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.9) 0%, rgba(245, 158, 11, 0.9) 100%)',
          border: '2px solid #ffffff',
          borderRadius: '16px',
          padding: '10px 22px',
          fontSize: '15px',
          fontWeight: 900,
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(168, 85, 247, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'auto',
          marginTop: '-6px',
        }}>
          <span>🏋️‍♂️ ¡LLEVAS A UN RIVAL! ¡APUNTA Y LANZA CON [F] o [E]! TIENES 3 SEGUNDOS. 🚀</span>
        </div>
      )}

      {myPlayer?.isCarried && (
        <div className="glass-panel glow-pulse" style={{
          alignSelf: 'center',
          background: 'rgba(239, 68, 68, 0.9)',
          border: '2px solid #ffffff',
          borderRadius: '16px',
          padding: '10px 22px',
          fontSize: '15px',
          fontWeight: 900,
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'auto',
          marginTop: '-6px',
        }}>
          <span>⚠️ ¡UN RIVAL TE ESTÁ CARGANDO! ¡CUIDADO CON EL BORDE!</span>
        </div>
      )}

      {/* Middle-Right: Kill Feed */}
      <div className="hud-killfeed" style={{
        alignSelf: 'flex-end',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: '280px',
        marginRight: '8px',
      }}>
        {killFeed.slice(-4).map((kf, idx) => (
          <div
            key={idx}
            className="glass-panel animate-slide-in"
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(15, 23, 42, 0.85)',
              borderLeft: '3px solid #ef4444',
            }}
          >
            <span style={{ fontWeight: 800, color: '#f87171' }}>{kf.attackerName || 'Explosión'}</span>
            <span style={{ fontSize: '14px' }}>💥</span>
            <span style={{ color: '#cbd5e1' }}>{kf.victimName || 'Jugador'}</span>
          </div>
        ))}
      </div>

      <div className="combat-desktop-help" style={{ alignSelf: 'center', fontSize: 12, padding: 6, background: 'rgba(15,23,42,.8)', borderRadius: 8 }}>
        R: patada · Q: soltar · Menos vida = mayor empuje
      </div>
      {/* Bottom Center: Controls Bar (Desktop) */}
      <div className="combat-desktop-help" style={{
        alignSelf: 'center',
        display: 'flex',
        gap: '12px',
        pointerEvents: 'auto',
      }}>
        <div className="glass-panel" style={{
          borderRadius: '14px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '10px',
            }}>CLICK IZQ / J</span>
            <span>🥊 Combo ×3</span>
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '10px',
              color: '#ffffff',
              fontWeight: 900,
            }}>F</span>
            <span style={{ color: '#d8b4fe' }}>🏋️ Cargar Rival</span>
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '10px',
            }}>CLICK DER / E</span>
            <span>💣 Sacar / lanzar</span>
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '10px',
            }}>ESPACIO</span>
            <span>⬆️ Salto</span>
          </div>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '10px',
            }}>SHIFT</span>
            <span>⚡ Correr + puño: embestir</span>
          </div>
        </div>
      </div>
    </div>
  );
};
