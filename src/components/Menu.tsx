import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Search, Gift, Sparkles, Ticket, X } from 'lucide-react';
import { useTheme } from '../contexts/theme-context';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { HighlightCard } from './HighlightCard';
import { Product, Highlight, User, Coupon } from '../types'; // Corrected import path
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';

const ProductDetailModal = lazy(() => import('./ProductDetailModal').then(m => ({ default: m.ProductDetailModal })));

const renderBoldText = (text: string) => {
  if (!text) return null;
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-extrabold text-red-600 dark:text-red-400">{part}</strong>;
    }
    return part;
  });
};

interface MenuProps {
  user?: User | null;
  onAddToCart: (product: Product, quantity?: number, observations?: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  isStoreOpen: boolean;
  canPlaceOrder: boolean; // Nova prop
  heroImageUrl: string;
  // Novas props para o título e subtítulo do hero
  heroTitleText: string;
  heroTitleFontSize: string;
  heroTitleFontColor: string;
  heroTitleBorderColor: string;
  heroSubtitleText: string;
  heroSubtitleFontSize: string;
  heroSubtitleFontColor: string;
  heroSubtitleBorderColor: string;
  heroTextBackgroundEnabled: boolean; // Nova prop
  showPreOrderBanner: boolean; // Nova prop
  isMercadoPagoReturnFlow: boolean; // Nova prop
  menuMobileColumns: string; // Nova prop para controlar colunas no mobile
  onTriggerValentine: () => void;
  isValentineThemeActive?: boolean; // Nova prop
  worldCupTriggerKey?: number; // Nova prop
  selectedCity?: string; // Cidade selecionada
  preOrderBannerText?: string; // Texto customizado do banner
}

// Esta seção já estava desativada; manter independente das promoções e dos banners.
const SHOW_MENU_HIGHLIGHTS = false;

const categories = [
  'Todos',
  'Combinados',
  'Temaki',
  'Sushi',
  'Especiais',
  'Bebidas',
  'Promoções'
];

export const Menu: React.FC<MenuProps> = ({
  user,
  onAddToCart,
  selectedCategory,
  onCategoryChange,
  canPlaceOrder, // Nova prop
  heroImageUrl,
  // Novas props
  heroTitleText,
  heroTitleFontSize,
  heroTitleFontColor,
  heroTitleBorderColor,
  heroSubtitleText,
  heroSubtitleFontSize,
  heroSubtitleFontColor,
  heroSubtitleBorderColor,
  heroTextBackgroundEnabled, // Nova prop
  showPreOrderBanner, // Nova prop
  isMercadoPagoReturnFlow, // Nova prop
  menuMobileColumns, // Nova prop para controlar colunas no mobile
  onTriggerValentine,
  isValentineThemeActive = false, // Nova prop
  worldCupTriggerKey,
  selectedCity = '',
  preOrderBannerText = 'Estaremos atendendo a partir das 18h, mas você pode deixar seu pedido agendado em nosso sistema.',
}) => {
  const userId = user?.id;
  const isComandatuba = selectedCity ? selectedCity.toLowerCase().includes('comandatuba') : false;
  const { isWorldCupMode } = useTheme();
  console.log('[Menu] Rendering: isWorldCupMode =', isWorldCupMode, 'worldCupTriggerKey =', worldCupTriggerKey);
  const [products, setProducts] = useState<Product[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDetailModal, setShowProductDetailModal] = useState(false); // Estado para o modal
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null); // Produto selecionado
  const wcTextRef = useRef<HTMLDivElement>(null);

  // Estados para o banner pulsante de cupons disponíveis
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [showCouponBanner, setShowCouponBanner] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Busca cupons ativos e válidos para o usuário ou universais
  useEffect(() => {
    const fetchAvailableCoupons = async () => {
      try {
        const { data: couponsData, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('active', true)
          .eq('is_pending_admin_approval', false);

        if (error || !couponsData) return;

        const today = new Date();
        const validCoupons = couponsData.filter((coupon: Coupon) => {
          const validFrom = new Date(coupon.valid_from);
          const validTo = new Date(coupon.valid_to);
          validTo.setHours(23, 59, 59, 999);

          const isCurrentlyValid = today >= validFrom && today <= validTo;
          const hasUsagesLeft =
            coupon.usage_limit === null ||
            coupon.usage_limit === undefined ||
            coupon.usage_count < coupon.usage_limit;

          if (coupon.user_id) {
            if (!userId || userId !== coupon.user_id) return false;
          } else {
            if (coupon.type === 'birthday' || coupon.type === 'loyalty') return false;
          }

          return isCurrentlyValid && hasUsagesLeft;
        });

        // Ordena dando prioridade para cupons específicos do usuário e com maior desconto
        validCoupons.sort((a: Coupon, b: Coupon) => {
          if (a.user_id && !b.user_id) return -1;
          if (!a.user_id && b.user_id) return 1;
          return b.discount - a.discount;
        });

        setAvailableCoupons(validCoupons);
      } catch (err) {
        console.error('Error fetching available coupons for banner:', err);
      }
    };

    fetchAvailableCoupons();
  }, [userId]);

  const handleCopyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Cupom "${code}" copiado! Use na sacola de compras.`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  useEffect(() => {
    if (isWorldCupMode && worldCupTriggerKey !== undefined && worldCupTriggerKey > 0) {
      const el = wcTextRef.current;
      if (!el) return;

      // 1. Reseta: invisível, SEM transição
      el.setAttribute('style', 'opacity: 0; transform: translateY(20px) scale(0.9);');
      // Força o navegador a pintar o frame invisível
      void el.offsetHeight;

      // 2. Após 4.5s: ativa transição e fade in
      const fadeInTimer = setTimeout(() => {
        el.setAttribute('style', 'opacity: 1; transform: translateY(0) scale(1); transition-property: opacity, transform !important; transition-duration: 2s !important; transition-timing-function: ease-in-out !important;');
      }, 4500);

      // 3. Após 9.5s: fade out (2s a mais na tela)
      const fadeOutTimer = setTimeout(() => {
        el.setAttribute('style', 'opacity: 0; transform: translateY(20px) scale(0.9); transition-property: opacity, transform !important; transition-duration: 2s !important; transition-timing-function: ease-in-out !important;');
      }, 9500);

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(fadeOutTimer);
      };
    } else {
      const el = wcTextRef.current;
      if (el) {
        el.setAttribute('style', 'opacity: 0; transform: translateY(20px) scale(0.9);');
      }
    }
  }, [isWorldCupMode, worldCupTriggerKey]);

  useEffect(() => {
    const fetchData = async () => {
      console.log('Menu: Starting fetchData...');
      setLoading(true);

      // Fetch Products
      try {
        console.log('Menu: Fetching products...');
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true });

        if (productsError) {
          console.error('Menu: Error fetching products:', productsError);
          toast.error('Erro ao carregar produtos.');
        } else {
          console.log(`Menu: Products fetched successfully, count: ${productsData?.length || 0}`);
          setProducts(productsData || []);
        }
      } catch (error) {
        console.error('Menu: Exception fetching products:', error);
        toast.error('Erro ao carregar produtos. Verifique sua conexão.');
      }

      // Fetch Highlights
      try {
        console.log('Menu: Fetching highlights...');
        const { data: highlightsData, error: highlightsError } = await supabase
          .from('highlights')
          .select('*')
          .order('order_index', { ascending: true });

        if (highlightsError) {
          console.error('Menu: Error fetching highlights:', highlightsError);
        } else {
          console.log(`Menu: Highlights fetched successfully, count: ${highlightsData?.length || 0}`);
          setHighlights(highlightsData || []);
        }
      } catch (error) {
        console.error('Menu: Exception fetching highlights:', error);
      }

      setLoading(false);
      console.log('Menu: fetchData completed');
    };

    fetchData();
  }, []);

  // Handler para abrir o modal de detalhes do produto
  // Prevents adding items when user is in Mercado Pago return flow
  const handleProductClick = (product: Product) => {
    if (isMercadoPagoReturnFlow) {
      toast.error('Finalize seu pedido atual antes de adicionar novos itens.');
      return;
    }
    setSelectedProductForDetail(product);
    setShowProductDetailModal(true);
  };

  // Filtra todos os produtos disponíveis e que correspondem ao termo de busca
  const allAvailableAndSearchedProducts = products.filter(product => {
    const isAvailable = product.available;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return isAvailable && matchesSearch;
  });

  // Filtra os produtos "Promoção" para as 3 colunas, caso a categoria seja 'Todos'
  const productsToDisplayIn3ColGrid = selectedCategory === 'Todos' 
    ? allAvailableAndSearchedProducts.filter(p => p.category === 'Promoção')
    : (selectedCategory === 'Promoções' ? allAvailableAndSearchedProducts.filter(p => p.category === 'Promoção') : []);

  // Filtra os DEMAIS produtos (não Promoção) ou da categoria específica para as 5 colunas
  const productsToDisplayIn5ColGrid = allAvailableAndSearchedProducts.filter(p => {
    if (selectedCategory === 'Todos') {
      return p.category !== 'Promoção';
    } else if (selectedCategory === 'Promoções') {
      return false;
    } else {
      return p.category === selectedCategory;
    }
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section Skeleton */}
        <div className="mb-4">
          <div className="relative h-[250px] md:h-[350px] rounded-2xl overflow-hidden bg-gray-200 animate-pulse" />
        </div>

        {/* Search and Filters Skeleton */}
        <div className="mb-4">
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="flex gap-2 overflow-x-auto pb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
            ))}
          </div>
        </div>

        {/* Products Grid Skeleton */}
        <div className="mb-8">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" role="status" aria-live="polite" aria-label="Carregando produtos">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
      {/* Hero Section - Premium Design with Gradient Overlay and Glassmorphism */}
      <div className="mb-8">
        <div 
          onClick={onTriggerValentine}
          className="relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden shadow-xl cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.01]"
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40"></div>
          <img
            src={heroImageUrl}
            alt="Sushi Hero"
            loading="lazy"
            width="1920"
            height="400"
            className="w-full h-full object-cover"
          />
          {/* Glassmorphism Text Container & WC Text (Stacked) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div 
              className={`text-center p-6 md:p-8 rounded-2xl max-w-2xl mx-4 animate-fade-in pointer-events-auto ${heroTextBackgroundEnabled ? 'glass-effect' : ''}`}
              style={{ transform: 'translateY(40px)' }}
            >
              {heroTitleText && (
                <h2
                  className="text-3xl sm:text-5xl font-bold mb-3 drop-shadow-lg"
                  style={{
                    fontSize: heroTitleFontSize,
                    color: heroTitleFontColor,
                    textShadow: `1px 1px 0 ${heroTitleBorderColor}, -1px -1px 0 ${heroTitleBorderColor}, 1px -1px 0 ${heroTitleBorderColor}, -1px 1px 0 ${heroTitleBorderColor}`,
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  {heroTitleText}
                </h2>
              )}
              {heroSubtitleText && (
                <p
                  className="text-lg sm:text-2xl font-medium drop-shadow-md"
                  style={{
                    fontSize: heroSubtitleFontSize,
                    color: heroSubtitleFontColor,
                    textShadow: `1px 1px 0 ${heroSubtitleBorderColor}, -1px -1px 0 ${heroSubtitleBorderColor}, 1px -1px 0 ${heroSubtitleBorderColor}, -1px 1px 0 ${heroSubtitleBorderColor}`
                  }}
                >
                  {heroSubtitleText}
                </p>
              )}
            </div>

            {/* World Cup Pop-up text — SEMPRE no DOM, fade controlado via ref */}
            {isWorldCupMode && (
              <>
                <div 
                  ref={wcTextRef}
                  className="mt-4 sm:mt-6 text-center select-none w-[95%] pointer-events-none z-20"
                  style={{ opacity: 0, transform: 'translateY(20px) scale(0.9)' }}
                >
                <h3 className="text-4xl sm:text-6xl md:text-7xl font-black leading-tight" style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    WebkitTextStroke: '2px #FACC15', 
                    color: '#15803d',
                    filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.6))'
                  }}>
                  RUMO AO HEXA! 🇧🇷
                </h3>
                <p className="text-2xl sm:text-4xl md:text-5xl font-black mt-2" style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  color: '#FACC15',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  WebkitTextStroke: '0.5px rgba(0,0,0,0.5)'
                }}>
                  C&R Sushi na Torcida! ⚽ 🏆
                </p>
              </div>
              </>
            )}
          </div>

          {/* Store Status - Premium Badge with Glassmorphism */}
          <div className="absolute top-4 left-4 z-10">
            <div 
              className="inline-flex items-center font-semibold px-5 py-2.5 rounded-full text-sm"
              style={{
                backgroundColor: canPlaceOrder ? '#D1FAE5' : '#0A0A0A',
                color: canPlaceOrder ? '#065F46' : '#FFFFFF',
                border: canPlaceOrder ? 'none' : '2px solid #FFFFFF',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
              }}
            >
              <div 
                className={`w-2.5 h-2.5 rounded-full mr-2 ${canPlaceOrder ? 'animate-green-pulse' : ''}`}
                style={{
                  backgroundColor: canPlaceOrder ? '#10B981' : '#FFFFFF'
                }}
              ></div>
              <span>
                {canPlaceOrder 
                  ? (isWorldCupMode && isComandatuba ? 'Plantão rumo ao hexa' : isValentineThemeActive ? 'Plantão Dia dos namorados' : 'Atendendo') 
                  : 'Fechado'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-order Banner */}
      {showPreOrderBanner && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 animate-fade-in">
          <p className="text-sm font-semibold" style={{ color: '#000000' }}>
            {renderBoldText(preOrderBannerText)}
          </p>
        </div>
      )}

      {/* Search and Filters - Premium Styling */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute left-4 top-4 h-5 w-5 ${isWorldCupMode ? 'text-green-600' : 'text-gray-400'}`} aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl placeholder:text-gray-400 transition-all duration-300 shadow-sm hover:shadow-md ${
                isWorldCupMode 
                  ? 'border-green-600 bg-white text-gray-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400' 
                  : 'border-gray-200 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500'
              }`}
              style={!isWorldCupMode ? {
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              } : {}}
              disabled={isMercadoPagoReturnFlow}
              aria-label="Buscar produtos no cardápio"
            />
          </div>
        </div>

        {/* Banner Pulsante de Cupom Disponível */}
        {availableCoupons.length > 0 && showCouponBanner && (
          <div className="mb-6 animate-fade-in">
            <style>{`
              @keyframes pulseGlow {
                0%, 100% {
                  box-shadow: 0 0 15px rgba(239, 68, 68, 0.4), 0 0 30px rgba(245, 158, 11, 0.2);
                  transform: scale(1);
                }
                50% {
                  box-shadow: 0 0 25px rgba(239, 68, 68, 0.7), 0 0 45px rgba(245, 158, 11, 0.5);
                  transform: scale(1.008);
                }
              }
              .animate-pulse-glow {
                animation: pulseGlow 2.5s infinite ease-in-out;
              }
            `}</style>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 p-[2px] shadow-lg animate-pulse-glow">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-900 px-4 py-3.5 sm:px-6 rounded-[14px]">
                
                {/* Lado Esquerdo: Ícone + Texto Pulsante */}
                <div className="flex items-center space-x-3 text-center sm:text-left">
                  <div className="relative flex-shrink-0">
                    <span className="absolute -inset-1 rounded-full bg-amber-400 opacity-75 blur animate-ping"></span>
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-md">
                      <Gift className="h-5.5 w-5.5 animate-bounce" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                      <Sparkles className="h-4 w-4 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                      <h4 className="font-extrabold text-gray-900 dark:text-white text-base sm:text-lg tracking-tight">
                        🎉 PARABÉNS!
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                      Tem cupom disponível para você!
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium mt-0.5">
                      Aproveite <strong className="text-red-600 dark:text-red-400">{availableCoupons[0].discount}% OFF</strong> com o código:{' '}
                      <span className="font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 inline-block">
                        {availableCoupons[0].code}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Lado Direito: Botão Copiar / Aproveitar & Fechar */}
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleCopyCouponCode(availableCoupons[0].code)}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Ticket className="w-4 h-4" />
                    {copiedCode === availableCoupons[0].code ? 'Copiado! ✓' : 'Copiar Cupom'}
                  </button>
                  <button
                    onClick={() => setShowCouponBanner(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Fechar aviso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Category Filters - Premium Button Styling with Smooth Transitions */}
        <div className="flex gap-3 overflow-x-auto px-2 pb-4 items-center no-scrollbar scroll-smooth" role="tablist" aria-label="Categorias de produtos">
          {categories.map((category) => {
            const isOvos = category === 'Ovos de Sushi';
            const isActive = selectedCategory === category;
            
            const emojiIndex = categories.indexOf(category);
            const worldCupEmoji = ['⚽', '🇧🇷'][emojiIndex % 2];
            const displayCategory = isWorldCupMode ? `${worldCupEmoji} ${category}` : category;

            let btnClass = "";

            if (isOvos) {
              // Estilo especial para Ovos de Sushi: maior, pulsando e destacado
              btnClass = `px-6 py-4 rounded-full text-base font-bold whitespace-nowrap transition-all duration-300 transform hover:scale-110 shadow-lg flex items-center gap-2 animate-pulse-ovos ${isActive
                  ? 'ring-4 ring-red-500/20 border-2 border-red-600'
                  : 'border-2 border-red-100 shadow-xl'
                }`;
            } else {
              // Premium styling for other categories with enhanced transitions
              btnClass = `px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 shadow-sm hover:shadow-md ${isActive
                  ? (isWorldCupMode ? 'bg-gradient-to-r from-green-600 to-green-700 border-2 border-yellow-400 text-white shadow-lg scale-105' : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg scale-105')
                  : (isWorldCupMode ? 'bg-white text-green-700 hover:bg-green-50 border border-green-300' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200')
                }`;
            }

            return (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`${btnClass} ${isMercadoPagoReturnFlow ? 'opacity-50 cursor-not-allowed' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2`}
                style={{
                  backgroundColor: !isWorldCupMode && !isOvos && isActive ? 'var(--accent-primary)' : undefined,
                  color: !isWorldCupMode && !isOvos && isActive ? '#FFFFFF' : undefined
                }}
                disabled={isMercadoPagoReturnFlow}
                role="tab"
                aria-selected={isActive}
                aria-label={`Filtrar por categoria ${category}`}
              >
                {isOvos && <span className="text-xl" aria-hidden="true">🍣</span>}
                {displayCategory}
              </button>
            );
          })}
        </div>
      </div>

      {/* Highlights Section - Premium Styling */}
      {SHOW_MENU_HIGHLIGHTS && highlights.length > 0 && (
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', color: '#0A0A0A' }}>Destaques</h3>
          <div className="flex overflow-x-auto space-x-6 pb-4 no-scrollbar">
            {highlights.map((highlight) => (
              <HighlightCard
                key={highlight.id}
                name={highlight.name}
                price={highlight.price}
                imageUrl={highlight.image_url}
                borderColor={highlight.border_color}
                shadowSize={highlight.shadow_size}
                onClick={onTriggerValentine}
              />
            ))}
          </div>
        </div>
      )}

      {/* Promotions Grid (3 cards on desktop) - Premium Spacing */}
      {productsToDisplayIn3ColGrid.length > 0 && (
        <div className="mb-10">
          {selectedCategory === 'Todos' && <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', color: isWorldCupMode ? '#15803d' : '#0A0A0A' }}>Promoções/Recomendações</h3>}
          <div className={`grid ${menuMobileColumns === '2' ? 'grid-cols-2' : 'grid-cols-1'} sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8`}>
            {productsToDisplayIn3ColGrid.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onProductClick={handleProductClick}
                isPromotion={true}
                isMercadoPagoReturnFlow={isMercadoPagoReturnFlow}
                isCompactMode={menuMobileColumns === '2'} // Ativa modo compacto em 2 colunas
                isHorizontalMode={menuMobileColumns === 'horizontal'} // Ativa layout horizontal
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Products Grid (4 cards on desktop) - Premium Spacing */}
      {productsToDisplayIn5ColGrid.length > 0 && (
        <div className="mb-10">
          {selectedCategory === 'Todos' && <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', color: isWorldCupMode ? '#15803d' : '#0A0A0A' }}>Cardápio</h3>}
          <div className={`grid ${menuMobileColumns === '2' ? 'grid-cols-2' : 'grid-cols-1'} sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8`}>
            {productsToDisplayIn5ColGrid.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onProductClick={handleProductClick}
                isPromotion={false}
                isMercadoPagoReturnFlow={isMercadoPagoReturnFlow}
                isCompactMode={menuMobileColumns === '2'} // Ativa modo compacto em 2 colunas
                isHorizontalMode={menuMobileColumns === 'horizontal'} // Ativa layout horizontal
              />
            ))}
          </div>
        </div>
      )}

      {/* Handle no products found */}
      {productsToDisplayIn3ColGrid.length === 0 && productsToDisplayIn5ColGrid.length === 0 && (
        <div className="text-center py-12" role="status" aria-live="polite">
          {selectedCategory === 'Promoções' ? (
            <>
              <p className="text-gray-600 text-base mb-2">Nenhuma promoção ativa no momento.</p>
              <p className="text-gray-600 text-sm">Crie uma promoção no painel de admin para que ela apareça aqui.</p>
            </>
          ) : (
            <p className="text-gray-600 text-base">Nenhum produto encontrado</p>
          )}
        </div>
      )}

      {/* Product Detail Modal */}
      {showProductDetailModal && selectedProductForDetail && (
        <Suspense fallback={null}>
          <ProductDetailModal
            product={selectedProductForDetail}
            onClose={() => setShowProductDetailModal(false)}
            onAddToCart={onAddToCart}
            canPlaceOrder={canPlaceOrder} // Passando a nova prop
            isMercadoPagoReturnFlow={isMercadoPagoReturnFlow} // Passando a nova prop
          />
        </Suspense>
      )}
    </div>
  );
};
