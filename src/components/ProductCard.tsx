import React from 'react';
import { Product } from '../types';
import { Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils/cn';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
  isPromotion?: boolean;
  isMercadoPagoReturnFlow: boolean;
  isCompactMode?: boolean; // Nova prop para modo compacto (2 colunas no mobile)
  isHorizontalMode?: boolean; // Nova prop para layout horizontal
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onProductClick, isPromotion = false, isMercadoPagoReturnFlow, isCompactMode = false, isHorizontalMode = false }) => {
  const { isWorldCupMode } = useTheme();

  // Layout horizontal: imagem pequena à esquerda, detalhes ao lado
  if (isHorizontalMode) {
    return (
      <div 
        className={cn(
          "group relative flex overflow-hidden transition-all duration-300 animate-fade-in premium-card-hover cursor-pointer",
          isPromotion ? "p-4" : "p-3"
        )}
        style={{
          backgroundColor: isPromotion ? 'var(--promo-card-bg)' : 'var(--bg-elevated)',
          borderLeft: `4px solid ${
            isWorldCupMode
              ? (isPromotion ? '#fbbf24' : '#16a34a')
              : (isPromotion ? 'var(--promo-left-border)' : '#DC2626')
          }`,
          borderRadius: '24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)'
        }}
        onClick={() => !isMercadoPagoReturnFlow && onProductClick(product)}
      >
        {/* Badge with glassmorphism - posicionado no canto superior direito do card */}
        {product.badge_text && (
          <div 
            className="absolute top-2 right-2 font-bold backdrop-blur-md animate-scale-in text-xs px-2 py-0.5 z-10"
            style={{
              borderRadius: 'var(--radius-full)',
              color: isWorldCupMode ? '#FFFFFF' : (isPromotion ? 'var(--promo-badge-text)' : '#FFFFFF'),
              background: isWorldCupMode 
                ? 'linear-gradient(to right, #15803d, #facc15, #15803d)' 
                : (isPromotion ? 'var(--promo-badge-bg)' : 'var(--accent-primary)'),
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {product.badge_text}
          </div>
        )}

        {/* Imagem pequena à esquerda */}
        <div 
          className={cn(
            "relative flex-shrink-0 overflow-hidden",
            isPromotion ? "w-32 h-32" : "w-24 h-24"
          )}
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={isPromotion ? "128" : "96"}
            height={isPromotion ? "128" : "96"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {/* Gradient overlay on hover */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(to top, var(--overlay-dark) 0%, transparent 50%)'
            }}
          />
        </div>

        {/* Conteúdo ao lado direito */}
        <div className={cn(
          "flex flex-col flex-grow min-w-0",
          isPromotion ? "ml-4" : "ml-3"
        )}>
          {/* Nome do produto */}
          <h3 
            className={cn(
              "font-semibold text-sm line-clamp-2 mb-0.5",
              isPromotion ? "mt-5" : "mt-2"
            )}
            style={{ 
              color: isPromotion ? 'var(--promo-name-text)' : 'var(--text-primary)',
              fontFamily: 'var(--font-body)'
            }}
          >
            {product.name}
          </h3>

          {/* Descrição */}
          <p 
            className={cn(
              "text-xs",
              isPromotion ? "line-clamp-3 mb-2" : "line-clamp-2 mb-0"
            )}
            style={{ color: 'var(--text-secondary)' }}
          >
            {product.description}
          </p>

          {/* Preço e botão na parte inferior */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              {product.promotional_price_single ? (
                <span 
                  className={cn("font-bold text-xl leading-none", !isPromotion && "gradient-text")}
                  style={{ 
                    fontFamily: 'var(--font-display)', 
                    letterSpacing: '-0.5px',
                    ...(isPromotion ? {
                      color: 'var(--promo-price-text)',
                      backgroundColor: 'var(--promo-price-bg)',
                      padding: 'var(--promo-price-padding)',
                      borderRadius: 'var(--promo-price-radius)'
                    } : {})
                  }}
                >
                  R$ {product.promotional_price_single.toFixed(2)}
                </span>
              ) : (
                <>
                  {product.original_price && product.original_price > 0 && (
                    <span 
                      className="line-through text-xs mb-0"
                      style={{ color: isPromotion ? 'var(--promo-old-price-color)' : 'var(--text-tertiary)' }}
                    >
                      R$ {product.original_price.toFixed(2)}
                    </span>
                  )}
                  {product.price > 0 && (
                    <span 
                      className={cn("font-bold text-xl leading-none", !isPromotion && "gradient-text")}
                      style={{ 
                        fontFamily: 'var(--font-display)', 
                        letterSpacing: '-0.5px',
                        ...(isPromotion ? {
                          color: 'var(--promo-price-text)',
                          backgroundColor: 'var(--promo-price-bg)',
                          padding: 'var(--promo-price-padding)',
                          borderRadius: 'var(--promo-price-radius)'
                        } : {})
                      }}
                    >
                      R$ {product.price.toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </div>
            
            {/* Add to cart button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isMercadoPagoReturnFlow) onProductClick(product);
              }}
              disabled={isMercadoPagoReturnFlow}
              className={cn(
                "flex-shrink-0 flex items-center justify-center transition-all duration-300",
                "hover:scale-110 active:scale-95 min-h-[36px] min-w-[36px] h-9 w-9",
                isMercadoPagoReturnFlow && "opacity-50 cursor-not-allowed"
              )}
              style={{
                background: isWorldCupMode
                  ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                  : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: isWorldCupMode ? '#000000' : 'var(--text-inverse)',
                borderRadius: 'var(--radius-full)',
                boxShadow: 'var(--shadow-md)',
                border: isPromotion ? 'var(--promo-button-border)' : 'none'
              }}
              aria-label={`Adicionar ${product.name} ao carrinho`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Layout vertical original (1 coluna ou 2 colunas compactas)
  return (
    <div 
      className={cn(
        "group flex flex-col h-full overflow-hidden transition-all duration-300 animate-fade-in",
        "premium-card-hover cursor-pointer",
        isCompactMode ? "p-2" : "p-0"
      )}
      style={{
        backgroundColor: isPromotion ? 'var(--promo-card-bg)' : 'var(--bg-elevated)',
        border: isPromotion ? '1px solid var(--border-accent)' : '1px solid var(--border-primary)',
        borderLeft: `4px solid ${
          isWorldCupMode
            ? (isPromotion ? '#fbbf24' : '#16a34a')
            : (isPromotion ? 'var(--promo-left-border)' : 'var(--accent-primary)')
        }`,
        borderRight: `4px solid ${
          isWorldCupMode
            ? (isPromotion ? '#fbbf24' : '#16a34a')
            : (isPromotion ? 'var(--promo-left-border)' : 'var(--accent-primary)')
        }`,
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)'
      }}
      onClick={() => !isMercadoPagoReturnFlow && onProductClick(product)}
    >
      {/* Image with gradient overlay */}
      <div className="relative w-full aspect-square overflow-hidden" style={{ borderRadius: isCompactMode ? 'var(--radius-md)' : 'var(--radius-xl) var(--radius-xl) 0 0' }}>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width="400"
          height="400"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Gradient overlay on hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(to top, var(--overlay-dark) 0%, transparent 50%)'
          }}
        />
        
        {/* Badge with glassmorphism */}
        {product.badge_text && (
          <div 
            className={cn(
              "absolute top-3 right-3 font-bold backdrop-blur-md animate-scale-in",
              isCompactMode ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5"
            )}
            style={{
              borderRadius: 'var(--radius-full)',
              color: isWorldCupMode ? '#FFFFFF' : (isPromotion ? 'var(--promo-badge-text)' : '#FFFFFF'),
              background: isWorldCupMode 
                ? 'linear-gradient(to right, #15803d, #facc15, #15803d)' 
                : (isPromotion ? 'var(--promo-badge-bg)' : 'var(--accent-primary)'),
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {product.badge_text}
          </div>
        )}
      </div>

      {/* Content section */}
      <div className={cn(
        "flex flex-col flex-grow",
        isCompactMode ? "p-2" : "p-4"
      )}>
        {/* Product name */}
        <h3 
          className={cn(
            "font-semibold mb-0 line-clamp-2",
            isCompactMode ? "text-sm" : "text-base"
          )}
          style={{ 
            color: isPromotion ? 'var(--promo-name-text)' : 'var(--text-primary)',
            fontFamily: 'var(--font-body)'
          }}
        >
          {product.name}
        </h3>

        {/* Description */}
        {!isCompactMode && (
          <p 
            className="text-sm line-clamp-2 flex-grow mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {product.description}
          </p>
        )}

        {/* Price and button row */}
        <div className={cn(
          "flex items-center justify-between mt-auto",
          isCompactMode && "mt-2"
        )}>
          <div className="flex flex-col">
            {product.promotional_price_single ? (
              <span 
                className={cn(
                  "font-bold leading-none",
                  !isPromotion && "gradient-text",
                  isCompactMode ? "text-xl" : "text-3xl"
                )}
                style={{ 
                  fontFamily: 'var(--font-display)', 
                  letterSpacing: '-0.5px',
                  ...(isPromotion ? {
                    color: 'var(--promo-price-text)',
                    backgroundColor: 'var(--promo-price-bg)',
                    padding: 'var(--promo-price-padding)',
                    borderRadius: 'var(--promo-price-radius)'
                  } : {})
                }}
              >
                R$ {product.promotional_price_single.toFixed(2)}
              </span>
            ) : (
              <>
                {product.original_price && product.original_price > 0 && (
                  <span 
                    className={cn(
                      "line-through mb-0",
                      isCompactMode ? "text-[10px]" : "text-xs"
                    )}
                    style={{ color: isPromotion ? 'var(--promo-old-price-color)' : 'var(--text-tertiary)' }}
                  >
                    R$ {product.original_price.toFixed(2)}
                  </span>
                )}
                {product.price > 0 && (
                  <span 
                    className={cn(
                      "font-bold leading-none",
                      !isPromotion && "gradient-text",
                      isCompactMode ? "text-xl" : "text-3xl"
                    )}
                    style={{ 
                      fontFamily: 'var(--font-display)', 
                      letterSpacing: '-0.5px',
                      ...(isPromotion ? {
                        color: 'var(--promo-price-text)',
                        backgroundColor: 'var(--promo-price-bg)',
                        padding: 'var(--promo-price-padding)',
                        borderRadius: 'var(--promo-price-radius)'
                      } : {})
                    }}
                  >
                    R$ {product.price.toFixed(2)}
                  </span>
                )}
              </>
            )}
          </div>
          
          {/* Add to cart button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isMercadoPagoReturnFlow) onProductClick(product);
            }}
            disabled={isMercadoPagoReturnFlow}
            className={cn(
              "flex-shrink-0 flex items-center justify-center transition-all duration-300",
              "hover:scale-110 active:scale-95",
              isCompactMode ? "min-h-[36px] min-w-[36px] h-9 w-9" : "min-h-[44px] min-w-[44px] h-11 w-11",
              isMercadoPagoReturnFlow && "opacity-50 cursor-not-allowed"
            )}
            style={{
              background: isWorldCupMode
                ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              color: isWorldCupMode ? '#000000' : 'var(--text-inverse)',
              borderRadius: 'var(--radius-full)',
              boxShadow: 'var(--shadow-md)',
              border: isPromotion ? 'var(--promo-button-border)' : 'none'
            }}
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            <Plus className={cn(isCompactMode ? "h-4 w-4" : "h-5 w-5")} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Skeleton loader component for product cards
export const ProductCardSkeleton: React.FC = () => {
  return (
    <div 
      className="overflow-hidden animate-pulse"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)'
      }}
    >
      {/* Image skeleton */}
      <div 
        className="w-full aspect-square skeleton"
        style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}
      />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-4">
        {/* Title skeleton */}
        <div 
          className="h-4 skeleton w-3/4"
          style={{ borderRadius: 'var(--radius-sm)' }}
        />
        
        {/* Description skeleton */}
        <div className="space-y-2">
          <div 
            className="h-3 skeleton w-full"
            style={{ borderRadius: 'var(--radius-sm)' }}
          />
          <div 
            className="h-3 skeleton w-2/3"
            style={{ borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        
        {/* Price and button skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div 
            className="h-5 skeleton w-20"
            style={{ borderRadius: 'var(--radius-sm)' }}
          />
          <div 
            className="h-11 w-11 skeleton"
            style={{ borderRadius: 'var(--radius-full)' }}
          />
        </div>
      </div>
    </div>
  );
};