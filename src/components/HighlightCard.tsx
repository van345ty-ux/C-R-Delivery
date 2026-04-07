import React from 'react';

interface HighlightCardProps {
  name: string;
  price: number;
  imageUrl: string;
  borderColor: string;
  shadowSize: number;
}

// Map border colors to premium gold palette
const getPremiumBorderColor = (color: string): string => {
  const lowerColor = color.toLowerCase();
  
  // Map red/gold shades to accent gold
  if (lowerColor.includes('red') || lowerColor.includes('gold') || lowerColor.includes('#dc2626') || lowerColor.includes('#ef4444')) {
    return 'var(--accent-primary)';
  }
  
  // Map dark colors to text primary
  if (lowerColor.includes('black') || lowerColor.includes('#000') || lowerColor.includes('gray-8') || lowerColor.includes('gray-9')) {
    return 'var(--text-primary)';
  }
  
  // Map light colors to border primary
  if (lowerColor.includes('white') || lowerColor.includes('#fff')) {
    return 'var(--border-primary)';
  }
  
  // Default to accent gold
  return 'var(--accent-primary)';
};

export const HighlightCard: React.FC<HighlightCardProps> = ({ name, price, imageUrl, borderColor }) => {
  const premiumBorderColor = getPremiumBorderColor(borderColor);
  
  return (
    <div className="flex flex-col items-center text-center w-32 flex-shrink-0 animate-fade-in">
      <div 
        className="relative w-28 h-28 rounded-full flex items-center justify-center overflow-hidden mb-3 aspect-square transition-all duration-300 hover:scale-110" 
        style={{ 
          border: `3px solid ${premiumBorderColor}`,
          boxShadow: 'var(--shadow-md)',
          padding: '4px'
        }}
      >
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          width="112"
          height="112"
          className="w-full h-full object-cover aspect-square rounded-full"
        />
      </div>
      <p 
        className="text-sm font-semibold line-clamp-2 mb-1"
        style={{ 
          color: '#0A0A0A',
          fontFamily: 'var(--font-body)'
        }}
      >
        {name}
      </p>
      <p 
        className="text-base font-bold gradient-text"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        R$ {price.toFixed(2)}
      </p>
    </div>
  );
};