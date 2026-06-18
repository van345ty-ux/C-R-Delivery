import React, { useMemo, useState, useEffect } from 'react';

interface FloatingBall {
  id: number;
  left: string;
  size: string;
  floatDuration: string;
  swayDuration: string;
  swayDelay: string;
  floatDelay: string;
  emoji: string;
}

const BALL_EMOJIS = ['⚽', '🇧🇷', '🏆', '⚽', '💚', '💛'];

export const WorldCupTheme: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    console.log('[WorldCupTheme] Component mounted! visible:', visible);
    const timer = setTimeout(() => {
      console.log('[WorldCupTheme] Hiding animation (timeout reached)');
      setVisible(false);
    }, 9000);
    return () => {
      console.log('[WorldCupTheme] Component unmounted!');
      clearTimeout(timer);
    };
  }, []);

  const balls = useMemo<FloatingBall[]>(() => {
    return Array.from({ length: 120 }, (_, i) => {
      const left = Math.random() * 100;
      const size = 18 + Math.random() * 22; // 18px a 40px
      
      // Velocidade de subida (entre 2.5s e 4.0s)
      const floatDuration = 2.5 + Math.random() * 1.5; 
      const floatDelay = Math.random() * 2.5; 
      
      // Animação de pulo lateral (sway/bounce)
      const swayDuration = 1.2 + Math.random() * 1.2; 
      const swayDelay = -(Math.random() * swayDuration); 
      
      const emojiIndex = Math.floor(Math.random() * BALL_EMOJIS.length);

      return {
        id: i,
        left: `${left}%`,
        size: `${size}px`,
        floatDuration: `${floatDuration.toFixed(2)}s`,
        floatDelay: `${floatDelay.toFixed(2)}s`,
        swayDuration: `${swayDuration.toFixed(2)}s`,
        swayDelay: `${swayDelay.toFixed(2)}s`,
        emoji: BALL_EMOJIS[emojiIndex],
      };
    });
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        /* Animação para subir as bolas */
        @keyframes wcFloatUpAnim {
          0% {
            transform: translate3d(0, 10vh, 0); 
            opacity: 0;
          }
          10% {
            opacity: 1; 
          }
          90% {
            opacity: 0.9;
          }
          100% {
            transform: translate3d(0, -110vh, 0); 
            opacity: 0; 
          }
        }

        /* Animação de rotação e pulo (bouncing/spinning) */
        @keyframes wcBallBounceAnim {
          0%, 100% { 
            transform: translateY(0) rotate(0deg) scale(1); 
          }
          50% { 
            transform: translateY(-60px) rotate(180deg) scale(1.15); 
          }
        }

        /* Splash do texto Rumo ao Hexa */
        @keyframes wcSplashAnim {
          0% {
            opacity: 0;
            transform: scale(1.4);
          }
          15% {
            opacity: 1;
            transform: scale(1);
          }
          85% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.9);
            visibility: hidden;
          }
        }

        .ball-float-container-wc {
          position: fixed !important;
          bottom: 0 !important; 
          pointer-events: none !important;
          z-index: 999999 !important;
          animation-name: wcFloatUpAnim !important;
          animation-duration: var(--float-duration, 3s) !important;
          animation-delay: var(--float-delay, 0s) !important;
          animation-timing-function: linear !important;
          animation-iteration-count: 1 !important;
          animation-fill-mode: forwards !important;
          will-change: transform, opacity;
        }

        .ball-bounce-container-wc {
          display: inline-block !important;
          animation-name: wcBallBounceAnim !important;
          animation-duration: var(--sway-duration, 2s) !important;
          animation-delay: var(--sway-delay, 0s) !important;
          animation-timing-function: ease-in-out !important;
          animation-iteration-count: infinite !important;
          will-change: transform;
        }
      `}</style>

      {/* Bolas Subindo e Pulando */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          zIndex: 999998,
          overflow: 'hidden',
        }}
      >
        {balls.map((ball) => (
          <div
            key={ball.id}
            className="ball-float-container-wc"
            style={{
              left: ball.left,
              fontSize: ball.size,
              '--float-duration': ball.floatDuration,
              '--float-delay': ball.floatDelay,
            } as React.CSSProperties}
          >
            <div
              className="ball-bounce-container-wc"
              style={{
                '--sway-duration': ball.swayDuration,
                '--sway-delay': ball.swayDelay,
                userSelect: 'none',
                lineHeight: 1,
              } as React.CSSProperties}
            >
              {ball.emoji}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
