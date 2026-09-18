import React, { useEffect } from 'react';
import { LeaderboardEntry } from '@shared/types';
import { Trophy, Crown, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RoundEndModalProps {
  leaderboard: LeaderboardEntry[];
}

export const RoundEndModal: React.FC<RoundEndModalProps> = ({ leaderboard }) => {
  useEffect(() => {
    // Launch festive confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const top3 = leaderboard.slice(0, 3);
  const winner = top3[0];

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(9, 13, 22, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 45,
    }}>
      <div className="glass-panel" style={{
        borderRadius: '24px',
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        maxWidth: '460px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Crown size={42} color="#f59e0b" />
        </div>

        <div>
          <h2 className="font-arcade" style={{ fontSize: '32px', color: '#f59e0b' }}>
            ¡FIN DE LA RONDA!
          </h2>
          <p style={{ fontSize: '15px', color: '#94a3b8' }}>
            Ganador: <strong style={{ color: '#ffffff' }}>{winner?.name || 'Campeón'}</strong> con {winner?.kills || 0} eliminaciones
          </p>
        </div>

        {/* Podium */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '12px',
          width: '100%',
          margin: '8px 0',
        }}>
          {/* 2nd Place */}
          {top3[1] && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ fontSize: '20px' }}>🥈</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {top3[1].name}
              </span>
              <div style={{
                width: '100%',
                height: '70px',
                background: 'rgba(148, 163, 184, 0.2)',
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#cbd5e1',
              }}>
                2º
              </div>
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div style={{
              flex: 1.2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ fontSize: '24px' }}>👑</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {top3[0].name}
              </span>
              <div style={{
                width: '100%',
                height: '100px',
                background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.15) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '14px 14px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '22px',
                color: '#f59e0b',
              }}>
                1º
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ fontSize: '20px' }}>🥉</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {top3[2].name}
              </span>
              <div style={{
                width: '100%',
                height: '50px',
                background: 'rgba(217, 119, 6, 0.2)',
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#f97316',
              }}>
                3º
              </div>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#38bdf8',
          fontWeight: 700,
        }}>
          <ArrowRight size={18} />
          <span>Cargando siguiente arena automáticamente...</span>
        </div>
      </div>
    </div>
  );
};
