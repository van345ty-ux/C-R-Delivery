import React from 'react';

export const ChristmasLights: React.FC = () => {
    // Generate a sequence of lights - increased count to ensure coverage
    const lightCount = 40;
    const lights = Array.from({ length: lightCount });

    return (
        <div className="fixed top-0 left-0 w-full h-16 z-[60] pointer-events-none overflow-hidden flex justify-center items-start pt-2">
            <div className="flex items-start">
                {lights.map((_, i) => {
                    // Colors: Red, Green, Yellow, Blue (added Blue to match image)
                    const colors = [
                        'bg-red-500 shadow-red-500',
                        'bg-green-500 shadow-green-500',
                        'bg-yellow-400 shadow-yellow-400',
                        'bg-blue-400 shadow-blue-400'
                    ];
                    const colorClass = colors[i % 4];

                    // Blink animations
                    const animationClass = i % 2 === 0 ? 'animate-blink-odd' : 'animate-blink-even';

                    return (
                        <React.Fragment key={i}>
                            {/* The Light */}
                            <div className="relative flex flex-col items-center">
                                {/* Socket */}
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-800 rounded-sm z-10"></div>
                                {/* Bulb */}
                                <div
                                    className={`w-3 h-4 sm:w-4 sm:h-5 rounded-full -mt-1 ${colorClass} ${animationClass}`}
                                    style={{
                                        boxShadow: `0 0 10px currentColor`
                                    }}
                                ></div>
                            </div>

                            {/* The Wire (between lights) */}
                            {i < lightCount - 1 && (
                                <div className="relative w-4 sm:w-8 h-4 -mt-2">
                                    <div className="absolute top-2 left-0 w-full h-4 border-b-2 border-gray-800 rounded-[50%]"></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
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
