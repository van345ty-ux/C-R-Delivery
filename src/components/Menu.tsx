import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { HighlightCard } from './HighlightCard';
import { ProductDetailModal } from './ProductDetailModal'; // Importando o novo modal
import { Product, Highlight } from '../types'; // Corrected import path
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';

interface MenuProps {
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
}

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
  onAddToCart,
  selectedCategory,
  onCategoryChange,
  isStoreOpen,
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
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDetailModal, setShowProductDetailModal] = useState(false); // Estado para o modal
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null); // Produto selecionado

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
  const allAvailableAndSearchedProducts = products.filter(product =>
    product.available && product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separa promoções (categoria "Promoção") de produtos regulares
  const promotions = allAvailableAndSearchedProducts.filter(product => product.category === 'Promoção');
  const regularProducts = allAvailableAndSearchedProducts.filter(product => product.category !== 'Promoção');

  let productsToDisplayIn3ColGrid: Product[] = [];
  let productsToDisplayIn5ColGrid: Product[] = [];

  // Distribui produtos nos grids apropriados baseado na categoria selecionada
  // Grid de 3 colunas: usado para promoções (cards maiores)
  // Grid de 4 colunas: usado para produtos regulares
  if (selectedCategory === 'Todos') {
    productsToDisplayIn3ColGrid = promotions;
    productsToDisplayIn5ColGrid = regularProducts;
  } else if (selectedCategory === 'Promoções') {
    productsToDisplayIn3ColGrid = promotions;
  } else { // Categoria específica selecionada
    productsToDisplayIn5ColGrid = regularProducts.filter(product =>
      product.category && product.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
    );
  }

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

  console.log(`Menu: Rendering - Total products: ${products.length}, Available: ${allAvailableAndSearchedProducts.length}, Promotions: ${productsToDisplayIn3ColGrid.length}, Regular: ${productsToDisplayIn5ColGrid.length}, Category: ${selectedCategory}`);

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
      {/* Hero Section - Premium Design with Gradient Overlay and Glassmorphism */}
      <div className="mb-8">
        <div className="relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden shadow-xl">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60"></div>
          <img
            src={heroImageUrl}
            alt="Sushi Hero"
            loading="lazy"
            width="1920"
            height="400"
            className="w-full h-full object-cover"
          />
          {/* Glassmorphism Text Container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className={`text-center p-6 md:p-8 rounded-2xl max-w-2xl mx-4 animate-fade-in ${heroTextBackgroundEnabled ? 'glass-effect' : ''}`}
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
          </div>

          {/* Store Status - Premium Badge with Glassmorphism */}
          <div className="absolute top-4 left-4 z-10">
            <div 
              className="inline-flex items-center font-semibold px-5 py-2.5 rounded-full text-sm"
              style={{
                backgroundColor: isStoreOpen ? '#D1FAE5' : '#0A0A0A',
                color: isStoreOpen ? '#065F46' : '#FFFFFF',
                border: isStoreOpen ? 'none' : '2px solid #FFFFFF',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
              }}
            >
              <div 
                className={`w-2.5 h-2.5 rounded-full mr-2 ${isStoreOpen ? 'animate-green-pulse' : ''}`}
                style={{
                  backgroundColor: isStoreOpen ? '#10B981' : '#FFFFFF'
                }}
              ></div>
              <span>{isStoreOpen ? 'Atendendo' : 'Fechado'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-order Banner */}
      {showPreOrderBanner && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-lg mb-6">
          <p className="text-sm font-medium">
            Estaremos atendendo a partir das 18h, mas você pode deixar seu pedido agendado em nosso sistema.
          </p>
        </div>
      )}

      {/* Search and Filters - Premium Styling */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder:text-gray-400 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              disabled={isMercadoPagoReturnFlow}
              aria-label="Buscar produtos no cardápio"
            />
          </div>
        </div>

        {/* Category Filters - Premium Button Styling with Smooth Transitions */}
        <div className="flex gap-3 overflow-x-auto pb-4 items-center no-scrollbar scroll-smooth" role="tablist" aria-label="Categorias de produtos">
          {categories.map((category) => {
            const isOvos = category === 'Ovos de Sushi';
            const isActive = selectedCategory === category;

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
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`;
            }

            return (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`${btnClass} ${isMercadoPagoReturnFlow ? 'opacity-50 cursor-not-allowed' : ''} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
                style={{
                  backgroundColor: !isOvos && isActive ? 'var(--accent-primary)' : undefined,
                  color: !isOvos && isActive ? 'var(--text-inverse)' : undefined
                }}
                disabled={isMercadoPagoReturnFlow}
                role="tab"
                aria-selected={isActive}
                aria-label={`Filtrar por categoria ${category}`}
              >
                {isOvos && <span className="text-xl" aria-hidden="true">🍣</span>}
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Highlights Section - Premium Styling */}
      {highlights.length > 0 && (
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
              />
            ))}
          </div>
        </div>
      )}

      {/* Promotions Grid (3 cards on desktop) - Premium Spacing */}
      {productsToDisplayIn3ColGrid.length > 0 && (
        <div className="mb-10">
          {selectedCategory === 'Todos' && <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', color: '#0A0A0A' }}>Promoções/Recomendações</h3>}
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
          {selectedCategory === 'Todos' && <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', color: '#0A0A0A' }}>Cardápio</h3>}
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
        <ProductDetailModal
          product={selectedProductForDetail}
          onClose={() => setShowProductDetailModal(false)}
          onAddToCart={onAddToCart}
          canPlaceOrder={canPlaceOrder} // Passando o novo estado
          isMercadoPagoReturnFlow={isMercadoPagoReturnFlow} // Passando a nova prop
        />
      )}
    </div>
  );
};