import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Menu } from './Menu';
import { Cart } from './Cart';
import { PromotionModal } from './PromotionModal';
import { Footer } from './Footer'; // Importando o novo componente Footer
import { User, CartItem, Product, Order } from '../App';
import { supabase } from '../integrations/supabase/client';

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
}) => {
  const [showCart, setShowCart] = useState(false);
  const [showPromotions, setShowPromotions] = useState(false);
  const [cartAnimation, setCartAnimation] = useState(false);
  const [promotions, setPromotions] = useState<Product[]>([]);
  const [promotionModalTitle, setPromotionModalTitle] = useState('Promoções do Dia');
  const [menuFilter, setMenuFilter] = useState('Todos');

  useEffect(() => {
    const fetchPromotionsAndSettings = async () => {
      const hasInitiatedMercadoPagoPayment = localStorage.getItem('hasInitiatedMercadoPagoPayment');
      const hasSeenPromotionModal = localStorage.getItem('hasSeenPromotionModal'); // Nova flag

      if (hasInitiatedMercadoPagoPayment === 'true') {
        console.log('HomePage: Returning from Mercado Pago, suppressing promotion modal and opening cart.');
        setShowPromotions(false); // Suprime o modal de promoção
        setShowCart(true); // Abre o carrinho automaticamente
        localStorage.removeItem('hasInitiatedMercadoPagoPayment'); // Limpa a flag
        return; // Não busca promoções se estiver retornando do MP
      }

      // Só mostra o pop-up de promoção se ainda não foi visto
      if (hasSeenPromotionModal !== 'true') {
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

    fetchPromotionsAndSettings();
  }, []);

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
          onClose={() => setShowCart(false)}
          onUpdateQuantity={onUpdateCartItem}
          onRemoveItem={onRemoveFromCart}
          onOrderCreated={onOrderCreated}
          user={user}
          isStoreOpen={isStoreOpen}
        />
      )}

      {showPromotions && promotions.length > 0 && (
        <PromotionModal
          promotions={promotions}
          onClose={handleClosePromotionModal}
          title={promotionModalTitle}
          onViewPromotion={handleViewPromotion}
          onAddToCart={handleAddToCart} 
        />
      )}
      <Footer /> {/* Adicionando o Footer aqui */}
    </div>
  );
};