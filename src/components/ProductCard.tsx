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
      isPromotion ? "p-2 bg-red-50 border-red-300 shadow-md" : "p-1 bg-white border-gray-200" // Ajustado padding para p-2
    )}>
      {/* Imagem e informações básicas no topo */}
      <div className={cn(
        "flex items-center",
        isPromotion ? "gap-4 mb-2" : "gap-1 mb-0" // Ajustado gap para o card normal
      )}>
        <img 
          src={product.image} 
          alt={product.name} 
          className={cn(
            "object-left rounded-md flex-shrink-0",
            isPromotion ? "w-40 h-36" : "w-36 h-24 " // Reduzido o tamanho da imagem para o card normal
          )} 
        />
        <div className="flex-grow">
          <h3 className={cn(
            "font-semibold text-gray-900",
            isPromotion ? "text-base" : "text-base" // Mantido text-base para o título
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
        "text-gray-600 line-clamp-2 flex-grow",
        isPromotion ? "text-sm mb-1" : "text-sm mb-1" // Mantido text-sm para a descrição
      )}>{product.description}</p>
      
      {/* Preço e botão no canto inferior direito */}
      <div className="flex items-baseline justify-between mt-auto">
        <div className="flex items-baseline gap-1">
          {product.original_price && (
            <span className={cn(
              "text-gray-500 line-through",
              isPromotion ? "text-sm" : "text-sm" // Mantido text-sm para o preço original
            )}>
              R$ {product.original_price.toFixed(2)}
            </span>
          )}
          <span className={cn(
            "font-bold text-red-600",
            isPromotion ? "text-lg" : "text-lg" // Mantido text-lg para o preço
          )}>
            R$ {product.price.toFixed(2)}
          </span>
        </div>
        <Button
          onClick={() => onAddToCart(product)}
          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-md flex-shrink-0 h-8 w-8 flex items-center justify-center"
          size="icon"
        >
          <Plus className="h-5 w-5" /> {/* Mantido h-5 w-5 para o ícone */}
        </Button>
      </div>
    </div>
  );
};