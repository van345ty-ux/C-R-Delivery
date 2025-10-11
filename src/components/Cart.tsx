import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, CreditCard, Smartphone, DollarSign, Copy, Gift, ExternalLink } from 'lucide-react';
import { CartItem, Order, User } from '../App';
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onOrderCreated: (order: Order) => void;
  user: User | null;
  isStoreOpen: boolean; // Manter para o status visual, mas usar canPlaceOrder para habilitar o botão
  canPlaceOrder: boolean; // Nova prop
  isMercadoPagoReturnFlow: boolean; // Nova prop
}

interface Coupon {
  id: string;
  name: string;
  code: string;
  discount: number;
  type: 'birthday' | 'loyalty' | 'promotion';
  valid_from: string;
  valid_to: string;
  active: boolean;
  usage_limit?: number;
  usage_count: number;
  user_id?: string;
}

export const Cart: React.FC<CartProps> = ({
  items,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onOrderCreated,
  user,
  isStoreOpen, // Manter para o status visual
  canPlaceOrder, // Nova prop
  isMercadoPagoReturnFlow, // Nova prop
}) => {
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>(() => {
    // Initialize from localStorage or default
    return localStorage.getItem('cartDeliveryType') as 'delivery' | 'pickup' || 'delivery';
  });
  // CORREÇÃO: paymentMethod sempre inicia como null, ignorando localStorage para o valor inicial
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash' | null>(null);
  const [address, setAddress] = useState(() => {
    // Initialize from localStorage or default
    return localStorage.getItem('cartAddress') || '';
  });
  const [couponCode, setCouponCode] = useState(() => {
    // Initialize from localStorage or default
    return localStorage.getItem('cartCouponCode') || '';
  });
  const [appliedCoupon, setAppliedCoupon] = useState<{id: string; code: string; discount: number} | null>(() => {
    // Initialize from localStorage or default
    const savedCoupon = localStorage.getItem('cartAppliedCoupon');
    return savedCoupon ? JSON.parse(savedCoupon) : null;
  });
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryFeeValue, setDeliveryFeeValue] = useState(3.00); // Default value
  const [pixKeyValue, setPixKeyValue] = useState(''); // Novo estado para a chave Pix
  const [mercadoPagoLink, setMercadoPagoLink] = useState('https://link.mercadopago.com.br/sushicr'); // Link do Mercado Pago
  const [firstAvailableCoupon, setFirstAvailableCoupon] = useState<Coupon | null>(null); // Armazena o primeiro cupom disponível
  const couponInputRef = useRef<HTMLInputElement>(null); // Referência para o input do cupom
  const [showMercadoPagoWarning, setShowMercadoPagoWarning] = useState(false); // Estado para o pop-up de aviso
  const [showPixInstructionsModal, setShowPixInstructionsModal] = useState(false); // Novo estado para o pop-up de instruções Pix
  
  // Novo estado para controlar se o redirecionamento do Mercado Pago foi reconhecido
  const [isMercadoPagoAcknowledged, setIsMercadoPagoAcknowledged] = useState(() => {
    return JSON.parse(localStorage.getItem('hasSeenMercadoPagoWarning') || 'false');
  });

  // Novo estado para controlar se as instruções Pix já foram vistas
  const [hasSeenPixInstructions, setHasSeenPixInstructions] = useState(() => {
    return JSON.parse(localStorage.getItem('hasSeenPixInstructions') || 'false');
  });

  // Effect to save form data to localStorage
  useEffect(() => {
    localStorage.setItem('cartDeliveryType', deliveryType);
    // Only save paymentMethod if it's not null
    if (paymentMethod) {
      localStorage.setItem('cartPaymentMethod', paymentMethod);
    } else {
      localStorage.removeItem('cartPaymentMethod');
    }
    localStorage.setItem('cartAddress', address);
    localStorage.setItem('cartCouponCode', couponCode);
    localStorage.setItem('cartAppliedCoupon', JSON.stringify(appliedCoupon));
    localStorage.setItem('hasSeenPixInstructions', JSON.stringify(hasSeenPixInstructions)); // Salva o estado das instruções Pix
    // hasSeenMercadoPagoWarning é gerenciado diretamente em handleMercadoPagoConfirm e handleFinishOrder
  }, [deliveryType, paymentMethod, address, couponCode, appliedCoupon, hasSeenPixInstructions]);

  // Listener para mudanças no localStorage (útil para sincronizar entre abas ou após reload)
  useEffect(() => {
    const handleStorageChange = () => {
      setIsMercadoPagoAcknowledged(JSON.parse(localStorage.getItem('hasSeenMercadoPagoWarning') || 'false'));
      setHasSeenPixInstructions(JSON.parse(localStorage.getItem('hasSeenPixInstructions') || 'false')); // Sincroniza o estado das instruções Pix
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (!error && data) {
        const settingsMap = data.reduce((acc, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {} as { [key: string]: string });

        if (!isNaN(parseFloat(settingsMap.delivery_fee))) {
          setDeliveryFeeValue(parseFloat(settingsMap.delivery_fee));
        } else {
          console.warn('Could not fetch delivery fee setting, using default value.');
        }
        setPixKeyValue(settingsMap.pix_key || '');
        setMercadoPagoLink(settingsMap.mercado_pago_link || 'https://link.mercadopago.com.br/sushicr');
      } else {
        console.warn('Could not fetch settings, using default values.');
      }
    };

    fetchSettings();
  }, []);

  // Efeito para verificar se o usuário tem cupons disponíveis
  useEffect(() => {
    const checkAvailableCoupons = async () => {
      if (!user?.id) {
        setFirstAvailableCoupon(null);
        return;
      }

      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`) // Cupons específicos do usuário ou universais
        .eq('active', true) // Apenas cupons ativos
        .eq('is_pending_admin_approval', false); // Apenas cupons já aprovados

      if (couponsError) {
        console.error('Error fetching user coupons for notification:', couponsError);
        setFirstAvailableCoupon(null);
        return;
      }

      const today = new Date();
      const availableCoupons = (couponsData || []).filter((coupon: Coupon) => {
        const validFrom = new Date(coupon.valid_from);
        const validTo = new Date(coupon.valid_to);
        validTo.setHours(23, 59, 59, 999); // Considerar o dia inteiro

        const isCurrentlyValid = today >= validFrom && today <= validTo;
        const hasUsagesLeft = coupon.usage_limit === null || coupon.usage_count < coupon.usage_limit;

        // Validação adicional: cupons de aniversário e fidelidade DEVEM ser específicos do usuário
        if ((coupon.type === 'birthday' || coupon.type === 'loyalty') && !coupon.user_id) {
          return false; 
        }
        return isCurrentlyValid && hasUsagesLeft;
      });
      
      if (availableCoupons.length > 0) {
        setFirstAvailableCoupon(availableCoupons[0]); // Armazena o primeiro cupom disponível
      } else {
        setFirstAvailableCoupon(null);
      }
    };

    checkAvailableCoupons();
  }, [user?.id]); // Depende do ID do usuário

  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const deliveryFee = deliveryType === 'delivery' ? deliveryFeeValue : 0;
  const discount = appliedCoupon ? (subtotal * appliedCoupon.discount / 100) : 0;
  const total = subtotal + deliveryFee - discount;

  const handleApplyCoupon = async (codeToApply?: string) => {
    if (isMercadoPagoReturnFlow) {
      toast.error('Finalize seu pedido atual antes de aplicar cupons.');
      return;
    }
    const code = codeToApply || couponCode; // Usa o código passado ou o do estado
    
    if (!user) {
      toast.error('Você precisa fazer login para aplicar cupons de desconto.');
      return;
    }
    if (!code.trim()) {
      toast.error('Por favor, insira um código de cupom.');
      return;
    }
    setLoadingCoupon(true);
    setAppliedCoupon(null); // Reset previous applied coupon

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true) // Apenas cupons ativos
      .eq('is_pending_admin_approval', false) // Apenas cupons já aprovados
      .or(`user_id.is.null,user_id.eq.${user.id}`) // Busca cupons gerais ou específicos do usuário
      .single();

    setLoadingCoupon(false);

    if (error || !data) {
      toast.error('Cupom inválido, inativo ou não aplicável a você.');
      return;
    }

    const coupon: Coupon = data;
    const today = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validTo = new Date(coupon.valid_to);
    validTo.setHours(23, 59, 59, 999); // Considerar o dia inteiro

    if (today < validFrom || today > validTo) {
      toast.error('Cupom expirado ou ainda não é válido.');
      return;
    }

    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      toast.error('Este cupom atingiu o limite de usos.');
      return;
    }

    // Se o cupom é específico do usuário, garante que pertence ao usuário atual
    if (coupon.user_id && coupon.user_id !== user.id) {
      toast.error('Este cupom não é seu.');
      return;
    }

    setAppliedCoupon({ id: coupon.id, code: coupon.code, discount: coupon.discount });
    setCouponCode(code); // Atualiza o input com o código aplicado
    toast.success('Cupom aplicado com sucesso!');
  };

  const handleFinishOrder = async () => {
    if (!canPlaceOrder) { // Usa canPlaceOrder para verificar se pode finalizar o pedido
      toast.error('Desculpe, não é possível finalizar o pedido no momento.');
      return;
    }
    if (!user) {
      toast.error('Você precisa fazer login para finalizar o pedido.');
      return;
    }
    if (items.length === 0) return;
    if (deliveryType === 'delivery' && !address.trim()) {
      toast.error('Por favor, informe o endereço para entrega');
      return;
    }
    if (paymentMethod === null) { // Adicionado: verifica se uma forma de pagamento foi selecionada
      toast.error('Por favor, selecione uma forma de pagamento.');
      return;
    }
    if (paymentMethod === 'pix' && !pixKeyValue) {
      toast.error('A chave Pix não foi configurada. Por favor, escolha outra forma de pagamento.');
      return;
    }
    if (paymentMethod === 'pix' && showPixInstructionsModal) {
      toast.error('Por favor, confirme que você entendeu as instruções do Pix.');
      return;
    }

    if (paymentMethod === 'card') {
      // Verifica a flag diretamente do localStorage para garantir o estado mais recente
      const acknowledged = JSON.parse(localStorage.getItem('hasSeenMercadoPagoWarning') || 'false');
      if (!acknowledged) {
        setShowMercadoPagoWarning(true);
        return; // Interrompe o fluxo para mostrar o aviso
      }
    }

    setIsSubmitting(true);

    const orderPayload = {
      user_id: user.id,
      items: items.map(item => ({
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        observations: item.observations
      })),
      total,
      delivery_fee: deliveryFee,
      delivery_type: deliveryType,
      payment_method: paymentMethod,
      address: deliveryType === 'delivery' ? address : null,
      status: 'Pedido recebido',
      customer_name: user.name,
      customer_phone: user.phone,
      coupon_used: appliedCoupon?.code
    };

    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('*, order_number') // Seleciona o novo order_number
      .single();

    if (error) {
      console.error('Error creating order:', error);
      toast.error('Ocorreu um erro ao finalizar seu pedido. Tente novamente.');
      setIsSubmitting(false);
      return;
    }

    if (appliedCoupon) {
      const { data: currentCoupon, error: fetchError } = await supabase
        .from('coupons')
        .select('usage_count')
        .eq('id', appliedCoupon.id)
        .single();

      if (!fetchError && currentCoupon) {
        await supabase
          .from('coupons')
          .update({ usage_count: currentCoupon.usage_count + 1 })
          .eq('id', appliedCoupon.id);
      }
    }

    const formattedOrder: Order = {
      id: newOrder.id,
      orderNumber: newOrder.order_number, // Mapeia o order_number
      items: items,
      total: newOrder.total,
      deliveryFee: newOrder.delivery_fee,
      deliveryType: newOrder.delivery_type,
      paymentMethod: newOrder.payment_method,
      address: newOrder.address,
      status: newOrder.status,
      customerName: newOrder.customer_name,
      customerPhone: newOrder.customer_phone,
      createdAt: newOrder.created_at,
      couponUsed: newOrder.coupon_used
    };

    onOrderCreated(formattedOrder);
    onClose();
    setIsSubmitting(false);
    localStorage.removeItem('hasSeenMercadoPagoWarning'); // Limpa a flag após finalizar o pedido
    localStorage.removeItem('isMercadoPagoReturnFlow'); // Limpa a flag principal do Mercado Pago
    localStorage.removeItem('hasSeenPixInstructions'); // Limpa a flag Pix
    setIsMercadoPagoAcknowledged(false); // Atualiza o estado local
    setHasSeenPixInstructions(false); // Atualiza o estado local
    // isMercadoPagoReturnFlow é limpo em onOrderCreated no App.tsx
    toast.success('Pedido finalizado com sucesso!');
  };

  const handleMercadoPagoConfirm = () => {
    setShowMercadoPagoWarning(false);
    localStorage.setItem('hasSeenMercadoPagoWarning', 'true'); // Define a flag no localStorage
    setIsMercadoPagoAcknowledged(true); // Atualiza o estado local
    localStorage.setItem('isMercadoPagoReturnFlow', 'true'); // *** CORRIGIDO AQUI: Usar a chave correta ***
    // A flag isMercadoPagoReturnFlow é definida no App.tsx via localStorage listener
    window.open(mercadoPagoLink, '_blank'); // Abre o link em uma nova aba
    // O carrinho permanece aberto para o usuário retornar e finalizar o pedido
  };

  const handlePixInstructionsConfirm = () => {
    setShowPixInstructionsModal(false);
    localStorage.setItem('hasSeenPixInstructions', 'true');
    setHasSeenPixInstructions(true);
  };

  const copyPixKey = () => {
    if (pixKeyValue) {
      navigator.clipboard.writeText(pixKeyValue);
      toast.success('Chave Pix copiada!');
    }
  };

  const handlePaymentMethodChange = (method: 'pix' | 'card' | 'cash') => {
    setPaymentMethod(method);
    // Limpa flags de outros métodos ao mudar
    if (method !== 'card') {
      localStorage.removeItem('hasSeenMercadoPagoWarning');
      setIsMercadoPagoAcknowledged(false);
    }
    if (method !== 'pix') {
      localStorage.removeItem('hasSeenPixInstructions');
      setHasSeenPixInstructions(false);
      setShowPixInstructionsModal(false); // Garante que o modal Pix feche
    } else {
      // Se for Pix e ainda não viu as instruções, mostra o modal
      if (!hasSeenPixInstructions) {
        setShowPixInstructionsModal(true);
      }
    }
  };

  if (items.length === 0) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Carrinho</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Seu carrinho está vazio</p>
            <button
              onClick={onClose}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Ver Cardápio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Carrinho</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.map((item) => (
          <div key={item.product.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium">{item.product.name}</h4>
              <button
                onClick={() => onRemoveItem(item.product.id)}
                className="text-red-500 text-sm"
                disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita remover item
              >
                Remover
              </button>
            </div>
            
            {item.observations && (
              <p className="text-sm text-gray-600 mb-2">Obs: {item.observations}</p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  className="bg-gray-300 hover:bg-gray-400 rounded-full p-1"
                  disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita botão de menos
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  className="bg-gray-300 hover:bg-gray-400 rounded-full p-1"
                  disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita botão de mais
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="font-medium">
                R$ {(item.product.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        ))}

        <div className="border-t pt-4">
          {!user ? (
            <div className="text-center text-sm text-gray-600 bg-gray-100 p-3 rounded-lg">
              <p>Faça login para aplicar cupons de desconto.</p>
            </div>
          ) : (
            <>
              {firstAvailableCoupon && !appliedCoupon && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Gift className="w-4 h-4 mr-2" />
                    <span>Você tem cupom disponível!</span>
                  </div>
                  <button
                    onClick={() => {
                      if (firstAvailableCoupon) {
                        handleApplyCoupon(firstAvailableCoupon.code);
                      }
                    }}
                    className="ml-2 px-3 py-1 rounded-md bg-green-100 hover:bg-green-200 text-green-800 font-medium"
                    disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita aplicar cupom
                  >
                    Clique para aplicar
                  </button>
                </div>
              )}
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="Cupom de desconto"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-sm"
                  disabled={loadingCoupon || isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita input de cupom
                  ref={couponInputRef} // Associar a referência ao input
                />
                <button
                  onClick={() => handleApplyCoupon()} // Chama sem argumento para usar o estado `couponCode`
                  className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                  disabled={loadingCoupon || isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita botão de aplicar cupom
                >
                  {loadingCoupon ? '...' : 'Aplicar'}
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-green-600 text-sm">
                  Cupom {appliedCoupon.code} aplicado! {appliedCoupon.discount}% de desconto
                </p>
              )}
            </>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Tipo de Entrega</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                checked={deliveryType === 'delivery'}
                onChange={() => setDeliveryType('delivery')}
                className="mr-2"
                disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita seleção
              />
              <span>Delivery (+R$ {deliveryFeeValue.toFixed(2)})</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={deliveryType === 'pickup'}
                onChange={() => setDeliveryType('pickup')}
                className="mr-2"
                disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita seleção
              />
              <span>Retirada no local (Grátis)</span>
            </label>
          </div>
        </div>

        {deliveryType === 'delivery' && (
          <div>
            <label className="block text-sm font-medium mb-2">Endereço para entrega</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro..."
              className="w-full p-3 border rounded-lg text-sm"
              rows={3}
              disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita endereço
            />
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Forma de Pagamento</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                checked={paymentMethod === 'pix'}
                onChange={() => handlePaymentMethodChange('pix')}
                className="mr-2"
                disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita seleção
              />
              <Smartphone className="w-4 h-4 mr-2" />
              <span>PIX</span>
            </label>
            {!pixKeyValue && paymentMethod === 'pix' && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm mt-2">
                Atenção: A chave Pix não foi configurada no painel administrativo. Por favor, escolha outra forma de pagamento.
              </div>
            )}
            <label className="flex items-center">
              <input
                type="radio"
                checked={paymentMethod === 'card'}
                onChange={() => handlePaymentMethodChange('card')}
                className="mr-2"
                disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // Desabilita seleção
              />
              <CreditCard className="w-4 h-4 mr-2" />
              <span>Cartão - você será redirecionado para o mercado pago</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={paymentMethod === 'cash'}
                onChange={() => handlePaymentMethodChange('cash')}
                className="mr-2"
                disabled={isMercadoPagoReturnFlow || showPixInstructionsModal} // <--- CORRIGIDO AQUI
              />
              <DollarSign className="w-4 h-4 mr-2" />
              <span>Dinheiro (na entrega)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="border-t p-4 bg-gray-50">
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Taxa de entrega:</span>
              <span>R$ {deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Desconto:</span>
              <span>-R$ {discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {!canPlaceOrder && ( // Se não pode fazer pedido (nem normal, nem pré-pedido)
          <div className="mb-4 p-3 bg-red-100 text-red-800 text-sm rounded-lg text-center">
            O restaurante está fechado. Não é possível finalizar o pedido agora.
          </div>
        )}
        {canPlaceOrder && !isStoreOpen && ( // Se pode fazer pedido (pré-pedido) mas a loja não está aberta
          <div className="mb-4 p-3 bg-blue-100 text-blue-800 text-sm rounded-lg text-center">
            O restaurante está fechado, mas você pode agendar seu pedido para mais tarde.
          </div>
        )}
        {!user && (
          <div className="mb-4 p-3 bg-orange-100 text-orange-800 text-sm rounded-lg text-center">
            Faça login para finalizar seu pedido.
          </div>
        )}
        <button
          onClick={handleFinishOrder}
          disabled={isSubmitting || !canPlaceOrder || !user || paymentMethod === null || (paymentMethod === 'pix' && !pixKeyValue) || showPixInstructionsModal}
          className={`w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            ${paymentMethod === 'card' && isMercadoPagoAcknowledged ? 'animate-pulse ring-4 ring-red-300' : ''}
          `}
        >
          {isSubmitting ? 'Finalizando...' : 'Finalizar Pedido'}
        </button>
      </div>

      {/* Mercado Pago Warning Pop-up */}
      {showMercadoPagoWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center animate-scale-in">
            <ExternalLink className="w-12 h-12 mx-auto text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Atenção ao Pagamento!</h3>
            <p className="text-gray-600 mb-4">
              Você será redirecionado para o pagamento no cartão via link Mercado Pago.
              Após o pagamento, retorne ao carrinho e finalize o pedido por favor!
            </p>
            <button
              onClick={handleMercadoPagoConfirm}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Pix Instructions Pop-up */}
      {showPixInstructionsModal && paymentMethod === 'pix' && pixKeyValue && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center animate-scale-in">
            <Smartphone className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Copie a chave Pix e pague seu pedido!</h3>
            <p className="text-gray-600 mb-4">
              Pague exatamente o valor do seu pedido e volte para finalizar no carrinho.
            </p>

            <div className="text-left mb-4">
              <p className="font-semibold text-gray-800 mb-2">Siga estes passos:</p>
              <ol className="list-decimal list-inside text-gray-700 space-y-1">
                <li>Copie a chave Pix e vá até o seu banco pagar o pedido.</li>
                <li>Volte e clique em "Entendi" para aparecer "Finalizar Pedido" e você finalizar o pedido já pago para a C&R Sushi poder preparar 😋.</li>
              </ol>
            </div>

            <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 flex items-center justify-between mb-4">
              <span className="font-mono font-semibold text-gray-800 break-all mr-2">{pixKeyValue}</span>
              <button onClick={copyPixKey} className="ml-2 p-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors" title="Copiar chave Pix">
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handlePixInstructionsConfirm}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};