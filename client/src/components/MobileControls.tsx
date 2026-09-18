import React, { useRef, useState, useEffect } from 'react';
import { InputManager } from '../engine/InputManager';

interface MobileControlsProps {
  inputManager: InputManager;
  isCarryingOpponent?: boolean;
  isHoldingBomb?: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ inputManager, isCarryingOpponent, isHoldingBomb }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [forceVisible, setForceVisible] = useState(false);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(hasTouch || window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const shouldShow = isMobile || forceVisible;

  const resetJoystick = React.useCallback(() => {
    if (touchIdRef.current !== null && joystickBaseRef.current) {
      try {
        if (joystickBaseRef.current.hasPointerCapture(touchIdRef.current)) {
          joystickBaseRef.current.releasePointerCapture(touchIdRef.current);
        }
      } catch (_) {}
    }
    touchIdRef.current = null;
    setStickPos({ x: 0, y: 0 });
    inputManager.touchMove.x = 0;
    inputManager.touchMove.z = 0;
  }, [inputManager]);

  const updateJoystickPos = React.useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width * (52 / 136);

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxDist) {
      clampedX = (dx / dist) * maxDist;
      clampedY = (dy / dist) * maxDist;
    }

    setStickPos({ x: clampedX * 136 / rect.width, y: clampedY * 136 / rect.width });
    inputManager.touchMove.x = clampedX / maxDist;
    inputManager.touchMove.z = clampedY / maxDist;
  }, [inputManager]);

  // Global window listeners to ensure joystick NEVER stays stuck
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (touchIdRef.current !== null && e.pointerId === touchIdRef.current) {
        updateJoystickPos(e.clientX, e.clientY);
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (touchIdRef.current !== null && e.pointerId === touchIdRef.current) {
        resetJoystick();
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        resetJoystick();
        inputManager.touchSprint = false;
        inputManager.touchJump = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        resetJoystick();
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: true });
    window.addEventListener('blur', resetJoystick);
    window.addEventListener('contextmenu', resetJoystick);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
      window.removeEventListener('blur', resetJoystick);
      window.removeEventListener('contextmenu', resetJoystick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      inputManager.touchMove.x = 0;
      inputManager.touchMove.z = 0;
    };
  }, [resetJoystick, updateJoystickPos, inputManager]);

  const handleJoystickStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    touchIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    inputManager.aimWithMouse = false;
    updateJoystickPos(e.clientX, e.clientY);
  };

  const handleJoystickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === touchIdRef.current) {
      updateJoystickPos(e.clientX, e.clientY);
    }
  };

  const handleJoystickEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === touchIdRef.current) {
      resetJoystick();
    }
  };

  return (
    <>
      {/* Desktop/Tablet Toggle Button if touch not detected */}
      {!isMobile && (
        <button
          onClick={() => setForceVisible(!forceVisible)}
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '6px 10px',
            fontSize: '11px',
            color: '#94a3b8',
            cursor: 'pointer',
            zIndex: 40,
            pointerEvents: 'auto',
          }}
        >
          {forceVisible ? 'Ocultar Controles Táctiles' : '📱 Modo Táctil'}
        </button>
      )}

      {shouldShow && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 35,
        }}>
          {/* Left Virtual Joystick */}
          <div
            className="combat-joystick"
            ref={joystickBaseRef}
            onPointerDown={handleJoystickStart}
            onPointerMove={handleJoystickMove}
            onPointerUp={handleJoystickEnd}
            onPointerCancel={handleJoystickEnd}
            onLostPointerCapture={handleJoystickEnd}
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              width: '136px',
              height: '136px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '2px solid rgba(99, 102, 241, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
              touchAction: 'none',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Direction hints */}
            <div style={{ position: 'absolute', top: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>▲</div>
            <div style={{ position: 'absolute', bottom: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>▼</div>
            <div style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>◀</div>
            <div style={{ position: 'absolute', right: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>▶</div>

            {/* Joystick Thumb Stick */}
            <div style={{
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              border: '2px solid rgba(255, 255, 255, 0.6)',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
              transition: touchIdRef.current === null ? 'transform 0.15s ease' : 'none',
            }} />
          </div>

          {/* Right Action Buttons Cluster */}
          <div className="combat-actions" style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-end',
            pointerEvents: 'auto',
            touchAction: 'none',
          }}>
            {/* Top row: CARGAR / AGARRAR (Featured prominently) */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                className="combat-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  inputManager.triggerAction('kick');
                  if ('vibrate' in navigator) navigator.vibrate(10);
                }}
                style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#0891b2', border: '2px solid white', color: 'white', fontWeight: 900, cursor: 'pointer' }}
              >
                🦶<br />PATADA
              </button>
              <button
                className="combat-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  inputManager.triggerAction('drop');
                  if ('vibrate' in navigator) navigator.vibrate(8);
                }}
                style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#475569', border: '2px solid #94a3b8', color: 'white', fontWeight: 900, cursor: 'pointer' }}
              >
                ↓<br />SOLTAR
              </button>
              {/* Sprint Button */}
              <button
                className="combat-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  inputManager.touchSprint = true;
                  inputManager.onAction?.();
                  if ('vibrate' in navigator) navigator.vibrate(8);
                }}
                onPointerUp={() => (inputManager.touchSprint = false)}
                onPointerCancel={() => (inputManager.touchSprint = false)}
                onLostPointerCapture={() => (inputManager.touchSprint = false)}
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 0 16px rgba(16, 185, 129, 0.6)',
                  color: '#ffffff',
                  fontSize: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span>⚡</span>
                <span style={{ fontSize: '8px', fontWeight: 900 }}>CORRER</span>
              </button>

              {/* GRAB / CARRY OPPONENT BUTTON (Large & Highlighted) */}
              <button
                className={`combat-btn ${isCarryingOpponent ? 'glow-pulse' : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  inputManager.triggerAction('grab');
                  if ('vibrate' in navigator) navigator.vibrate(15);
                }}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: isCarryingOpponent
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                  border: '3px solid #ffffff',
                  boxShadow: isCarryingOpponent
                    ? '0 0 24px rgba(245, 158, 11, 0.9)'
                    : '0 0 24px rgba(168, 85, 247, 0.8)',
                  color: '#ffffff',
                  fontSize: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transform: isCarryingOpponent ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                <span>{isCarryingOpponent ? '🚀' : '🏋️'}</span>
                <span style={{ fontSize: '9px', fontWeight: 900 }}>
                  {isCarryingOpponent ? '¡TIRAR!' : 'CARGAR'}
                </span>
              </button>
            </div>

            {/* Bottom Row: Punch, Bomb, Jump */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Jump Button */}
              <button
                className="combat-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  inputManager.triggerAction('jump');
                  if ('vibrate' in navigator) navigator.vibrate(8);
                }}
                onPointerUp={() => (inputManager.touchJump = false)}
                onPointerCancel={() => (inputManager.touchJump = false)}
                onLostPointerCapture={() => (inputManager.touchJump = false)}
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 0 16px rgba(2, 132, 199, 0.6)',
                  color: '#ffffff',
                  fontSize: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span>⬆️</span>
                <span style={{ fontSize: '8px', fontWeight: 900 }}>SALTAR</span>
              </button>

              {/* Bomb Button */}
              <button
                className="combat-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  inputManager.triggerAction('throw');
                  if ('vibrate' in navigator) navigator.vibrate(12);
                }}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 0 18px rgba(245, 158, 11, 0.6)',
                  color: '#ffffff',
                  fontSize: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span>💣</span>
                <span style={{ fontSize: '8px', fontWeight: 900 }}>{isHoldingBomb || isCarryingOpponent ? 'LANZAR' : 'BOMBA'}</span>
              </button>

              {/* Punch Button (Primary Attack) */}
              <button
                className="combat-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  inputManager.triggerAction('punch');
                  if ('vibrate' in navigator) navigator.vibrate(15);
                }}
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  border: '3px solid rgba(255, 255, 255, 0.6)',
                  boxShadow: '0 0 24px rgba(239, 68, 68, 0.8)',
                  color: '#ffffff',
                  fontSize: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span>🥊</span>
                <span style={{ fontSize: '10px', fontWeight: 900 }}>GOLPE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
