import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Product } from '../App';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, observations?: string) => void;
  isStoreOpen: boolean;
  canPlaceOrder: boolean; // Nova prop
  isMercadoPagoReturnFlow: boolean; // Nova prop
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  isStoreOpen,
  canPlaceOrder, // Nova prop
  isMercadoPagoReturnFlow, // Nova prop
}) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');

  const handleQuantityChange = (amount: number) => {
    if (isMercadoPagoReturnFlow) {
      toast.error('Finalize seu pedido atual antes de alterar a quantidade.');
      return;
    }
    setQuantity(prev => Math.max(1, prev + amount));
  };

  const handleAddToCartClick = () => {
    if (isMercadoPagoReturnFlow) {
      toast.error('Finalize seu pedido atual antes de adicionar novos itens.');
      return;
    }
    if (!canPlaceOrder) { // Verifica se pode fazer pedido (incluindo pré-pedido)
      toast.error('Desculpe, não é possível adicionar itens ao carrinho no momento.');
      return;
    }
    onAddToCart(product, quantity, observations.trim() || undefined);
    onClose();
    toast.success(`${quantity}x ${product.name} adicionado ao carrinho!`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover rounded-lg mb-2"
          />

          {product.badge_text && (
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full block w-fit mb-2">
              {product.badge_text}
            </span>
          )}

          <p className="text-gray-700 mb-4">{product.description}</p>

          <div className="flex items-baseline justify-between mb-4">
            <div className="flex items-baseline gap-2">
              {product.original_price && (
                <span className="text-lg text-gray-500 line-through">
                  R$ {product.original_price.toFixed(2)}
                </span>
              )}
              <span className="text-2xl font-bold text-red-600">
                R$ {product.price.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-1">
              Observações (opcional)
            </label>
            <textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ex: Sem cebola, molho extra..."
              className="w-full p-3 border rounded-lg text-sm"
              rows={2}
              disabled={isMercadoPagoReturnFlow} // Desabilita observações
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="bg-gray-200 hover:bg-gray-300 rounded-full p-2"
                disabled={isMercadoPagoReturnFlow} // Desabilita botão de menos
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="bg-gray-200 hover:bg-gray-300 rounded-full p-2"
                disabled={isMercadoPagoReturnFlow} // Desabilita botão de mais
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={handleAddToCartClick}
              disabled={!canPlaceOrder || isMercadoPagoReturnFlow} // Desabilita se não pode fazer pedido ou se estiver no fluxo de retorno do Mercado Pago
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-3 rounded-lg shadow-md flex items-center text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-5 w-5 mr-2" />
              Adicionar ao Carrinho
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};