import React from 'react';
import { Product } from '../App';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { cn } from '../utils/cn';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isPromotion?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, isPromotion = false }) => {
  return (
    <div className={cn(
      "flex flex-col rounded-lg shadow-sm border h-full",
      isPromotion ? "p-4 bg-red-50 border-red-300 shadow-md" : "p-2 bg-white border-gray-200"
    )}>
      {/* Imagem e informações básicas no topo */}
      <div className={cn(
        "flex items-center mb-2",
        isPromotion ? "gap-4" : "gap-2"
      )}>
        <img 
          src={product.image} 
          alt={product.name} 
          className={cn(
            "object-cover rounded-md flex-shrink-0",
            isPromotion ? "w-32 h-32" : "w-20 h-20"
          )} 
        />
        <div className="flex-grow">
          <h3 className={cn(
            "font-semibold text-gray-900",
            isPromotion ? "text-base" : "text-sm"
          )}>{product.name}</h3>
          {product.badge_text && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full mt-1 mb-1 block w-fit whitespace-nowrap">
              {product.badge_text}
            </span>
          )}
        </div>
      </div>

      {/* Descrição do produto, ocupando o espaço restante */}
      <p className={cn(
        "text-gray-600 line-clamp-2 mb-2 flex-grow",
        isPromotion ? "text-sm" : "text-xs"
      )}>{product.description}</p>
      
      {/* Preço e botão no canto inferior direito */}
      <div className="flex items-baseline justify-between mt-auto">
        <div className="flex items-baseline gap-2">
          {product.original_price && (
            <span className={cn(
              "text-gray-500 line-through",
              isPromotion ? "text-sm" : "text-xs"
            )}>
              R$ {product.original_price.toFixed(2)}
            </span>
          )}
          <span className={cn(
            "font-bold text-red-600",
            isPromotion ? "text-lg" : "text-base"
          )}>
            R$ {product.price.toFixed(2)}
          </span>
        </div>
        <Button
          onClick={() => onAddToCart(product)}
          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-md flex-shrink-0"
          size="icon"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};