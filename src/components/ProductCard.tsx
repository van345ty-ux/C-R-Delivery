import React from 'react';
import { Product } from '../App';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <img src={product.image} alt={product.name} className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
      <div className="flex-grow">
        <h3 className="font-semibold text-gray-900 text-base">{product.name}</h3>
        {product.badge_text && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full mt-1 mb-1 block w-fit">
            {product.badge_text}
          </span>
        )}
        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{product.description}</p>
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
      </div>
      <Button
        onClick={() => onAddToCart(product)}
        className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-md flex-shrink-0"
        size="icon"
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
};