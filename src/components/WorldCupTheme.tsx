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

        .wc-splash-overlay {
          position: absolute !important;
          top: 120px !important;
          left: 0 !important;
          right: 0 !important;
          height: 300px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-end !important;
          align-items: center !important;
          padding-bottom: 24px !important;
          z-index: 9999999 !important;
          pointer-events: none !important;
          opacity: 0;
          animation: wcSplashAnim 4s ease-out 0.4s forwards !important;
          background: radial-gradient(circle, rgba(21, 128, 61, 0.08) 0%, rgba(255, 255, 255, 0) 70%) !important;
        }

        @media (min-width: 768px) {
          .wc-splash-overlay {
            height: 400px !important;
            padding-bottom: 36px !important;
          }
        }

        .wc-splash-title-text {
          font-size: clamp(2.3rem, 7vw, 4rem) !important;
          color: #15803d !important;
          text-shadow: 2px 2px 0px #facc15, 0 0 20px rgba(21, 128, 61, 0.4) !important;
          font-family: 'Outfit', 'Inter', sans-serif !important;
          text-align: center !important;
          margin: 0 !important;
          line-height: 1.2 !important;
          font-weight: 900 !important;
        }

        .wc-splash-subtitle-text {
          font-size: clamp(1.2rem, 3.5vw, 2rem) !important;
          color: #eab308 !important;
          text-shadow: 1px 1px 0px #15803d, 0 0 10px rgba(234, 179, 8, 0.3) !important;
          font-family: 'Outfit', 'Inter', sans-serif !important;
          text-align: center !important;
          margin-top: 12px !important;
          font-weight: 700 !important;
          letter-spacing: 0.05em;
        }

        .wc-splash-content-wrapper {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
          max-width: 42rem !important;
          padding: 0 16px !important;
        }
      `}</style>

      {/* Título de Introdução */}
      <div aria-hidden="true" className="wc-splash-overlay">
        <div className="wc-splash-content-wrapper">
          <h1 className="wc-splash-title-text">
            RUMO AO HEXA! 🇧🇷
          </h1>
          <h2 className="wc-splash-subtitle-text">
            C&R Sushi na Torcida! ⚽🏆
          </h2>
        </div>
      </div>

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
