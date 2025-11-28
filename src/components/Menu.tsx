import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { ProductCard } from './ProductCard';
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
  showPreOrderBanner: boolean; // Nova prop
  isMercadoPagoReturnFlow: boolean; // Nova prop
}

const categories = [
  'Todos',
  'Combinados', // Ordem alterada
  'Temaki',     // Ordem alterada
  'Sushi',      // Ordem alterada
  'Especiais',
  'Bebidas',
  'Black Friday C&R', // NOVO
  'Promoções'   // Ordem alterada
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
  showPreOrderBanner, // Nova prop
  isMercadoPagoReturnFlow, // Nova prop
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDetailModal, setShowProductDetailModal] = useState(false); // Estado para o modal
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null); // Produto selecionado

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        toast.error('Erro ao carregar produtos.');
      } else {
        setProducts(productsData || []);
      }

      const { data: highlightsData, error: highlightsError } = await supabase
        .from('highlights')
        .select('*')
        .order('order_index', { ascending: true });

      if (highlightsError) {
        console.error('Error fetching highlights:', highlightsError);
        toast.error('Erro ao carregar destaques.');
      } else {
        setHighlights(highlightsData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Handler para abrir o modal de detalhes do produto
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

  // Separa promoções e produtos regulares
  const promotions = allAvailableAndSearchedProducts.filter(product => product.category === 'Promoção');
  const regularProducts = allAvailableAndSearchedProducts.filter(product => product.category !== 'Promoção');

  let productsToDisplayIn3ColGrid: Product[] = [];
  let productsToDisplayIn5ColGrid: Product[] = [];

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
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Carregando cardápio...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero Section */}
      <div className="mb-4">
        <div className="relative h-48 bg-gradient-to-r from-red-600 to-red-800 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <img
            src={heroImageUrl}
            alt="Sushi Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              {heroTitleText && (
                <h2 
                  className="text-4xl sm:text-5xl font-extrabold mb-2 drop-shadow-lg"
                  style={{ 
                    fontSize: heroTitleFontSize, 
                    color: heroTitleFontColor, 
                    textShadow: `1px 1px 0 ${heroTitleBorderColor}, -1px -1px 0 ${heroTitleBorderColor}, 1px -1px 0 ${heroTitleBorderColor}, -1px 1px 0 ${heroTitleBorderColor}` 
                  }}
                >
                  {heroTitleText}
                </h2>
              )}
              {heroSubtitleText && (
                <p 
                  className="text-lg sm:text-xl font-medium drop-shadow-md"
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

          {/* Store Status - Moved inside Hero Section and positioned absolutely */}
          <div className="absolute top-[10px] left-[9px] z-10">
            <div className={`inline-flex items-center font-medium px-4 py-2 rounded-full text-sm shadow-sm ${isStoreOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isStoreOpen ? 'bg-green-500 animate-pulse-fade' : 'bg-red-500'}`}></div>
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

      {/* Search and Filters */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={isMercadoPagoReturnFlow} // Desabilita busca
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={isMercadoPagoReturnFlow} // Desabilita filtros
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Highlights Section */}
      {highlights.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Destaques</h3>
          <div className="flex overflow-x-auto space-x-4 pb-2">
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

      {/* Promotions Grid (3 cards on desktop) */}
      {productsToDisplayIn3ColGrid.length > 0 && (
        <div className="mb-8">
          {selectedCategory === 'Todos' && <h3 className="text-xl font-bold text-gray-900 mb-2">Promoções/Recomendações</h3>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            {productsToDisplayIn3ColGrid.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onProductClick={handleProductClick} // Passa o novo handler
                isPromotion={true}
                isMercadoPagoReturnFlow={isMercadoPagoReturnFlow} // Passando a nova prop
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Products Grid (5 cards on desktop) */}
      {productsToDisplayIn5ColGrid.length > 0 && (
        <div className="mb-8">
          {selectedCategory === 'Todos' && <h3 className="text-xl font-bold text-gray-900 mb-2">Cardápio</h3>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
            {productsToDisplayIn5ColGrid.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onProductClick={handleProductClick} // Passa o novo handler
                isPromotion={false}
                isMercadoPagoReturnFlow={isMercadoPagoReturnFlow} // Passando a nova prop
              />
            ))}
          </div>
        </div>
      )}

      {/* Handle no products found */}
      {productsToDisplayIn3ColGrid.length === 0 && productsToDisplayIn5ColGrid.length === 0 && (
        <div className="text-center py-12">
          {selectedCategory === 'Promoções' ? (
            <>
              <p className="text-gray-500 text-lg mb-2">Nenhuma promoção ativa no momento.</p>
              <p className="text-gray-500 text-sm">Crie uma promoção no painel de admin para que ela apareça aqui.</p>
            </>
          ) : (
            <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
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