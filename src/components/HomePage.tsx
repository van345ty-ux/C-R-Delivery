import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Menu } from './Menu';
import { Cart } from './Cart';
import { PromotionModal } from './PromotionModal';
import { Footer } from './Footer'; // Importando o novo componente Footer
import { User, CartItem, Product, Order } from '../App';
import { supabase } from '../integrations/supabase/client';
import { PreOrderModal } from './PreOrderModal'; // Importando o novo modal

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
  showPreOrderModal: boolean; // Nova prop
  setShowPreOrderModal: (show: boolean) => void; // Nova prop
  showPreOrderBanner: boolean; // Nova prop
  isMercadoPagoReturnFlow: boolean; // Nova prop
  isPixReturnFlow: boolean; // Nova prop
  setIsPixReturnFlow: (isReturning: boolean) => void; // Nova prop
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
  showPreOrderModal, // Nova prop
  setShowPreOrderModal, // Nova prop
  showPreOrderBanner, // Nova prop
  isMercadoPagoReturnFlow, // Nova prop
  isPixReturnFlow, // Nova prop
  setIsPixReturnFlow, // Nova prop
}) => {
  const [showCart, setShowCart] = useState(isMercadoPagoReturnFlow || isPixReturnFlow);
  const [showPromotions, setShowPromotions] = useState(false);
  const [cartAnimation, setCartAnimation] = useState(false);
  const [promotions, setPromotions] = useState<Product[]>([]);
  const [promotionModalTitle, setPromotionModalTitle] = useState('Promoções do Dia');
  const [menuFilter, setMenuFilter] = useState('Todos');

  useEffect(() => {
    const fetchPromotionsAndSettings = async () => {
      // Se estiver no fluxo de retorno do Mercado Pago, abre o carrinho e suprime o modal de promoção
      if (isMercadoPagoReturnFlow || isPixReturnFlow) {
        console.log('HomePage: External payment return flow detected, suppressing promotion modal.');
        setShowPromotions(false); // Suprime o modal de promoção
        setShowCart(true); // Abre o carrinho automaticamente
        return; // Não busca promoções se estiver retornando de pagamento externo
      }

      // Só mostra o pop-up de promoção se ainda não foi visto E o modal de pré-pedido não estiver ativo
      const hasSeenPromotionModal = localStorage.getItem('hasSeenPromotionModal');
      if (hasSeenPromotionModal !== 'true' && !showPreOrderModal) {
        const { data: promotionsData, error: promotionsError } = await supabase
          .from('products')
          .select('*')
          .eq('category', 'Promoção')
          .eq('available', true);

        if (promotionsError) {
          console.error('Error fetching promotions:', promotionsError);
        } else if (promotionsData && promotionsData.length > 0) {
          setPromotions(promotionsData);
          const timer = setTimeout(() => {
            setShowPromotions(true);
            localStorage.setItem('hasSeenPromotionModal', 'true'); // Define a flag após exibir
          }, 1000);
        }
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'promotion_modal_title')
        .single();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching promotion title setting:', settingsError);
      } else if (settingsData && settingsData.value) {
        setPromotionModalTitle(settingsData.value);
      }
    };

    // Só busca promoções e configurações se o modal de pré-pedido não estiver ativo
    if (!showPreOrderModal) {
      fetchPromotionsAndSettings();
    }
  }, [showPreOrderModal, isMercadoPagoReturnFlow, isPixReturnFlow]); // Adicionado isPixReturnFlow como dependência

  const handleAddToCart = (product: Product, quantity = 1, observations?: string) => {
    onAddToCart(product, quantity, observations || undefined);
    setCartAnimation(true);
    setTimeout(() => setCartAnimation(false), 2000);
  };

  const handleViewPromotion = () => {
    setMenuFilter('Promoções');
    setShowPromotions(false);
    // Esta ação (Ver no Cardápio) não acionará a notificação de cupom, conforme solicitado.
  };

  const handleClosePromotionModal = (source?: 'full_menu' | 'x_button') => { // Recebe a origem
    console.log('HomePage - handleClosePromotionModal called, source:', source, 'pendingCouponNotificationUserId prop:', pendingCouponNotificationUserId);
    setShowPromotions(false);
    // Apenas mostra a notificação de cupom se o modal foi fechado pelo botão "Ver Cardápio Completo"
    if (source === 'full_menu' && pendingCouponNotificationUserId) {
      setShowUserCouponNotification(true);
      setPendingCouponNotificationUserId(null);
      console.log('HomePage - Setting setShowUserCouponNotification to true and clearing pendingCouponNotificationUserId');
    }
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
          showPreOrderBanner={showPreOrderBanner} // Nova prop
          isMercadoPagoReturnFlow={isMercadoPagoReturnFlow} // Passando a nova prop
        />
      </main>

      {cartAnimation && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-down z-50">
          ✅ Adicionado ao carrinho
        </div>
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
          // Após fechar o modal de pré-pedido, verifica se o modal de promoção deve abrir
          const hasSeenPromotionModal = localStorage.getItem('hasSeenPromotionModal');
          if (hasSeenPromotionModal !== 'true' && promotions.length > 0) {
            setShowPromotions(true);
            localStorage.setItem('hasSeenPromotionModal', 'true');
          }
        }} />
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