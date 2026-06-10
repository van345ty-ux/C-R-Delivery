import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Menu } from './Menu';
import { Cart } from './Cart';
import { PromotionModal } from './PromotionModal';
import { Footer } from './Footer'; // Importando o novo componente Footer
import { User, CartItem, Product, Order } from '../types'; // Corrected import path
import { supabase } from '../integrations/supabase/client';
import { PreOrderModal } from './PreOrderModal'; // Importando o novo modal
import { EasterPopup } from './EasterPopup'; // Importando o novo popup de Páscoa

interface HomePageProps {
  selectedCity: string;
  user: User | null;
  cart: CartItem[];
  onAddToCart: (product: Product, quantity?: number, observations?: string) => void;
  onRemoveFromCart: (productId: string) => void;
  onUpdateCartItem: (productId: string, quantity: number) => void;
  onLogin: () => void;
  onOrderCreated: (order: Order) => void;
  onBackToLocationSelect: () => void;
  onProfileClick: () => void;
  logoUrl: string;
  isStoreOpen: boolean;
  canPlaceOrder: boolean; // Nova prop
  pendingCouponNotificationUserId: string | null;
  setPendingCouponNotificationUserId: (id: string | null) => void;
  setShowUserCouponNotification: (show: boolean) => void;
  // Novas props para o título e subtítulo do hero
  heroImageUrl: string;
  heroTitleText: string;
  heroTitleFontSize: string;
  heroTitleFontColor: string;
  heroTitleBorderColor: string;
  heroSubtitleText: string;
  heroSubtitleFontSize: string;
  heroSubtitleFontColor: string;
  heroSubtitleBorderColor: string;
  heroTextBackgroundEnabled: boolean; // Nova prop
  showPreOrderModal: boolean; // Nova prop
  setShowPreOrderModal: (show: boolean) => void; // Nova prop
  showPreOrderBanner: boolean; // Nova prop
  isMercadoPagoReturnFlow: boolean; // Nova prop
  isPixReturnFlow: boolean; // Nova prop
  setIsPixReturnFlow: (isReturning: boolean) => void; // Nova prop
  menuMobileColumns: string; // Nova prop para controlar colunas no mobile
  onTriggerValentine: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  selectedCity,
  user,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onUpdateCartItem,
  onLogin,
  onOrderCreated,
  onBackToLocationSelect,
  onProfileClick,
  logoUrl,
  isStoreOpen,
  canPlaceOrder, // Nova prop
  pendingCouponNotificationUserId,
  setPendingCouponNotificationUserId,
  setShowUserCouponNotification,
  // Novas props
  heroImageUrl,
  heroTitleText,
  heroTitleFontSize,
  heroTitleFontColor,
  heroTitleBorderColor,
  heroSubtitleText,
  heroSubtitleFontSize,
  heroSubtitleFontColor,
  heroSubtitleBorderColor,
  heroTextBackgroundEnabled, // Nova prop
  showPreOrderModal, // Nova prop
  setShowPreOrderModal, // Nova prop
  showPreOrderBanner, // Nova prop
  isMercadoPagoReturnFlow, // Nova prop
  isPixReturnFlow, // Nova prop
  setIsPixReturnFlow, // Nova prop
  menuMobileColumns, // Nova prop para controlar colunas no mobile
  onTriggerValentine,
}) => {
  const [showCart, setShowCart] = useState(isMercadoPagoReturnFlow || isPixReturnFlow);
  const [showPromotions, setShowPromotions] = useState(false);
  const [cartAnimation, setCartAnimation] = useState(false);
  const [promotions, setPromotions] = useState<Product[]>([]);
  const [promotionModalTitle, setPromotionModalTitle] = useState('Promoções do Dia');
  const [menuFilter, setMenuFilter] = useState(localStorage.getItem('pendingMenuFilter') || 'Todos');
  const [showEasterPopup, setShowEasterPopup] = useState(false);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [hasTriggeredOnLoad, setHasTriggeredOnLoad] = useState(false);

  useEffect(() => {
    const PROMOTION_MODAL_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 horas
    const LAST_SHOWN_KEY = 'promotionModalLastShown';

    // Função para buscar o título do modal, que pode ser executada independentemente
    const fetchModalTitle = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'promotion_modal_title')
        .single();
      if (!error && data) {
        setPromotionModalTitle(data.value);
      }
    };

    fetchModalTitle();

    // Condições de saída antecipada: não mostrar modal se estiver em fluxos de pagamento
    if (isMercadoPagoReturnFlow || isPixReturnFlow) {
      setLoadingPromotions(false);
      return;
    }

    const shouldShowOnLoadFromLocation = localStorage.getItem('showPromotionModalOnLoad') === 'true';

    // Se a flag estiver presente, remove-a para não disparar novamente em um refresh
    if (shouldShowOnLoadFromLocation) {
      localStorage.removeItem('showPromotionModalOnLoad');
    }

    if (localStorage.getItem('pendingMenuFilter')) {
      localStorage.removeItem('pendingMenuFilter');
    }

    const lastShownTimestamp = parseInt(localStorage.getItem(LAST_SHOWN_KEY) || '0');
    const isCooldownActive = (Date.now() - lastShownTimestamp) < PROMOTION_MODAL_COOLDOWN_MS;

    const fetchPromotionsData = async () => {
      try {
        const { data: promotionsData, error } = await supabase
          .from('products')
          .select('*')
          .eq('category', 'Promoção')
          .eq('available', true);

        if (error) {
          console.error('Error fetching promotions:', error);
          return;
        }

        if (promotionsData) {
          setPromotions(promotionsData);

          // SÓ exibe o modal de promoções se:
          // 1. O modal de pré-pedido NÃO estiver aberto agora
          // 2. O cooldown permitir OU foi redirecionado da localização
          // 3. Houver promoções ativas cadastradas
          if (!showPreOrderModal && (shouldShowOnLoadFromLocation || !isCooldownActive) && promotionsData.length > 0) {
            setShowPromotions(true);
            // Atualiza o timestamp de quando o modal foi exibido pela última vez
            localStorage.setItem(LAST_SHOWN_KEY, Date.now().toString());
          }
        }
      } finally {
        setLoadingPromotions(false);
      }
    };

    fetchPromotionsData();
  }, [isMercadoPagoReturnFlow, isPixReturnFlow, showPreOrderModal]);

  // Efeito secundário: dispara a animação do Dia dos Namorados assim que o cliente fechar todos os modais iniciais
  useEffect(() => {
    if (
      !showPreOrderModal &&
      !showPromotions &&
      !showEasterPopup &&
      !loadingPromotions &&
      !hasTriggeredOnLoad
    ) {
      onTriggerValentine();
      setHasTriggeredOnLoad(true);
    }
  }, [showPreOrderModal, showPromotions, showEasterPopup, loadingPromotions, hasTriggeredOnLoad, onTriggerValentine]);

  const handleAddToCart = (product: Product, quantity = 1, observations?: string) => {
    onAddToCart(product, quantity, observations || undefined);
    setCartAnimation(true);
    setTimeout(() => setCartAnimation(false), 2000);
  };

  const handleViewPromotion = () => {
    setMenuFilter('Promoções'); // ✅ Apenas muda o estado
    setShowPromotions(false);
  };

  const handleClosePromotionModal = (source?: 'full_menu' | 'x_button') => {
    setShowPromotions(false); // ✅ Apenas fecha o modal
  };

  const handleCloseCart = () => {
    setShowCart(false);
    if (isPixReturnFlow) {
      setIsPixReturnFlow(false); // Isso também limpará o localStorage através do useEffect no App.tsx
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col"> {/* Adicionado flex flex-col */}
      <Header
        selectedCity={selectedCity}
        user={user}
        cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onLogin={onLogin}
        onCartClick={() => setShowCart(true)}
        onBackToLocationSelect={onBackToLocationSelect}
        onProfileClick={onProfileClick}
        logoUrl={logoUrl}
      />

      <main className="flex-grow"> {/* Adicionado flex-grow */}
        <Menu
          onAddToCart={handleAddToCart}
          selectedCategory={menuFilter}
          onCategoryChange={setMenuFilter}
          isStoreOpen={isStoreOpen}
          canPlaceOrder={canPlaceOrder} // Passando o novo estado
          heroImageUrl={heroImageUrl}
          // Passando as novas props
          heroTitleText={heroTitleText}
          heroTitleFontSize={heroTitleFontSize}
          heroTitleFontColor={heroTitleFontColor}
          heroTitleBorderColor={heroTitleBorderColor}
          heroSubtitleText={heroSubtitleText}
          heroSubtitleFontSize={heroSubtitleFontSize}
          heroSubtitleFontColor={heroSubtitleFontColor}
          heroSubtitleBorderColor={heroSubtitleBorderColor}
          heroTextBackgroundEnabled={heroTextBackgroundEnabled} // Nova prop
          showPreOrderBanner={showPreOrderBanner} // Nova prop
          isMercadoPagoReturnFlow={isMercadoPagoReturnFlow} // Passando a nova prop
          menuMobileColumns={menuMobileColumns} // Nova prop para controlar colunas no mobile
          onTriggerValentine={onTriggerValentine}
        />
      </main>

      {cartAnimation && (
        <>
          <style>{`
            @keyframes slideDownAlertV2 {
              0% {
                transform: translateY(-50px) scale(0.9);
                opacity: 0;
              }
              15% {
                transform: translateY(0) scale(1);
                opacity: 1;
              }
              85% {
                transform: translateY(0) scale(1);
                opacity: 1;
              }
              100% {
                transform: translateY(-20px) scale(0.95);
                opacity: 0;
              }
            }
            .cart-toast-alert-v2 {
              animation: slideDownAlertV2 2.0s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
            }
          `}</style>
          <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg cart-toast-alert-v2 z-50">
            ✅ Adicionado ao carrinho
          </div>
        </>
      )}

      {showCart && (
        <Cart
          items={cart}
          onClose={handleCloseCart}
          onUpdateQuantity={onUpdateCartItem}
          onRemoveItem={onRemoveFromCart}
          onOrderCreated={onOrderCreated}
          user={user}
          isStoreOpen={isStoreOpen}
          canPlaceOrder={canPlaceOrder}
          isMercadoPagoReturnFlow={isMercadoPagoReturnFlow}
          isPixReturnFlow={isPixReturnFlow}
        />
      )}

      {/* PreOrderModal takes precedence */}
      {showPreOrderModal ? (
        <PreOrderModal onClose={() => {
          setShowPreOrderModal(false);
          if (showEasterPopup) {
            // Already handled by component below
          } else if (promotions.length > 0) {
            setShowPromotions(true);
          }
        }} />
      ) : showEasterPopup ? (
        <EasterPopup
          onClose={() => {
            setShowEasterPopup(false);
            if (promotions.length > 0) setShowPromotions(true);
          }}
          onGoToMenu={() => {
            setShowEasterPopup(false);
            setMenuFilter('Todos'); // Mudado de 'Ovos de Sushi' para 'Todos'

          }}
        />
      ) : (
        showPromotions && promotions.length > 0 && (
          <PromotionModal
            promotions={promotions}
            onClose={handleClosePromotionModal}
            title={promotionModalTitle}
            onViewPromotion={handleViewPromotion}
            onAddToCart={handleAddToCart}
          />
        )
      )}
      <Footer /> {/* Adicionando o Footer aqui */}
    </div>
  );
};