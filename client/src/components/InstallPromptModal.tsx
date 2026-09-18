import React from 'react';
import { Download, X, Share, PlusSquare, Sparkles } from 'lucide-react';
import { isIOS, isStandalone, promptPWAInstall } from '../utils/pwa';

interface InstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const res = await promptPWAInstall();
    if (res === 'accepted') {
      onClose();
    }
  };

  const isApple = isIOS();
  const alreadyInstalled = isStandalone();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(9, 13, 22, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          position: 'relative',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* App Icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            border: '2px solid rgba(99, 102, 241, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)',
          }}
        >
          💣
        </div>

        <div style={{ textAlign: 'center' }}>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 900,
              fontFamily: 'Fredoka, sans-serif',
              margin: '0 0 6px 0',
              color: '#ffffff',
            }}
          >
            Instalar BomberTeam 3D
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            Disfruta de la experiencia completa en <strong>Pantalla Completa</strong> sin barras de navegación, menor latencia y controles táctiles más amplios.
          </p>
        </div>

        {alreadyInstalled ? (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '12px',
              padding: '12px',
              color: '#34d399',
              fontSize: '13px',
              textAlign: 'center',
              width: '100%',
            }}
          >
            ✓ Ya estás jugando desde la aplicación instalada.
          </div>
        ) : isApple ? (
          /* iOS Safari Guide */
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '14px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                }}
              >
                <Share size={18} color="#818cf8" />
              </div>
              <span>
                1. Toca el botón <strong>Compartir</strong> en la barra de Safari.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                }}
              >
                <PlusSquare size={18} color="#34d399" />
              </div>
              <span>
                2. Selecciona <strong>"Agregar a pantalla de inicio"</strong>.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                }}
              >
                <Sparkles size={18} color="#fbbf24" />
              </div>
              <span>
                3. ¡Abre la app para jugar en <strong>Modo Horizontal Completo</strong>!
              </span>
            </div>
          </div>
        ) : (
          /* Android / Desktop Chrome direct install */
          <button
            onClick={handleInstallClick}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)',
            }}
          >
            <Download size={18} />
            <span>Instalar Aplicación Ahora</span>
          </button>
        )}
      </div>
    </div>
  );
};
