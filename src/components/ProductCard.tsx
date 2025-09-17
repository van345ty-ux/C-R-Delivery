import React, { useState } from 'react';
import { Product } from '../App';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { cn } from '../utils/cn';
import { ImageEnlargeModal } from './ImageEnlargeModal'; // Importando o novo componente

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isPromotion?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, isPromotion = false }) => {
  const [showAmplifyText, setShowAmplifyText] = useState(false);
  const [showEnlargeModal, setShowEnlargeModal] = useState(false);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState('');

  const handleImageClick = () => {
    setEnlargedImageUrl(product.image);
    setShowEnlargeModal(true);
  };

  const handleCloseEnlargeModal = () => {
    setShowEnlargeModal(false);
    setEnlargedImageUrl('');
  };

  return (
    <div className={cn(
      "group flex flex-col rounded-lg shadow-sm border h-full relative",
      isPromotion ? "p-4 bg-red-50 border-red-300 shadow-md" : "p-2 bg-white border-gray-200",
      "overflow-visible"
    )}>
      {/* Imagem e informações básicas no topo */}
      <div className={cn(
        "flex items-center",
        isPromotion ? "gap-2 mb-2" : "gap-2 mb-1"
      )}>
        <div
          className={cn(
            "relative rounded-md flex-shrink-0 overflow-hidden",
            isPromotion ? "w-[62%] h-[100%] " : "w-[46%] h-[100%]",
            "lg:cursor-pointer" // Indica que é clicável em desktop
          )}
          onMouseEnter={() => setShowAmplifyText(true)}
          onMouseLeave={() => setShowAmplifyText(false)}
          onClick={handleImageClick}
        >
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-300"
          />
          {showAmplifyText && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-white text-sm font-bold">Amplie</span>
            </div>
          )}
        </div>
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
          {product.original_price && (
            <span className={cn(
              "text-gray-500 line-through",
              isPromotion ? "text-sm" : "text-sm"
            )}>
              R$ {product.original_price.toFixed(2)}
            </span>
          )}
          <span className={cn(
            "font-bold text-red-600",
            isPromotion ? "text-lg" : "text-lg"
          )}>
            R$ {product.price.toFixed(2)}
          </span>
        </div>
        <Button
          onClick={() => onAddToCart(product)}
          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-md flex-shrink-0 h-8 w-8 flex items-center justify-center"
          size="icon"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {showEnlargeModal && (
        <ImageEnlargeModal imageUrl={enlargedImageUrl} onClose={handleCloseEnlargeModal} />
      )}
    </div>
  );
};