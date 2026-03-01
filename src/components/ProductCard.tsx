import React from 'react';
import { Product } from '../types'; // Corrected import path
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { cn } from '../utils/cn';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void; // Alterado para onProductClick
  isPromotion?: boolean;
  isMercadoPagoReturnFlow: boolean; // Nova prop
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onProductClick, isPromotion = false, isMercadoPagoReturnFlow }) => {
  return (
    <div className={cn(
      "group flex flex-col rounded-lg shadow-sm border h-full relative",
      isPromotion ? "p-4 bg-red-50 border-red-300 shadow-md" : "p-2 bg-white border-gray-200",
      "overflow-visible" // Crucial para a imagem 'estourar' para fora do card
    )}>
      {/* Imagem e informações básicas no topo */}
      <div className={cn(
        "flex items-center",
        isPromotion ? "gap-1 mb-1" : "gap-1 mb-1"
      )}>
        <img
          src={product.image}
          alt={product.name}
          className={cn(
            "object-left rounded-md flex-shrink-0 transition-transform duration-300 relative", // Removido z-10 da base
            isPromotion ? "w-[51%] h-[100%]" : "w-32 h-[100%]",
            "lg:group-hover:scale-200 lg:group-hover:z-50 lg:group-hover:shadow-lg" // Apenas em desktop, escala aumentada, z-index mais alto
          )}
        />
        <div className="flex-grow">
          <h3 className={cn(
            "font-semibold text-gray-900",
            isPromotion ? "text-base" : "text-base"
          )}>{product.name}</h3>
          {product.badge_text && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full mt-1 mb-1 block w-fit line-clamp-1">
              {product.badge_text}
            </span>
          )}
        </div>
      </div>

      {/* Descrição do produto, ocupando o espaço restante */}
      <p className={cn(
        "text-gray-600 line-clamp-2 flex-grow",
        isPromotion ? "text-sm mb-2" : "text-sm mb-1"
      )}>{product.description}</p>

      {/* Preço e botão no canto inferior direito */}
      <div className="flex items-baseline justify-between mt-auto">
        <div className="flex items-baseline gap-1">
          {product.promotional_price_single ? (
            <span className={cn(
              "font-bold text-red-600",
              isPromotion ? "text-lg" : "text-lg"
            )}>
              Por apenas R$ {product.promotional_price_single.toFixed(2)}
            </span>
          ) : (
            <>
              {product.original_price && product.original_price > 0 && (
                <span className={cn(
                  "text-gray-500 line-through",
                  isPromotion ? "text-sm" : "text-sm"
                )}>
                  R$ {product.original_price.toFixed(2)}
                </span>
              )}
              {product.price > 0 && (
                <span className={cn(
                  "font-bold text-red-600",
                  isPromotion ? "text-lg" : "text-lg"
                )}>
                  R$ {product.price.toFixed(2)}
                </span>
              )}
            </>
          )}
        </div>
        {/* Chama onProductClick */}
        <Button
          onClick={() => onProductClick(product)}
          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-md flex-shrink-0 h-8 w-8 flex items-center justify-center"
          size="icon"
          disabled={isMercadoPagoReturnFlow} // Desabilita o botão se estiver no fluxo de retorno do Mercado Pago
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};