import React from 'react';
import { Product } from '../App';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isStoreOpen: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, isStoreOpen }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
      <div className="relative w-full h-48">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        {product.badge_text && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            {product.badge_text}
          </span>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-semibold text-lg text-gray-900 mb-1">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-3 flex-grow line-clamp-2">{product.description}</p>
        <div className="flex items-baseline justify-between mt-auto">
          <div className="flex items-baseline gap-2">
            {product.original_price && (
              <span className="text-sm text-gray-500 line-through">
                R$ {product.original_price.toFixed(2)}
              </span>
            )}
            <span className="text-xl font-bold text-red-600">
              R$ {product.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};