import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Product } from '../types';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, observations?: string) => void;
  canPlaceOrder: boolean; // Nova prop
  isMercadoPagoReturnFlow: boolean; // Nova prop
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
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
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in modal-backdrop-premium"
      onClick={onClose}
    >
      <div 
        className="max-w-md w-full max-h-[80vh] flex flex-col animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1F1F1F',
          borderRadius: '1rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          borderLeft: '3px solid #C41E3A',
          borderRight: '3px solid #C41E3A',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-5 py-4"
          style={{ 
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <h2 
            className="text-xl font-bold pr-3 flex-1"
            style={{ 
              color: '#FFFFFF',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
              lineHeight: '1.3'
            }}
          >
            {product.name}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg transition-all duration-200 hover:bg-opacity-80 flex-shrink-0"
            style={{
              color: '#FFFFFF',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Fechar detalhes do produto"
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ width: '12px', height: '12px' }}
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-grow">
          {/* Image */}
          <div className="relative mb-4 overflow-hidden" style={{ 
            borderRadius: '0.75rem'
          }}>
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-48 object-cover"
            />
            {product.badge_text && (
              <div 
                className="absolute top-3 right-3 font-bold px-3 py-1.5 text-xs"
                style={{
                  borderRadius: '100px',
                  color: '#FFFFFF',
                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.6)'
                }}
              >
                {product.badge_text}
              </div>
            )}
          </div>

          {/* Description */}
          <p 
            className="text-sm mb-4 leading-relaxed"
            style={{ 
              color: '#D4D4D4'
            }}
          >
            {product.description}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            {product.original_price && (
              <span 
                className="text-base line-through"
                style={{ 
                  color: '#A3A3A3'
                }}
              >
                R$ {product.original_price.toFixed(2)}
              </span>
            )}
            <span 
              className="text-2xl font-bold"
              style={{ 
                fontFamily: 'var(--font-display)',
                color: '#EF4444'
              }}
            >
              R$ {product.price.toFixed(2)}
            </span>
          </div>

          {/* Observations */}
          <div className="mb-0">
            <label 
              htmlFor="observations" 
              className="block text-sm font-semibold mb-2"
              style={{ 
                color: '#FFFFFF'
              }}
            >
              Observações (opcional)
            </label>
            <textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ex: Sem cebola..."
              className="w-full p-3 text-sm"
              style={{
                resize: 'none',
                minHeight: '44px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '0.5rem',
                color: '#FFFFFF',
                outline: 'none'
              }}
              rows={1}
              disabled={isMercadoPagoReturnFlow}
              aria-label="Observações adicionais para o produto"
            />
          </div>
        </div>

        {/* Footer - Quantity and Add Button */}
        <div 
          className="p-4"
          style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex items-center justify-between gap-3">
            {/* Quantity Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={isMercadoPagoReturnFlow}
                className="rounded-lg transition-all duration-200 hover:bg-opacity-80 active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Diminuir quantidade"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span 
                className="w-10 text-center text-xl font-bold"
                style={{ 
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-display)'
                }}
                aria-label={`Quantidade: ${quantity}`}
              >
                {quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={isMercadoPagoReturnFlow}
                className="rounded-lg transition-all duration-200 hover:bg-opacity-80 active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCartClick}
              disabled={!canPlaceOrder || isMercadoPagoReturnFlow}
              className="flex-1 flex items-center justify-center text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-90 active:scale-98"
              style={{
                fontFamily: 'var(--font-body)',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                cursor: 'pointer',
                height: '40px'
              }}
              aria-label={`Adicionar ${quantity} ${product.name} ao carrinho`}

            >
              <span>Adicionar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};