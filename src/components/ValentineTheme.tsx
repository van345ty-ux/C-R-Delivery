import React, { useMemo, useState, useEffect } from 'react';

interface Heart {
  id: number;
  left: string;
  size: string;
  floatDuration: string;
  swayDuration: string;
  swayDelay: string;
  floatDelay: string;
  emoji: string;
}

const HEART_EMOJIS = ['❤️', '💕', '💗', '💖', '💝', '🌹', '💞'];

export const ValentineTheme: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Unmounts the entire overlay after the intro animation finishes (13 seconds)
    // 5.0s (hearts wave) + 5s (phrase fade in/out) + safety margin
    const timer = setTimeout(() => {
      setVisible(false);
    }, 13000);
    return () => clearTimeout(timer);
  }, []);

  const hearts = useMemo<Heart[]>(() => {
    return Array.from({ length: 440 }, (_, i) => {
      const left = Math.random() * 100;
      const size = 15 + Math.random() * 25; // 15px a 40px
      
      // Subida mais lenta (entre 3.0s e 4.5s) para cruzarem a tela de forma suave
      const floatDuration = 3.0 + Math.random() * 1.5; 
      
      // Delay expandido para distribuir os corações verticalmente pela tela (mais espaçados)
      const floatDelay = Math.random() * 2.8; 
      
      // Oscilação lateral mais lenta e orgânica
      const swayDuration = 2.0 + Math.random() * 2.0; 
      const swayDelay = -(Math.random() * swayDuration); 
      
      const emojiIndex = Math.floor(Math.random() * HEART_EMOJIS.length);

      return {
        id: i,
        left: `${left}%`,
        size: `${size}px`,
        floatDuration: `${floatDuration.toFixed(2)}s`,
        floatDelay: `${floatDelay.toFixed(2)}s`,
        swayDuration: `${swayDuration.toFixed(2)}s`,
        swayDelay: `${swayDelay.toFixed(2)}s`,
        emoji: HEART_EMOJIS[emojiIndex],
      };
    });
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        /* Usando translate3d para forçar o uso da Placa de Vídeo e eliminar QUALQUER tremedeira */
        @keyframes valentineFloatUpV7 {
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

        @keyframes valentineSwayV7 {
          0%, 100% { transform: translate3d(-30px, 0, 0) rotate(-10deg); }
          50% { transform: translate3d(30px, 0, 0) rotate(10deg); }
        }

        @keyframes valentinePulseV7 {
          0%, 100% { transform: scale(0.95); }
          50% { transform: scale(1.15); }
        }

        @keyframes valentineSplashInV7 {
          0% {
            opacity: 0;
            transform: scale(1.5);
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
            transform: scale(0.95);
            visibility: hidden;
          }
        }

        .heart-float-container-v7 {
          position: fixed !important;
          bottom: 0 !important; 
          pointer-events: none !important;
          z-index: 999999 !important;
          animation-name: valentineFloatUpV7 !important;
          animation-duration: var(--float-duration, 3s) !important;
          animation-delay: var(--float-delay, 0s) !important;
          animation-timing-function: linear !important;
          animation-iteration-count: 1 !important; /* APENAS 1 VEZ */
          animation-fill-mode: forwards !important; /* PRESERVA O ESTADO FINAL INVISÍVEL */
          will-change: transform, opacity;
        }

        .heart-sway-container-v7 {
          display: inline-block !important;
          animation-name: valentineSwayV7 !important;
          animation-duration: var(--sway-duration, 10s) !important;
          animation-delay: var(--sway-delay, 0s) !important;
          animation-timing-function: ease-in-out !important;
          animation-iteration-count: infinite !important;
          will-change: transform;
        }

        .heart-pulse-emoji-v7 {
          display: inline-block !important;
          /* Pulsação super lenta e calma */
          animation: valentinePulseV7 3.5s infinite ease-in-out !important;
          user-select: none !important;
          line-height: 1 !important;
          will-change: transform;
        }

        .valentine-splash-v7 {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 9999999 !important;
          pointer-events: none !important;
          opacity: 0;
          animation: valentineSplashInV7 5s ease-out 5.0s forwards !important; /* delay de 5.0s, logo após os corações */
          background: radial-gradient(circle, rgba(255, 240, 246, 0.95) 0%, rgba(255, 255, 255, 0) 80%) !important;
        }

        .valentine-splash-title-v7 {
          font-size: clamp(2.5rem, 8vw, 4.5rem) !important;
          color: #e91e8c !important;
          text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.9), 0 0 20px rgba(233, 30, 140, 0.4) !important;
          font-family: 'Georgia', serif !important;
          text-align: center !important;
          margin: 0 !important;
          line-height: 1.2 !important;
          font-weight: bold !important;
          color: #e91e8c !important;
        }

        .valentine-splash-subtitle-v7 {
          font-size: clamp(1.5rem, 5vw, 2.5rem) !important;
          color: #c2185b !important;
          text-shadow: 1px 1px 3px rgba(255, 255, 255, 0.9) !important;
          font-family: 'Arial', sans-serif !important;
          text-align: center !important;
          margin-top: 15px !important;
          font-weight: 600 !important;
        }
      `}</style>

      <div aria-hidden="true" className="valentine-splash-v7">
        <h1 className="valentine-splash-title-v7">
          Feliz Dia dos Namorados
        </h1>
        <h2 className="valentine-splash-subtitle-v7">
          C&R Sushi <span className="heart-pulse-emoji-v7" style={{ animationDelay: '5.0s' }}>❤️</span>
        </h2>
      </div>

      <div
        aria-hidden="true"
        data-testid="valentine-overlay"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          zIndex: 999998,
          overflow: 'hidden',
        }}
      >
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="heart-float-container-v7"
            style={{
              left: heart.left,
              fontSize: heart.size,
              '--float-duration': heart.floatDuration,
              '--float-delay': heart.floatDelay,
            } as React.CSSProperties}
          >
            <div
              className="heart-sway-container-v7"
              style={{
                '--sway-duration': heart.swayDuration,
                '--sway-delay': heart.swayDelay,
              } as React.CSSProperties}
            >
              <span className="heart-pulse-emoji-v7">
                {heart.emoji}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
