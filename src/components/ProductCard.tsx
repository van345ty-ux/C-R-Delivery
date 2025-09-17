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
    <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <img src={product.image} alt={product.name} className="w-32 h-32 object-cover rounded-md flex-shrink-0" />
      <div className="flex-grow">
        <h3 className="font-semibold text-gray-900 text-base">{product.name}</h3>
        {product.badge_text && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full block w-fit mb-1">
            {product.badge_text}
          </span>
        )}
        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-baseline gap-2">
            {product.original_price && (
              <span className="text-sm text-gray-500 line-through">
                R$ {product.original_price.toFixed(2)}
              </span>
            )}
            <span className="text-lg font-bold text-red-600">
              R$ {product.price.toFixed(2)}
            </span>
          </div>
          <Button
            onClick={() => onAddToCart(product)}
            disabled={!isStoreOpen}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg shadow-md flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
};