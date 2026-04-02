import React, { useState, useEffect } from 'react';

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'middle-left' | 'middle-right';

export const EasterBunnyPeek: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>('bottom-right');

  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;
    let nextShowTimeout: NodeJS.Timeout;
    let lastPos: Position = 'bottom-right';

    const showBunny = () => {
      const positions: Position[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right'];
      // Filtra para não repetir o último lugar
      const availablePositions = positions.filter(p => p !== lastPos);
      const randomPos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
      
      lastPos = randomPos;
      setPosition(randomPos);
      setIsVisible(true);

      // Fica visível por 5 segundos
      hideTimeout = setTimeout(() => {
        setIsVisible(false);
        // Sorteia a próxima aparição em exatos 3 segundos
        const nextTime = 3000;
        nextShowTimeout = setTimeout(showBunny, nextTime);
      }, 5000);
    };

    // Primeira aparição bem rápida em 1s
    const initialShowTimeout = setTimeout(showBunny, 1000);

    return () => {
      clearTimeout(initialShowTimeout);
      clearTimeout(hideTimeout);
      clearTimeout(nextShowTimeout);
    };
  }, []);

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return { top: '-15px', left: '-15px', transform: 'rotate(135deg)' };
      case 'top-right':
        return { top: '-15px', right: '-15px', transform: 'rotate(-135deg)' };
      case 'bottom-left':
        return { bottom: '-15px', left: '-15px', transform: 'rotate(45deg)' };
      case 'bottom-right':
        return { bottom: '-15px', right: '-15px', transform: 'rotate(-45deg)' };
      case 'middle-left':
        return { top: '50%', left: '-15px', transform: 'translateY(-50%) rotate(90deg)' };
      case 'middle-right':
        return { top: '50%', right: '-15px', transform: 'translateY(-50%) rotate(-90deg)' };
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed z-[99999] pointer-events-none transition-all duration-700 ease-out"
      style={getPositionStyles()}
    >
      <div className="relative flex flex-col items-center">
        <div className="animate-bunny-dance flex flex-col items-center">
            <span className="text-7xl sm:text-8xl drop-shadow-xl select-none">🐰</span>
            <span className="text-4xl absolute -top-2 -right-4 animate-wave-hand select-none">👋</span>
        </div>
      </div>

      <style>{`
        @keyframes bunny-dance {
          0% { transform: translateY(60px); opacity: 0; }
          20% { transform: translateY(0); opacity: 1; }
          80% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(60px); opacity: 0; }
        }
        @keyframes wave-hand {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          25% { transform: rotate(20deg) translateX(5px); }
          75% { transform: rotate(-10deg) translateX(-5px); }
        }
        .animate-bunny-dance {
          animation: bunny-dance 5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-wave-hand {
          animation: wave-hand 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
