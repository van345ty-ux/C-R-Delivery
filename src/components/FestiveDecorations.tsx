import React from 'react';

export const ChristmasLights: React.FC = () => {
    // Generate a sequence of lights
    const lights = Array.from({ length: 30 });

    return (
        <div className="fixed top-0 left-0 w-full h-12 z-[60] pointer-events-none overflow-hidden flex justify-center space-x-4 sm:space-x-8 px-4">
            {/* The Wire */}
            <svg className="absolute top-[-10px] left-0 w-full h-12" preserveAspectRatio="none">
                <path d="M0,0 Q50,20 100,0 T200,0 T300,0 T400,0 T500,0 T600,0 T700,0 T800,0 T900,0 T1000,0 T1100,0 T1200,0 T1300,0 T1400,0 T1500,0 T1600,0"
                    fill="none" stroke="#374151" strokeWidth="2" />
            </svg>

            {/* The Lights */}
            {lights.map((_, i) => {
                const colorClass = i % 3 === 0 ? 'bg-red-500 shadow-red-500' : i % 3 === 1 ? 'bg-green-500 shadow-green-500' : 'bg-yellow-400 shadow-yellow-400';
                const animationClass = i % 2 === 0 ? 'animate-blink-odd' : 'animate-blink-even';

                return (
                    <div
                        key={i}
                        className={`relative w-3 h-3 sm:w-4 sm:h-4 rounded-full mt-2 ${colorClass} ${animationClass}`}
                        style={{
                            boxShadow: `0 0 10px currentColor`
                        }}
                    >
                        {/* Socket */}
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-700 rounded-sm"></div>
                    </div>
                );
            })}
        </div>
    );
};

export const ChristmasHeroDecorations: React.FC = () => {
    return (
        <>
            {/* Christmas Tree - Bottom Left of Hero */}
            <div className="absolute bottom-2 left-4 z-20 animate-bounce-slight filter drop-shadow-lg">
                <span className="text-5xl sm:text-6xl" role="img" aria-label="Christmas Tree">🎄</span>
            </div>

            {/* Hanging Balls/Decorations - Top Right of Hero */}
            <div className="absolute top-0 right-4 sm:right-10 flex gap-6 z-20">
                <div className="flex flex-col items-center animate-swing origin-top">
                    <div className="w-0.5 h-12 bg-gray-300/80"></div>
                    <span className="text-4xl filter drop-shadow-md -mt-1" role="img" aria-label="Santa">🎅</span>
                </div>
                <div className="flex flex-col items-center animate-swing origin-top" style={{ animationDelay: '1s' }}>
                    <div className="w-0.5 h-20 bg-gray-300/80"></div>
                    <span className="text-4xl filter drop-shadow-md -mt-1" role="img" aria-label="Gift">🎁</span>
                </div>
                <div className="flex flex-col items-center animate-swing origin-top" style={{ animationDelay: '0.5s' }}>
                    <div className="w-0.5 h-8 bg-gray-300/80"></div>
                    <span className="text-4xl filter drop-shadow-md -mt-1" role="img" aria-label="Star">⭐</span>
                </div>
            </div>
        </>
    );
}
