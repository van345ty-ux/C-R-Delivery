import React from 'react';
import { Highlight } from '../types'; // Corrected import path

interface HighlightCardProps {
  name: string;
  price: number;
  imageUrl: string;
  borderColor: string;
  shadowSize: number; // Nova propriedade
}

export const HighlightCard: React.FC<HighlightCardProps> = ({ name, price, imageUrl, borderColor, shadowSize }) => {
  return (
    <div className="flex flex-col items-center text-center w-28 flex-shrink-0"> {/* Reduzido de w-32 para w-28 */}
      <div 
        className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden mb-1" 
        /* Reduzido de w-28 h-28 para w-24 h-24 */
        style={{ 
          border: `3px solid ${borderColor}`,
          boxShadow: `0 0 ${shadowSize}px rgba(0, 0, 0, 0.9)`, // Usando shadowSize
          margin: '7px'
        }}
      >
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-xs font-medium text-gray-800 line-clamp-2">{name}</p>
      <p className="text-sm font-bold text-red-600">R$ {price.toFixed(2)}</p>
    </div>
  );
};