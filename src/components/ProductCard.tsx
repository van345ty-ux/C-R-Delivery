import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Product } from '../App';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity?: number, observations?: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleAddToCart = () => {
    onAddToCart(product, quantity, observations || undefined);
    setQuantity(1);
    setObservations('');
    setShowDetails(false);
  };

  const isPromotionDisplay = product.original_price && product.original_price > product.price;
  const isPromotionCategory = product.category === 'Promoção';

  // Definindo classes de tamanho para o contêiner da imagem
  // Para promoções, usaremos w-40 h-[135px]
  // Para produtos padrão, aumentamos para w-[114px] h-[89px] (112px+2px e 87px+2px)
  const imageContainerClasses = isPromotionCategory
    ? `w-40 h-[135px] flex-shrink-0 rounded-lg`
    : `w-[114px] h-[89px] flex-shrink-0 rounded-lg`;

  const imageStyle = isPromotionCategory
    ? { transform: 'translateY(3px) translateX(2px)' } // Ajustado de 4px para 3px para subir 1px
    : {
        transform: 'translateY(9.5%) translateX(5%)',
      };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex w-full">
        {/* Image Section */}
        <div
          className={imageContainerClasses}
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover rounded-lg"
            style={imageStyle}
          />
        </div>

        {/* Content Section */}
        <div className="p-2 flex flex-col flex-grow">
          <div className="flex-grow">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-gray-900 text-base">{product.name}</h3>
              {product.badge_text && (
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full ml-2 flex-shrink-0">
                  {product.badge_text}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-xs mb-2 line-clamp-2">
              {product.description}
            </p>
          </div>

          <div className="flex items-end justify-between mt-2">
            <div style={isPromotionDisplay ? { transform: 'translateY(-2px)' } : {}}>
              {isPromotionDisplay ? (
                <>
                  <span className="text-xs text-gray-500 line-through">
                    R$ {product.original_price!.toFixed(2)}
                  </span>
                  <span className="text-base font-bold text-green-600 block">
                    R$ {product.price.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-base font-bold text-green-600">
                  R$ {product.price.toFixed(2)}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowDetails(true)}
              className="bg-red-600 text-white py-1.5 px-3 rounded-lg hover:bg-red-700 transition-colors font-normal text-sm"
              style={isPromotionDisplay ? { transform: 'translateY(-2px)' } : {}}
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <button
                onClick={() => setShowDetails(false)}
                className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-600 mb-4">{product.description}</p>
              <div className="flex items-baseline space-x-2 mb-6">
                {isPromotionDisplay ? (
                  <>
                    <p className="text-lg text-gray-500 line-through">
                      R$ {product.original_price!.toFixed(2)}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    R$ {product.price.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-medium w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Observations */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Alguma preferência ou observação especial..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Adicionar (R$ {(product.price * quantity).toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};