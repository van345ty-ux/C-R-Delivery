import React from 'react';
import { Product } from '../App';
import { X, Plus } from 'lucide-react'; // Importando Plus
import { Button } from './ui/button'; // Importando Button

interface PromotionModalProps {
  promotions: Product[];
  onClose: (source?: 'full_menu' | 'x_button') => void;
  title: string;
  onViewPromotion: () => void;
  onAddToCart: (product: Product, quantity?: number, observations?: string) => void; // Adicionando onAddToCart
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ promotions, onClose, title, onViewPromotion, onAddToCart }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={() => onClose('x_button')} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-2 overflow-y-auto space-y-4">
          {promotions.map((promo) => (
            <div key={promo.id} className="flex flex-col bg-gray-50 p-4 rounded-lg">
              <img src={promo.image} alt={promo.name} className="w-full h-48 object-cover rounded-md flex-shrink-0" />
              <div className="mt-4">
                <h3 className="font-semibold text-gray-900 mb-1">{promo.name}</h3>
                {promo.badge_text && (
                  <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full block w-fit mb-1">
                    {promo.badge_text}
                  </span>
                )}
                <p className="text-sm text-gray-600 line-clamp-2">{promo.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-baseline gap-2">
                    {promo.original_price && (
                      <span className="text-sm text-gray-500 line-through">
                        R$ {promo.original_price.toFixed(2)}
                      </span>
                    )}
                    <span className="text-lg font-bold text-red-600">
                      R$ {promo.price.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    onClick={() => onAddToCart(promo)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-0.5 rounded-lg shadow-md flex items-center"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 border-t space-y-2">
          <button
            onClick={onViewPromotion}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Ver no Cardápio
          </button>
          <button
            onClick={() => onClose('full_menu')}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Ver Cardápio Completo
          </button>
        </div>
      </div>
    </div>
  );
};