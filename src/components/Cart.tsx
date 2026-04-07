import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, CreditCard, Smartphone, DollarSign, Gift, ExternalLink, Copy } from 'lucide-react';
import { CartItem, Order, User, Coupon } from '../types';
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';
import { withRetry, withTimeout, TIMEOUT_MS } from '../hooks/useQuery';
import { PixInstructionsModal } from './PixInstructionsModal';
import { PixReturnConfirmationModal } from './PixReturnConfirmationModal';
import { sendWhatsappNotification } from '../utils/whatsapp';

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onOrderCreated: (order: Order) => void;
  user: User | null;
  isStoreOpen: boolean;
  canPlaceOrder: boolean;
  isMercadoPagoReturnFlow: boolean;
  isPixReturnFlow: boolean;
}

export const Cart: React.FC<CartProps> = ({
  items,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onOrderCreated,
  user,
  isStoreOpen,
  canPlaceOrder,
  isMercadoPagoReturnFlow,
  isPixReturnFlow,
}) => {
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>(() => {
    return localStorage.getItem('cartDeliveryType') as 'delivery' | 'pickup' || 'delivery';
  });
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash' | null>(null);
  const [address, setAddress] = useState(() => localStorage.getItem('cartAddress') || '');
  const [couponCode, setCouponCode] = useState(() => localStorage.getItem('cartCouponCode') || '');
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number } | null>(() => {
    const savedCoupon = localStorage.getItem('cartAppliedCoupon');
    return savedCoupon ? JSON.parse(savedCoupon) : null;
  });
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryFeeValue, setDeliveryFeeValue] = useState(3.00);
  const [pixKeyValue, setPixKeyValue] = useState('');
  const [mercadoPagoLink, setMercadoPagoLink] = useState('https://link.mercadopago.com.br/sushicr');
  const [firstAvailableCoupon, setFirstAvailableCoupon] = useState<Coupon | null>(null);
  const couponInputRef = useRef<HTMLInputElement>(null);
  const [showMercadoPagoWarning, setShowMercadoPagoWarning] = useState(false);
  const [isMercadoPagoAcknowledged, setIsMercadoPagoAcknowledged] = useState(() => {
    return JSON.parse(localStorage.getItem('hasSeenMercadoPagoWarning') || 'false');
  });
  const [showPixInstructions, setShowPixInstructions] = useState(false);
  const [hasSeenPixInstructions, setHasSeenPixInstructions] = useState(() => {
    return JSON.parse(localStorage.getItem('hasSeenPixInstructions') || 'false');
  });
  const [pixPaymentInitiated, setPixPaymentInitiated] = useState(() => JSON.parse(localStorage.getItem('pixPaymentInitiated') || 'false'));
  const [showPixReturnConfirmation, setShowPixReturnConfirmation] = useState(false);
  const [hasAcknowledgedPixReturnConfirmation, setHasAcknowledgedPixReturnConfirmation] = useState(() => JSON.parse(localStorage.getItem('hasAcknowledgedPixReturnConfirmation') || 'false'));

  // Novos estados para o troco
  const [needsChange, setNeedsChange] = useState<boolean | null>(null);
  const [changeForAmount, setChangeForAmount] = useState<string>('');

  // Estado para dia de entrega dos Ovos de Sushi
  const [sushiEggDeliveryDay, setSushiEggDeliveryDay] = useState<'Sábado' | 'Domingo' | null>(null);

  // Detecta se há itens da categoria Ovos de Sushi no carrinho
  const hasOvosDesSushi = items.some(item => item.product.category === 'Ovos de Sushi');

  const isAwaitingPixPayment = paymentMethod === 'pix' && pixPaymentInitiated && !hasAcknowledgedPixReturnConfirmation;

  // Add/remove cart-open class to body and html to hide scrollbar
  useEffect(() => {
    document.documentElement.classList.add('cart-open');
    document.body.classList.add('cart-open');
    return () => {
      document.documentElement.classList.remove('cart-open');
      document.body.classList.remove('cart-open');
    };
  }, []);

  useEffect(() => {
    if (isMercadoPagoReturnFlow) {
      setPaymentMethod('card');
    } else if (isPixReturnFlow) {
      setPaymentMethod('pix');
    }
  }, [isMercadoPagoReturnFlow, isPixReturnFlow]);

  useEffect(() => {
    localStorage.setItem('cartDeliveryType', deliveryType);
    localStorage.setItem('cartAddress', address);
    localStorage.setItem('cartCouponCode', couponCode);
    localStorage.setItem('cartAppliedCoupon', JSON.stringify(appliedCoupon));
  }, [deliveryType, address, couponCode, appliedCoupon]);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsMercadoPagoAcknowledged(JSON.parse(localStorage.getItem('hasSeenMercadoPagoWarning') || 'false'));
      setHasSeenPixInstructions(JSON.parse(localStorage.getItem('hasSeenPixInstructions') || 'false'));
      setPixPaymentInitiated(JSON.parse(localStorage.getItem('pixPaymentInitiated') || 'false'));
      setHasAcknowledgedPixReturnConfirmation(JSON.parse(localStorage.getItem('hasAcknowledgedPixReturnConfirmation') || 'false'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const pixInitiated = JSON.parse(localStorage.getItem('pixPaymentInitiated') || 'false');
    const pixAcknowledged = JSON.parse(localStorage.getItem('hasAcknowledgedPixReturnConfirmation') || 'false');
    if (pixInitiated && !pixAcknowledged) {
      setShowPixReturnConfirmation(true);
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const pixInitiated = JSON.parse(localStorage.getItem('pixPaymentInitiated') || 'false');
        const pixAcknowledged = JSON.parse(localStorage.getItem('hasAcknowledgedPixReturnConfirmation') || 'false');
        if (pixInitiated && !pixAcknowledged) {
          setShowPixReturnConfirmation(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await withRetry(() =>
          withTimeout(
            supabase
              .from('settings')
              .select('key, value')
              .then(({ data, error }) => {
                if (error) throw error;
                return data;
              }),
            TIMEOUT_MS
          )
        );

        if (data) {
          const settingsMap = data.reduce((acc: { [key: string]: string }, { key, value }: { key: string, value: string }) => {
            acc[key] = value;
            return acc;
          }, {});
          if (!isNaN(parseFloat(settingsMap.delivery_fee))) setDeliveryFeeValue(parseFloat(settingsMap.delivery_fee));
          setPixKeyValue(settingsMap.pix_key || '');
          setMercadoPagoLink(settingsMap.mercado_pago_link || 'https://link.mercadopago.com.br/sushicr');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Erro ao carregar configurações. Verifique sua conexão.');
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const checkAvailableCoupons = async () => {
      if (!user?.id) {
        setFirstAvailableCoupon(null);
        return;
      }
      let couponsData = null;
      try {
        couponsData = await withRetry(() =>
          withTimeout(
            supabase
              .from('coupons')
              .select('*')
              .or(`user_id.eq.${user.id},user_id.is.null`)
              .eq('active', true)
              .eq('is_pending_admin_approval', false)
              .then(({ data, error }) => {
                if (error) throw error;
                return data;
              }),
            TIMEOUT_MS
          )
        );
      } catch (error) {
        console.error('Error fetching coupons:', error);
      }

      if (!couponsData) {
        setFirstAvailableCoupon(null);
        return;
      }
      const today = new Date();
      const availableCoupons = (couponsData || []).filter((coupon: Coupon) => {
        const validFrom = new Date(coupon.valid_from);
        const validTo = new Date(coupon.valid_to);
        validTo.setHours(23, 59, 59, 999);
        const isCurrentlyValid = today >= validFrom && today <= validTo;
        const hasUsagesLeft = coupon.usage_limit === null || coupon.usage_limit === undefined || coupon.usage_count < coupon.usage_limit;
        if ((coupon.type === 'birthday' || coupon.type === 'loyalty') && !coupon.user_id) return false;
        return isCurrentlyValid && hasUsagesLeft;
      });
      setFirstAvailableCoupon(availableCoupons.length > 0 ? availableCoupons[0] : null);
    };
    checkAvailableCoupons();
  }, [user?.id]);

  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const deliveryFee = deliveryType === 'delivery' ? deliveryFeeValue : 0;
  const discount = appliedCoupon ? (subtotal * appliedCoupon.discount / 100) : 0;
  const total = subtotal + deliveryFee - discount;

  const clearPixFlags = () => {
    setPixPaymentInitiated(false);
    setHasAcknowledgedPixReturnConfirmation(false);
    localStorage.removeItem('pixPaymentInitiated');
    localStorage.removeItem('hasAcknowledgedPixReturnConfirmation');
    localStorage.removeItem('isPixReturnFlow');
  };

  const handleApplyCoupon = async (codeToApply?: string) => {
    if (isMercadoPagoReturnFlow) {
      toast.error('Finalize seu pedido atual antes de aplicar cupons.');
      return;
    }
    const code = codeToApply || couponCode;
    if (!user) {
      toast.error('Você precisa fazer login para aplicar cupons de desconto.');
      return;
    }
    if (!code.trim()) {
      toast.error('Por favor, insira um código de cupom.');
      return;
    }
    setLoadingCoupon(true);
    setAppliedCoupon(null);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .eq('is_pending_admin_approval', false)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
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
    validTo.setHours(23, 59, 59, 999);
    if (today < validFrom || today > validTo) {
      toast.error('Cupom expirado ou ainda não é válido.');
      return;
    }
    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && coupon.usage_count >= coupon.usage_limit) {
      toast.error('Este cupom atingiu o limite de usos.');
      return;
    }
    if (coupon.user_id && coupon.user_id !== user.id) {
      toast.error('Este cupom não é seu.');
      return;
    }
    setAppliedCoupon({ id: coupon.id, code: coupon.code, discount: coupon.discount });
    setCouponCode(code);
    toast.success('Cupom aplicado com sucesso!');
  };

  const handleFinishOrder = async () => {
    if (!canPlaceOrder) {
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
    if (!paymentMethod) {
      toast.error('Por favor, selecione uma forma de pagamento.');
      return;
    }
    if (paymentMethod === 'cash' && needsChange === true && (!changeForAmount || parseFloat(changeForAmount) < total)) {
      toast.error('Por favor, insira um valor para o troco que seja maior que o total do pedido.');
      return;
    }
    if (hasOvosDesSushi && !sushiEggDeliveryDay) {
      toast.error('🍣 Escolha o dia de entrega dos Ovos de Sushi: Sábado ou Domingo.');
      return;
    }
    if (paymentMethod === 'pix' && isAwaitingPixPayment) {
      toast.error('Vá até o seu banco, pague o valor do pedido e volte para finalizar.');
      return;
    }
    if (paymentMethod === 'pix' && (!pixKeyValue || !hasSeenPixInstructions)) {
      toast.error('Por favor, siga as instruções de pagamento PIX antes de finalizar.');
      return;
    }
    if (paymentMethod === 'card') {
      const acknowledged = JSON.parse(localStorage.getItem('hasSeenMercadoPagoWarning') || 'false');
      if (!acknowledged) {
        setShowMercadoPagoWarning(true);
        return;
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
      coupon_used: appliedCoupon?.code,
      change_for: (paymentMethod === 'cash' && needsChange && parseFloat(changeForAmount) > 0) ? parseFloat(changeForAmount) : null,
      sushi_egg_delivery_day: hasOvosDesSushi ? sushiEggDeliveryDay : null,
    };
    // Adicionando timeout para evitar travamento na criação do pedido
    let newOrder, error;

    try {
      const result = await Promise.race([
        supabase
          .from('orders')
          .insert(orderPayload)
          .select('*, order_number')
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 60000)
        )
      ]) as any;

      newOrder = result.data;
      error = result.error;
    } catch (err) {
      console.error('Error creating order (timeout):', err);
      toast.error('O servidor demorou para responder. Tente novamente em alguns instantes.');
      setIsSubmitting(false);
      return;
    }

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
      orderNumber: newOrder.order_number,
      items: items,
      total: newOrder.total,
      deliveryFee: newOrder.delivery_fee,
      deliveryType: newOrder.delivery_type,
      paymentMethod: newOrder.payment_method as 'pix' | 'card' | 'cash',
      address: newOrder.address,
      status: newOrder.status,
      customerName: newOrder.customer_name,
      customerPhone: newOrder.customer_phone,
      createdAt: newOrder.created_at,
      couponUsed: newOrder.coupon_used,
      changeFor: newOrder.change_for,
      sushi_egg_delivery_day: newOrder.sushi_egg_delivery_day,
    };

    // Enviar notificação sem bloquear o fluxo principal por muito tempo
    try {
      await Promise.race([
        sendWhatsappNotification(formattedOrder),
        new Promise(resolve => setTimeout(resolve, 5000)) // Timeout de 5s para notificação
      ]);
    } catch (err) {
      console.error('Erro ou timeout no envio do WhatsApp:', err);
    }

    onOrderCreated(formattedOrder);
    onClose();
    setIsSubmitting(false);
    localStorage.removeItem('hasSeenMercadoPagoWarning');
    localStorage.removeItem('isMercadoPagoReturnFlow');
    localStorage.removeItem('hasSeenPixInstructions');
    localStorage.removeItem('cartPaymentMethod');
    clearPixFlags();
    setIsMercadoPagoAcknowledged(false);
    setHasSeenPixInstructions(false);
    toast.success('Pedido finalizado com sucesso!');
  };

  const handleMercadoPagoConfirm = () => {
    setShowMercadoPagoWarning(false);
    localStorage.setItem('hasSeenMercadoPagoWarning', 'true');
    setIsMercadoPagoAcknowledged(true);
    localStorage.setItem('isMercadoPagoReturnFlow', 'true');
    window.open(mercadoPagoLink, '_blank');
  };

  const handlePixInstructionsClose = () => {
    setShowPixInstructions(false);
    setHasSeenPixInstructions(true);
    localStorage.setItem('hasSeenPixInstructions', 'true');
    setPixPaymentInitiated(true);
    localStorage.setItem('pixPaymentInitiated', 'true');
    localStorage.setItem('isPixReturnFlow', 'true');
  };

  if (items.length === 0) {
    return (
      <>
        {/* Backdrop to cover scrollbar */}
        <div 
          className="fixed inset-0 z-[9998]"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={onClose}
        />
        <div 
          className="fixed inset-y-0 right-0 w-full max-w-md z-[9999] flex flex-col"
          style={{
            backgroundColor: 'var(--bg-primary)',
            boxShadow: 'var(--shadow-2xl)',
            borderLeft: '1px solid var(--border-primary)'
          }}
        >
        <div 
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <h2 
            className="text-xl font-semibold"
            style={{ 
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)'
            }}
          >
            Carrinho
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-secondary)'
            }}
            aria-label="Fechar carrinho"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p 
              className="text-base mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Seu carrinho está vazio
            </p>
            <button 
              onClick={onClose} 
              className="px-6 py-2 rounded-lg transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'var(--text-inverse)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              Ver Cardápio
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop to cover scrollbar */}
      <div 
        className="fixed inset-0 z-[9998]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      <div 
      className="fixed inset-y-0 right-0 w-full max-w-md z-[9999] flex flex-col"
      style={{
        backgroundColor: 'var(--bg-primary)',
        boxShadow: 'var(--shadow-2xl)',
        borderLeft: '1px solid var(--border-primary)'
      }}
    >
      <div 
        className="flex items-center justify-between p-4"
        style={{ borderBottom: '1px solid var(--border-primary)' }}
      >
        <h2 
          className="text-xl font-semibold"
          style={{ 
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)'
          }}
        >
          Carrinho
        </h2>
        <button 
          onClick={onClose} 
          className="p-2 rounded-full transition-all duration-300 hover:scale-110"
          style={{
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.map((item) => (
          <div 
            key={item.product.id} 
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 
                className="font-medium text-base"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.product.name}
              </h4>
              <button 
                onClick={() => onRemoveItem(item.product.id)} 
                className="text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-1"
                style={{ color: '#ef4444' }}
                disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
                aria-label={`Remover ${item.product.name} do carrinho`}
              >
                Remover
              </button>
            </div>
            {item.observations && (
              <p 
                className="text-sm mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Obs: {item.observations}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)} 
                  className="rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)'
                  }}
                  disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
                  aria-label={`Diminuir quantidade de ${item.product.name}`}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span 
                  className="w-8 text-center text-base" 
                  style={{ color: 'var(--text-primary)' }}
                  aria-label={`Quantidade: ${item.quantity}`}
                >
                  {item.quantity}
                </span>
                <button 
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)} 
                  className="rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)'
                  }}
                  disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
                  aria-label={`Aumentar quantidade de ${item.product.name}`}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span 
                className="font-medium text-base"
                style={{ color: 'var(--text-primary)' }}
              >
                R$ {(item.product.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        ))}

        <div className="border-t pt-4">
          {!user ? (
            <div className="text-center text-sm text-gray-600 bg-gray-100 p-4 rounded-lg"><p>Faça login para aplicar cupons de desconto.</p></div>
          ) : (
            <>
              {firstAvailableCoupon && !appliedCoupon && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm flex items-center justify-between mb-4">
                  <div className="flex items-center"><Gift className="w-4 h-4 mr-2" /><span>Você tem cupom disponível!</span></div>
                <button 
                  onClick={() => { if (firstAvailableCoupon) handleApplyCoupon(firstAvailableCoupon.code); }} 
                  className="ml-2 px-3 py-2 rounded-md bg-green-100 hover:bg-green-200 text-green-800 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" 
                  disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
                >
                  Clique para aplicar
                </button>
                </div>
              )}
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  placeholder="Cupom de desconto" 
                  value={couponCode} 
                  onChange={(e) => setCouponCode(e.target.value)} 
                  className="flex-1 p-3 border rounded-lg text-sm" 
                  disabled={loadingCoupon || isMercadoPagoReturnFlow || isAwaitingPixPayment} 
                  ref={couponInputRef}
                  aria-label="Código do cupom de desconto"
                />
                <button 
                  onClick={() => handleApplyCoupon()} 
                  className="bg-green-600 text-white px-4 py-3 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" 
                  disabled={loadingCoupon || isMercadoPagoReturnFlow || isAwaitingPixPayment}
                  aria-label="Aplicar cupom de desconto"
                >
                  {loadingCoupon ? '...' : 'Aplicar'}
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-green-600 text-sm" role="status" aria-live="polite">
                  Cupom {appliedCoupon.code} aplicado! {appliedCoupon.discount}% de desconto
                </p>
              )}
            </>
          )}
        </div>

        {/* Seleção de Dia – Ovos de Sushi (aparece apenas quando há itens desta categoria) */}
        {hasOvosDesSushi && (
          <div className="border-t pt-4">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🍣</span>
                <h3 className="font-bold text-red-700 text-base">Ovos de Sushi – Entrega Especial</h3>
              </div>
              <p className="text-sm text-red-600 mb-4">Estes itens são entregues apenas aos fins de semana. Escolha o dia que prefere receber:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSushiEggDeliveryDay('Sábado')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    sushiEggDeliveryDay === 'Sábado'
                      ? 'bg-red-600 text-white border-red-600 shadow-md scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:bg-red-50'
                  }`}
                  aria-label="Selecionar entrega no Sábado"
                  aria-pressed={sushiEggDeliveryDay === 'Sábado'}
                >
                  <span aria-hidden="true">📅</span> Sábado
                </button>
                <button
                  onClick={() => setSushiEggDeliveryDay('Domingo')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    sushiEggDeliveryDay === 'Domingo'
                      ? 'bg-red-600 text-white border-red-600 shadow-md scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:bg-red-50'
                  }`}
                  aria-label="Selecionar entrega no Domingo"
                  aria-pressed={sushiEggDeliveryDay === 'Domingo'}
                >
                  <span aria-hidden="true">📅</span> Domingo
                </button>
              </div>
              {!sushiEggDeliveryDay && (
                <p className="text-sm text-red-500 mt-2 font-medium" role="alert">
                  <span aria-hidden="true">⚠️</span> Obrigatório: selecione o dia de entrega para continuar.
                </p>
              )}
              {sushiEggDeliveryDay && (
                <p className="text-sm text-green-600 mt-2 font-medium" role="status" aria-live="polite">
                  <span aria-hidden="true">✅</span> Você receberá seus Ovos de Sushi no <strong>{sushiEggDeliveryDay}</strong>.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="border-t pt-4" style={{ borderColor: 'var(--border-primary)' }}>
          <h3 
            className="font-medium text-base mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Tipo de Entrega
          </h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input 
                type="radio" 
                checked={deliveryType === 'delivery'} 
                onChange={() => setDeliveryType('delivery')} 
                className="mr-2" 
                disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
                aria-label={`Delivery com taxa de R$ ${deliveryFeeValue.toFixed(2)}`}
              />
              <span style={{ color: 'var(--text-primary)' }}>
                Delivery (+R$ {deliveryFeeValue.toFixed(2)})
              </span>
            </label>
            <label className="flex items-center">
              <input 
                type="radio" 
                checked={deliveryType === 'pickup'} 
                onChange={() => setDeliveryType('pickup')} 
                className="mr-2" 
                disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
                aria-label="Retirada no local sem taxa"
              />
              <span style={{ color: 'var(--text-primary)' }}>
                Retirada no local (Grátis)
              </span>
            </label>
          </div>
        </div>

        {deliveryType === 'delivery' && (
          <div>
            <label 
              htmlFor="deliveryAddress" 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Endereço para entrega
            </label>
            <textarea 
              id="deliveryAddress"
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="Rua, número, bairro..." 
              className="w-full p-3 border rounded-lg text-sm" 
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              rows={3} 
              disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
              aria-label="Endereço completo para entrega"
            />
          </div>
        )}

        <div className="border-t pt-4" style={{ borderColor: 'var(--border-primary)' }}>
          <h3 
            className="font-medium text-base mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Forma de Pagamento
          </h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input 
                type="radio" 
                name="paymentMethod" 
                checked={paymentMethod === 'pix'} 
                onChange={() => { setPaymentMethod('pix'); if (!hasSeenPixInstructions) setShowPixInstructions(true); localStorage.removeItem('hasSeenMercadoPagoWarning'); setIsMercadoPagoAcknowledged(false); }} 
                className="mr-2" 
                disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
                aria-label="Pagamento via PIX"
              />
              <Smartphone className="w-4 h-4 mr-2" aria-hidden="true" />
              <span style={{ color: 'var(--text-primary)' }}>PIX</span>
            </label>
            {paymentMethod === 'pix' && hasSeenPixInstructions && pixKeyValue && (
              <div 
                className="ml-6 mt-2 p-3 rounded-lg flex items-center justify-between"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div>
                  <p 
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Chave PIX:
                  </p>
                  <p 
                    className="font-mono text-sm break-all"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {pixKeyValue}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pixKeyValue);
                    toast.success('Chave PIX copiada!');
                  }}
                  className="ml-4 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)'
                  }}
                  aria-label="Copiar chave PIX"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
            {!pixKeyValue && paymentMethod === 'pix' && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm mt-2">Atenção: A chave Pix não foi configurada no painel administrativo. Por favor, escolha outra forma de pagamento.</div>
            )}
            <label className="flex items-center">
              <input 
                type="radio" 
                name="paymentMethod" 
                checked={paymentMethod === 'card'} 
                onChange={() => { setPaymentMethod('card'); setHasSeenPixInstructions(false); localStorage.removeItem('hasSeenPixInstructions'); clearPixFlags(); }} 
                className="mr-2" 
                disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
                aria-label="Pagamento com cartão via Mercado Pago"
              />
              <CreditCard className="w-4 h-4 mr-2" aria-hidden="true" />
              <span style={{ color: 'var(--text-primary)' }}>
                Cartão - você será redirecionado para o mercado pago
              </span>
            </label>
            <label className="flex items-center">
              <input 
                type="radio" 
                name="paymentMethod" 
                checked={paymentMethod === 'cash'} 
                onChange={() => { setPaymentMethod('cash'); setHasSeenPixInstructions(false); localStorage.removeItem('hasSeenPixInstructions'); localStorage.removeItem('hasSeenMercadoPagoWarning'); setIsMercadoPagoAcknowledged(false); clearPixFlags(); }} 
                className="mr-2" 
                disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}
                aria-label="Pagamento em dinheiro na entrega"
              />
              <DollarSign className="w-4 h-4 mr-2" aria-hidden="true" />
              <span style={{ color: 'var(--text-primary)' }}>
                Dinheiro (na entrega)
              </span>
            </label>
          </div>
        </div>

        {paymentMethod === 'cash' && (
          <div className="border-t pt-4" style={{ borderColor: 'var(--border-primary)' }}>
            <h3 
              className="font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Precisa de troco?
            </h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setNeedsChange(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${needsChange === true ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 hover:bg-gray-50'}`}
                style={needsChange !== true ? { 
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-primary)'
                } : {}}
                aria-label="Sim, preciso de troco"
                aria-pressed={needsChange === true}
              >
                Sim
              </button>
              <button
                onClick={() => { setNeedsChange(false); setChangeForAmount(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${needsChange === false ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 hover:bg-gray-50'}`}
                style={needsChange !== false ? { 
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-primary)'
                } : {}}
                aria-label="Não preciso de troco"
                aria-pressed={needsChange === false}
              >
                Não
              </button>
            </div>
            {needsChange === true && (
              <div className="animate-fade-in">
                <label 
                  htmlFor="changeFor" 
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Troco para quanto?
                </label>
                <input
                  id="changeFor"
                  type="number"
                  value={changeForAmount}
                  onChange={(e) => setChangeForAmount(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Ex: 50.00"
                  min={total}
                  aria-label="Valor para o qual precisa de troco"
                  aria-describedby="changeCalculation"
                />
                {parseFloat(changeForAmount) > total && (
                  <p id="changeCalculation" className="text-sm text-green-600 mt-2" role="status" aria-live="polite">
                    Seu troco será de: <strong>R$ {(parseFloat(changeForAmount) - total).toFixed(2)}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div 
        className="border-t p-4"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-primary)' }}>Subtotal:</span>
            <span style={{ color: 'var(--text-primary)' }}>R$ {subtotal.toFixed(2)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-primary)' }}>Taxa de entrega:</span>
              <span style={{ color: 'var(--text-primary)' }}>R$ {deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Desconto:</span>
              <span>-R$ {discount.toFixed(2)}</span>
            </div>
          )}
          <div 
            className="flex justify-between font-bold text-lg border-t pt-2"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            <span style={{ color: 'var(--text-primary)' }}>Total:</span>
            <span style={{ color: 'var(--text-primary)' }}>R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {!canPlaceOrder && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 text-sm rounded-lg text-center" role="alert">
            O restaurante está fechado. Não é possível finalizar o pedido agora.
          </div>
        )}
        {canPlaceOrder && !isStoreOpen && (
          <div className="mb-4 p-3 bg-blue-100 text-blue-800 text-sm rounded-lg text-center" role="status">
            O restaurante está fechado, mas você pode agendar seu pedido para mais tarde.
          </div>
        )}
        {!user && (
          <div className="mb-4 p-3 bg-orange-100 text-orange-800 text-sm rounded-lg text-center" role="alert">
            Faça login para finalizar seu pedido.
          </div>
        )}
        <button
          onClick={handleFinishOrder}
          disabled={isSubmitting || !canPlaceOrder || !user || !paymentMethod || (paymentMethod === 'pix' && (!pixKeyValue || !hasSeenPixInstructions))}
          className={`w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${paymentMethod === 'card' && isMercadoPagoAcknowledged ? 'animate-pulse ring-4 ring-red-300' : ''}`}
          aria-label={isSubmitting ? 'Finalizando pedido, aguarde' : 'Finalizar pedido'}
        >
          {isSubmitting ? 'Finalizando...' : 'Finalizar Pedido'}
        </button>
      </div>

      {showMercadoPagoWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center animate-scale-in">
            <ExternalLink className="w-12 h-12 mx-auto text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Atenção ao Pagamento!</h3>
            <p className="text-gray-600 mb-4">Você será redirecionado para o pagamento no cartão via link Mercado Pago. Após o pagamento, retorne ao carrinho e finalize o pedido por favor!</p>
            <button onClick={handleMercadoPagoConfirm} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">Entendi</button>
          </div>
        </div>
      )}

      {showPixInstructions && pixKeyValue && (
        <PixInstructionsModal
          pixKey={pixKeyValue}
          onClose={handlePixInstructionsClose}
          total={total}
        />
      )}

      {showPixReturnConfirmation && (
        <PixReturnConfirmationModal
          onClose={() => {
            setShowPixReturnConfirmation(false);
            setHasAcknowledgedPixReturnConfirmation(true);
            localStorage.setItem('hasAcknowledgedPixReturnConfirmation', 'true');
          }}
        />
      )}
    </div>
    </>
  );
};