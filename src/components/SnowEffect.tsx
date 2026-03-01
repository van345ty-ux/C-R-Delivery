import React from 'react';

export const SnowEffect: React.FC = () => {
    // Create an array of snowflakes with random properties
    const snowflakes = Array.from({ length: 50 }).map((_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 3 + 2}s`, // Random duration between 2s and 5s
        animationDelay: `${Math.random() * 5}s`, // Random delay
        opacity: Math.random(),
        size: `${Math.random() * 5 + 2}px` // Random size between 2px and 7px
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className="absolute bg-white rounded-full animate-snowfall"
                    style={{
                        left: flake.left,
                        top: '-10px',
                        width: flake.size,
                        height: flake.size,
                        opacity: flake.opacity,
                        animationDuration: flake.animationDuration,
                        animationDelay: flake.animationDelay,
                    }}
                />
            ))}
        </div>
    );
};
