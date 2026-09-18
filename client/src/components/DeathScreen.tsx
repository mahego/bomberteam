import React, { useEffect, useState } from 'react';
import { Skull, RotateCcw } from 'lucide-react';
import { soundManager } from '../engine/SoundEffects';

interface DeathScreenProps {
  onRespawn: () => void;
}

export const DeathScreen: React.FC<DeathScreenProps> = ({ onRespawn }) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onRespawn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onRespawn]);

  const handleManualRespawn = () => {
    soundManager.playClick();
    onRespawn();
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      zIndex: 40,
    }}>
      <div className="glass-panel" style={{
        borderRadius: '24px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '380px',
        textAlign: 'center',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 20px 50px rgba(239, 68, 68, 0.25)',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Skull size={36} color="#ef4444" />
        </div>

        <div>
          <h2 className="font-arcade" style={{ fontSize: '28px', color: '#f87171' }}>
            ¡FUISTE ELIMINADO!
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
            Reapareciendo en {countdown} segundos...
          </p>
        </div>

        <button
          onClick={handleManualRespawn}
          className="btn-play font-arcade"
          style={{
            padding: '14px 28px',
            borderRadius: '14px',
            fontSize: '18px',
            fontWeight: 800,
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <RotateCcw size={20} />
          <span>¡REAPARECER AHORA!</span>
        </button>
      </div>
    </div>
  );
};
