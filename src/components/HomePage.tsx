import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from './Header';
import { Menu } from './Menu';
import { Cart } from './Cart';
import { PromotionModal } from './PromotionModal';
import { Footer } from './Footer'; // Importando o novo componente Footer
import { User, CartItem, Product, Order } from '../types'; // Corrected import path
import { supabase } from '../integrations/supabase/client';
import { PreOrderModal } from './PreOrderModal'; // Importando o novo modal
import { EasterPopup } from './EasterPopup'; // Importando o novo popup de Páscoa
import { ValentinePopup } from './ValentinePopup'; // Importando o novo popup de Dia dos Namorados
import { WorldCupTheme } from './WorldCupTheme';
import { WorldCupPreOrderPopup } from './WorldCupPreOrderPopup';

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
  isValentineThemeActive: boolean; // Nova prop
  deliveryFee: number;
  comandatubaDeliveryFee: number;
  pixKey: string;
  mercadoPagoLink: string;
  preOrderBannerText?: string; // Novo texto do banner
  worldCupPopupSettings?: {
    title: string;
    subtitle: string;
    warningTitle: string;
    warningDescription: string;
    description: string;
    footer: string;
    buttonText: string;
    check1?: string;
    check2?: string;
    check3?: string;
  };
}

const BRAZIL_GAMES = [
  // Fase de Grupos
  '2026-06-13', // Brasil vs Marrocos
  '2026-06-19', // Brasil vs Haiti
  '2026-06-24', // Escócia vs Brasil

  // Oitavas / Fases Eliminatórias
  '2026-06-29', // Segunda-feira — próximo jogo confirmado
  '2026-06-30',
  '2026-07-01',
  '2026-07-04',
  '2026-07-05',
  '2026-07-06',
  '2026-07-07',
  '2026-07-09',
  '2026-07-10',
  '2026-07-11',
  '2026-07-14',
  '2026-07-15',
  '2026-07-18',
  '2026-07-19'
];

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  isValentineThemeActive, // Nova prop
  deliveryFee,
  comandatubaDeliveryFee,
  pixKey,
  mercadoPagoLink,
  preOrderBannerText,
  worldCupPopupSettings,
}) => {
  const { isWorldCupMode } = useTheme();
  const [worldCupTriggerKey, setWorldCupTriggerKey] = useState(0);
  const hasTriggeredRef = useRef(false);
  const isComandatuba = selectedCity ? selectedCity.toLowerCase().includes('comandatuba') : false;

  const bannerMessage = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayStr = getLocalDateString(today);
    const tomorrowStr = getLocalDateString(tomorrow);

    if (BRAZIL_GAMES.includes(todayStr)) {
      return '🇧🇷 HOJE TEM BRASIL! Rumo ao Hexa! ⚽ Peça seu combo da Seleção agora e garanta a torcida mais saborosa com o melhor sushi! 🍣';
    } else if (BRAZIL_GAMES.includes(tomorrowStr)) {
      if (isComandatuba) {
        return '🇧🇷 AMANHÃ TEM BRASIL! A caminhada rumo ao Hexa continua! ⚽ Garanta ou agende seu combo de sushi hoje e prepare a festa de amanhã! 🍣';
      } else {
        return '🇧🇷 AMANHÃ TEM BRASIL! A caminhada rumo ao Hexa continua! ⚽ Garanta seu combo de sushi hoje e prepare a festa de amanhã! 🍣';
      }
    } else {
      return '🇧🇷 RUMO AO HEXA! Entre no clima da Copa e apoie o Brasil saboreando nossos deliciosos combos de sushi! ⚽🍣';
    }
  }, [selectedCity]);

  const [showCart, setShowCart] = useState(isMercadoPagoReturnFlow || isPixReturnFlow);
  const [showPromotions, setShowPromotions] = useState(false);
  const [cartAnimation, setCartAnimation] = useState(false);
  const [promotions, setPromotions] = useState<Product[]>([]);
  const [promotionModalTitle, setPromotionModalTitle] = useState('Promoções do Dia');
  const [menuFilter, setMenuFilter] = useState(localStorage.getItem('pendingMenuFilter') || 'Todos');
  const [showEasterPopup, setShowEasterPopup] = useState(false);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [hasTriggeredOnLoad, setHasTriggeredOnLoad] = useState(false);
  const [showValentinePopup, setShowValentinePopup] = useState(false);
  const [showWorldCupPreOrderPopup, setShowWorldCupPreOrderPopup] = useState(false);
  const [pendingShowPromotions, setPendingShowPromotions] = useState(false);
  const [pendingShowPreOrder, setPendingShowPreOrder] = useState(false);

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

          const willShowPromotions = (shouldShowOnLoadFromLocation || !isCooldownActive) && promotionsData.length > 0;
          const hasSeenValentine = sessionStorage.getItem('hasSeenValentinePopup') === 'true';
          const hasSeenWorldCupPreOrder = sessionStorage.getItem('hasSeenWorldCupPreOrder') === 'true';

          // [COPA] WorldCupPreOrderPopup ativo apenas para a rota de Comandatuba
          if (isComandatuba && isWorldCupMode && !hasSeenWorldCupPreOrder) {
            setShowWorldCupPreOrderPopup(true);
            if (showPreOrderModal) {
              setPendingShowPreOrder(true);
              setShowPreOrderModal(false);
            }
            if (willShowPromotions) {
              setPendingShowPromotions(true);
            }
          } else if (isValentineThemeActive && !hasSeenValentine) {
            setShowValentinePopup(true);
            if (showPreOrderModal) {
              setPendingShowPreOrder(true);
              setShowPreOrderModal(false); // Esconde temporariamente para dar prioridade ao pop-up dos namorados
            }
            if (willShowPromotions) {
              setPendingShowPromotions(true);
            }
          } else {
            // SÓ exibe o modal de promoções se:
            // 1. O modal de pré-pedido NÃO estiver aberto agora
            // 2. O cooldown permitir OU foi redirecionado da localização
            // 3. Houver promoções ativas cadastradas
            if (!showPreOrderModal && willShowPromotions) {
              setShowPromotions(true);
              // Atualiza o timestamp de quando o modal foi exibido pela última vez
              localStorage.setItem(LAST_SHOWN_KEY, Date.now().toString());
            }
          }
        }
      } finally {
        setLoadingPromotions(false);
      }
    };

    fetchPromotionsData();
  }, [isMercadoPagoReturnFlow, isPixReturnFlow, showPreOrderModal, isValentineThemeActive, isWorldCupMode]);

  // Efeito secundário: dispara a animação do Dia dos Namorados assim que o cliente fechar todos os modais iniciais
  useEffect(() => {
    const hasTriggeredAnim = sessionStorage.getItem('hasTriggeredValentineAnimation') === 'true';
    if (
      !showValentinePopup &&
      !showWorldCupPreOrderPopup &&
      !showPreOrderModal &&
      !showPromotions &&
      !showEasterPopup &&
      !loadingPromotions &&
      !hasTriggeredOnLoad &&
      !hasTriggeredAnim
    ) {
      onTriggerValentine();
      setHasTriggeredOnLoad(true);
      sessionStorage.setItem('hasTriggeredValentineAnimation', 'true');
    }
  }, [showValentinePopup, showWorldCupPreOrderPopup, showPreOrderModal, showPromotions, showEasterPopup, loadingPromotions, hasTriggeredOnLoad, onTriggerValentine]);

  // Efeito secundário para Copa do Mundo: dispara a animação assim que o cliente fechar todos os modais iniciais
  useEffect(() => {
    if (!isWorldCupMode) return;
    console.log('[WorldCup] Checking animation trigger:', {
      showValentinePopup,
      showWorldCupPreOrderPopup,
      showPreOrderModal,
      showPromotions,
      showEasterPopup,
      loadingPromotions,
      hasTriggered: hasTriggeredRef.current
    });
    if (
      !showValentinePopup &&
      !showWorldCupPreOrderPopup &&
      !showPreOrderModal &&
      !showPromotions &&
      !showEasterPopup &&
      !loadingPromotions &&
      !hasTriggeredRef.current
    ) {
      console.log('[WorldCup] All checks passed, triggering animation locally!');
      hasTriggeredRef.current = true;
      setWorldCupTriggerKey(prev => prev + 1);
    }
  }, [showValentinePopup, showWorldCupPreOrderPopup, showPreOrderModal, showPromotions, showEasterPopup, loadingPromotions, isWorldCupMode]);

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

  const handleCloseValentinePopup = () => {
    setShowValentinePopup(false);
    sessionStorage.setItem('hasSeenValentinePopup', 'true');

    if (pendingShowPreOrder) {
      setShowPreOrderModal(true);
      setPendingShowPreOrder(false);
    } else if (pendingShowPromotions) {
      setShowPromotions(true);
      setPendingShowPromotions(false);
      localStorage.setItem('promotionModalLastShown', Date.now().toString());
    }
  };

  const handleCloseWorldCupPreOrderPopup = () => {
    setShowWorldCupPreOrderPopup(false);
    sessionStorage.setItem('hasSeenWorldCupPreOrder', 'true');

    if (pendingShowPreOrder) {
      setShowPreOrderModal(true);
      setPendingShowPreOrder(false);
    } else if (pendingShowPromotions) {
      setShowPromotions(true);
      setPendingShowPromotions(false);
      localStorage.setItem('promotionModalLastShown', Date.now().toString());
    }
  };

  const handleCloseCart = () => {
    setShowCart(false);
    if (isPixReturnFlow) {
      setIsPixReturnFlow(false); // Isso também limpará o localStorage através do useEffect no App.tsx
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isWorldCupMode ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-900'}`}> {/* Adicionado flex flex-col */}
      {isWorldCupMode && (
        <div className="bg-gradient-to-r from-green-700 via-yellow-400 to-green-700 text-zinc-950 font-bold text-center py-2.5 px-4 text-xs sm:text-sm shadow-lg z-50 select-none flex items-center justify-center gap-2 border-b border-yellow-500">
          <span>{bannerMessage}</span>
        </div>
      )}
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
          selectedCity={selectedCity} // Passando selectedCity
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
          preOrderBannerText={preOrderBannerText} // Texto customizado do banner
          isMercadoPagoReturnFlow={isMercadoPagoReturnFlow} // Passando a nova prop
          menuMobileColumns={menuMobileColumns} // Nova prop para controlar colunas no mobile
          onTriggerValentine={onTriggerValentine}
          isValentineThemeActive={isValentineThemeActive}
          worldCupTriggerKey={worldCupTriggerKey}
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
          isValentineThemeActive={isValentineThemeActive}
          selectedCity={selectedCity}
          deliveryFee={deliveryFee}
          comandatubaDeliveryFee={comandatubaDeliveryFee}
          pixKey={pixKey}
          mercadoPagoLink={mercadoPagoLink}
        />
      )}

      {/* WorldCupPreOrderPopup — ativo apenas para Comandatuba */}
      {isComandatuba && showWorldCupPreOrderPopup ? (
        <WorldCupPreOrderPopup onClose={handleCloseWorldCupPreOrderPopup} settings={worldCupPopupSettings} />
      ) : showValentinePopup ? (
        <ValentinePopup onClose={handleCloseValentinePopup} />
      ) : showPreOrderModal ? (
        <PreOrderModal onClose={() => {
          setShowPreOrderModal(false);
          if (pendingShowPromotions) {
            setShowPromotions(true);
            setPendingShowPromotions(false);
            localStorage.setItem('promotionModalLastShown', Date.now().toString());
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
      {isWorldCupMode && worldCupTriggerKey > 0 && (
        <WorldCupTheme key={worldCupTriggerKey} />
      )}
      <Footer /> {/* Adicionando o Footer aqui */}
    </div>
  );
};