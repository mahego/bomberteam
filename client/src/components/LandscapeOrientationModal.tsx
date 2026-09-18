import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const LandscapeOrientationModal: React.FC = () => {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 1024 || window.innerHeight <= 1024;
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(isTouch && isSmallScreen && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRequestLandscape = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch {
      // Browsers that don't allow programmatic lock will naturally transition when user physically rotates
    }
  };

  if (!isPortraitMobile) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(9, 13, 22, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        color: '#ffffff',
      }}
    >
      {/* Animated Phone Icon */}
      <div
        style={{
          width: '90px',
          height: '90px',
          borderRadius: '24px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '2px solid rgba(99, 102, 241, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 0 35px rgba(99, 102, 241, 0.5)',
        }}
        className="animate-rotate-phone"
      >
        <Smartphone size={46} color="#818cf8" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <RotateCw size={20} color="#f59e0b" className="animate-spin" />
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 900,
            letterSpacing: '0.5px',
            fontFamily: 'Fredoka, sans-serif',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          GIRA TU DISPOSITIVO
        </h2>
      </div>

      <p
        style={{
          fontSize: '14px',
          color: '#94a3b8',
          maxWidth: '320px',
          lineHeight: '1.5',
          marginBottom: '26px',
        }}
      >
        Para disfrutar de la mejor experiencia de combate multijugador 3D con controles y HUD táctil completo, gira tu teléfono a modo <strong>horizontal (Landscape)</strong>.
      </p>

      <button
        onClick={handleRequestLandscape}
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '14px',
          padding: '12px 24px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span>🔄 Forzar Modo Horizontal</span>
      </button>

      <style>{`
        @keyframes rotate-phone-anim {
          0%, 20% { transform: rotate(0deg); }
          50%, 70% { transform: rotate(-90deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-rotate-phone {
          animation: rotate-phone-anim 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes spin-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin-anim 4s linear infinite;
        }
      `}</style>
    </div>
  );
};
