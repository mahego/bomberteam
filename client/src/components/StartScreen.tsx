import React, { useState, useEffect } from 'react';
import { CharacterType } from '@shared/types';
import { soundManager } from '../engine/SoundEffects';
import { Sparkles, Dices, Trophy, Swords, Zap, Volume2, VolumeX } from 'lucide-react';

interface StartScreenProps {
  onPlay: (name: string, character: CharacterType, color: string) => void;
  isConnecting: boolean;
}

const CHARACTERS: Array<{ id: CharacterType; name: string; icon: string; desc: string }> = [
  { id: 'robot', name: 'Robot', icon: '🤖', desc: 'Chasis de titanio con visor láser' },
  { id: 'pirate', name: 'Pirata', icon: '🏴‍☠️', desc: 'Lobo de mar con tricornio audaz' },
  { id: 'ninja', name: 'Ninja', icon: '🥷', desc: 'Maestro sigiloso del golpe certero' },
  { id: 'astronaut', name: 'Astronauta', icon: '👨‍🚀', desc: 'Explorador estelar con casco gravitatorio' },
  { id: 'alien', name: 'Alienígena', icon: '👾', desc: 'Criatura cósmica con antenas saltarinas' },
  { id: 'explorer', name: 'Explorador', icon: '🤠', desc: 'Aventurero intrépido de ruinas' },
];

const COLORS = [
  { hex: '#3b82f6', name: 'Azul Neón' },
  { hex: '#10b981', name: 'Verde Esmeralda' },
  { hex: '#ec4899', name: 'Rosa Neón' },
  { hex: '#f59e0b', name: 'Ámbar Fuego' },
  { hex: '#8b5cf6', name: 'Púrpura Místico' },
  { hex: '#ef4444', name: 'Rojo Furia' },
];

const FUN_NAMES = [
  'BombasticCat', 'NitroNinja', 'KaboomKing', 'BlastMaster',
  'SparkyPug', 'DynamoFox', 'RocketRaccoon', 'TurboTiger',
  'MegaBoomer', 'AtomicPanda', 'SonicStrike', 'BlazeWolf'
];

export const StartScreen: React.FC<StartScreenProps> = ({ onPlay, isConnecting }) => {
  const [name, setName] = useState('');
  const [character, setCharacter] = useState<CharacterType>('robot');
  const [color, setColor] = useState('#3b82f6');
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Anonymous local storage progression
  const [stats, setStats] = useState({ kills: 0, matches: 0, score: 0 });

  useEffect(() => {
    // Load or generate name
    const savedName = localStorage.getItem('bomber_player_name');
    if (savedName) {
      setName(savedName);
    } else {
      randomizeName();
    }

    const savedChar = localStorage.getItem('bomber_character') as CharacterType;
    if (savedChar) setCharacter(savedChar);

    const savedColor = localStorage.getItem('bomber_color');
    if (savedColor) setColor(savedColor);

    const savedStats = localStorage.getItem('bomber_stats');
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {}
    }
  }, []);

  const randomizeName = () => {
    soundManager.playClick();
    const random = FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];
    setName(random);
  };

  const handlePlaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();

    const finalName = name.trim() || 'Bomber_' + Math.floor(Math.random() * 1000);
    localStorage.setItem('bomber_player_name', finalName);
    localStorage.setItem('bomber_character', character);
    localStorage.setItem('bomber_color', color);

    onPlay(finalName, character, color);
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    soundManager.enabled = next;
    soundManager.playClick();
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1e1b4b 0%, #090d16 100%)',
      zIndex: 50,
      padding: '16px',
    }}>
      {/* Background animated floating bombs */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: 0.15,
      }}>
        <div style={{ position: 'absolute', top: '10%', left: '8%', fontSize: '72px' }} className="animate-float">💣</div>
        <div style={{ position: 'absolute', top: '75%', left: '15%', fontSize: '84px' }} className="animate-float">💥</div>
        <div style={{ position: 'absolute', top: '20%', right: '12%', fontSize: '80px' }} className="animate-float">🥊</div>
        <div style={{ position: 'absolute', top: '70%', right: '8%', fontSize: '76px' }} className="animate-float">⭐</div>
      </div>

      {/* Main Glass Card */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '540px',
        borderRadius: '24px',
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        position: 'relative',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Top Sound Toggle & Stats */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
            <Trophy size={16} color="#f59e0b" />
            <span>Kills: <strong>{stats.kills}</strong></span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>Partidas: <strong>{stats.matches}</strong></span>
          </div>

          <button
            onClick={toggleAudio}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '6px 10px',
              color: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            {audioEnabled ? <Volume2 size={16} color="#34d399" /> : <VolumeX size={16} color="#ef4444" />}
            <span>{audioEnabled ? 'Sonido ON' : 'Mute'}</span>
          </button>
        </div>

        {/* Title Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            fontWeight: 800,
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.12)',
            padding: '4px 14px',
            borderRadius: '999px',
            marginBottom: '6px',
          }}>
            <Sparkles size={14} /> Caos Arcade 3D Multijugador
          </div>
          <h1 className="font-arcade" style={{
            fontSize: '44px',
            fontWeight: 900,
            letterSpacing: '1px',
            margin: 0,
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
          }}>
            BOMBERTEAM
          </h1>

          {/* Tournament of Power & New Powers Feature Highlight Banner */}
          <div style={{
            background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.3), rgba(239, 68, 68, 0.3))',
            border: '1px solid rgba(192, 132, 252, 0.4)',
            borderRadius: '12px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: '#e0e7ff',
            width: '100%',
            justifyContent: 'center',
            marginTop: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>🥋</span>
            <span><strong>TORNEO DEL PODER:</strong> 48 jugadores · 🥊 Guantes x2 · 🥾 Super Salto · 📦 Cajas con Fuego, Veneno y Parálisis</span>
          </div>

          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
            Partidas rápidas • Físicas locas • ¡Entra y juega en 10 segundos!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handlePlaySubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Name Input with Dice */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
              Tu Nombre de Luchador:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                maxLength={16}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Elige tu nombre..."
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#ffffff',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)')}
              />
              <button
                type="button"
                onClick={randomizeName}
                title="Nombre aleatorio"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  padding: '0 16px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Dices size={22} color="#f59e0b" />
              </button>
            </div>
          </div>

          {/* Character Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
              Elige tu Personaje:
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}>
              {CHARACTERS.map((char) => {
                const isSelected = character === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setCharacter(char.id);
                    }}
                    style={{
                      background: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected ? '2px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '10px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                    }}
                  >
                    <span style={{ fontSize: '26px' }}>{char.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#ffffff' : '#94a3b8' }}>
                      {char.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
              Color del Traje:
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              {COLORS.map((c) => {
                const isSelected = color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setColor(c.hex);
                    }}
                    style={{
                      flex: 1,
                      height: '36px',
                      borderRadius: '10px',
                      background: c.hex,
                      border: isSelected ? '3px solid #ffffff' : '2px solid rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                      boxShadow: isSelected ? `0 0 16px ${c.hex}` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                    title={c.name}
                  />
                );
              })}
            </div>
          </div>

          {/* Big Play Button */}
          <button
            type="submit"
            disabled={isConnecting}
            className="btn-play font-arcade"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              fontSize: '24px',
              fontWeight: 900,
              letterSpacing: '1px',
              color: '#ffffff',
              border: 'none',
              cursor: isConnecting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '6px',
            }}
          >
            {isConnecting ? (
              <>
                <Zap size={26} className="animate-spin" />
                <span>CONECTANDO A LA ARENA...</span>
              </>
            ) : (
              <>
                <Swords size={28} />
                <span>¡JUGAR AHORA!</span>
              </>
            )}
          </button>
        </form>

        {/* Quick controls help */}
        <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', fontSize: '11px', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: '12px' }}>
          <span><strong>WASD</strong> Mover · <strong>Ratón</strong> Apuntar</span>
          <span><strong>J / clic izq.</strong> Combo ×3</span>
          <span><strong>R</strong> Patada</span>
          <span><strong>F</strong> Levantar / lanzar rival</span>
          <span><strong>E / clic der.</strong> Sacar bomba; repetir para lanzar</span>
          <span><strong>Q</strong> Soltar</span>
          <span><strong>Espacio</strong> Saltar</span>
          <span><strong>Shift + golpe</strong> Embestir al correr</span>
        </div>
      </div>
    </div>
  );
};
