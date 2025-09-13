import React from 'react';
import { X, Tag } from 'lucide-react';
import { Product } from '../App';

interface PromotionModalProps {
  promotions: Product[];
  onClose: (source?: 'full_menu' | 'x_button') => void; // Modificado para aceitar a origem
  title: string;
  onViewPromotion: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ promotions, onClose, title, onViewPromotion }) => {
  const handleViewClick = () => {
    onViewPromotion();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-red-600 flex items-center">
            <Tag className="w-5 h-5 mr-2" />
            {title}
          </h2>
          <button
            onClick={() => onClose('x_button')} // Passa a origem 'x_button'
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {promotions.map((promotion) => {
            const isPromotion = promotion.original_price && promotion.original_price > promotion.price;
            return (
              <div key={promotion.id} className="border rounded-lg overflow-hidden">
                <img
                  src={promotion.image}
                  alt={promotion.name}
                  className="w-full h-32 object-cover"
                />
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900">{promotion.name}</h3>
                    {promotion.badge_text && (
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {promotion.badge_text}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{promotion.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      {isPromotion ? (
                        <>
                          <span className="text-sm text-gray-500 line-through">
                            R$ {promotion.original_price!.toFixed(2)}
                          </span>
                          <span className="text-lg font-bold text-green-600 block">
                            R$ {promotion.price.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-green-600">
                          R$ {promotion.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleViewClick}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-colors"
                    >
                      Ver no Cardápio
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-gray-50 text-center">
          <button
            onClick={() => onClose('full_menu')} // Passa a origem 'full_menu'
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Ver Cardápio Completo
          </button>
        </div>
      </div>
    </div>
  );
};