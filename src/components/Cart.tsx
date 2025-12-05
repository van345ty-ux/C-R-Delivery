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

  const isAwaitingPixPayment = paymentMethod === 'pix' && pixPaymentInitiated && !hasAcknowledgedPixReturnConfirmation;

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
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Carrinho</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Seu carrinho está vazio</p>
            <button onClick={onClose} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">Ver Cardápio</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Carrinho</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.map((item) => (
          <div key={item.product.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium">{item.product.name}</h4>
              <button onClick={() => onRemoveItem(item.product.id)} className="text-red-500 text-sm" disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}>Remover</button>
            </div>
            {item.observations && (<p className="text-sm text-gray-600 mb-2">Obs: {item.observations}</p>)}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)} className="bg-gray-300 hover:bg-gray-400 rounded-full p-1" disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}><Minus className="w-3 h-3" /></button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)} className="bg-gray-300 hover:bg-gray-400 rounded-full p-1" disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}><Plus className="w-3 h-3" /></button>
              </div>
              <span className="font-medium">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
            </div>
          </div>
        ))}

        <div className="border-t pt-4">
          {!user ? (
            <div className="text-center text-sm text-gray-600 bg-gray-100 p-3 rounded-lg"><p>Faça login para aplicar cupons de desconto.</p></div>
          ) : (
            <>
              {firstAvailableCoupon && !appliedCoupon && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm flex items-center justify-between mb-3">
                  <div className="flex items-center"><Gift className="w-4 h-4 mr-2" /><span>Você tem cupom disponível!</span></div>
                  <button onClick={() => { if (firstAvailableCoupon) handleApplyCoupon(firstAvailableCoupon.code); }} className="ml-2 px-3 py-1 rounded-md bg-green-100 hover:bg-green-200 text-green-800 font-medium" disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment}>Clique para aplicar</button>
                </div>
              )}
              <div className="flex space-x-2 mb-2">
                <input type="text" placeholder="Cupom de desconto" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" disabled={loadingCoupon || isMercadoPagoReturnFlow || isAwaitingPixPayment} ref={couponInputRef} />
                <button onClick={() => handleApplyCoupon()} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50" disabled={loadingCoupon || isMercadoPagoReturnFlow || isAwaitingPixPayment}>{loadingCoupon ? '...' : 'Aplicar'}</button>
              </div>
              {appliedCoupon && (<p className="text-green-600 text-sm">Cupom {appliedCoupon.code} aplicado! {appliedCoupon.discount}% de desconto</p>)}
            </>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Tipo de Entrega</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" checked={deliveryType === 'delivery'} onChange={() => setDeliveryType('delivery')} className="mr-2" disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment} />
              <span>Delivery (+R$ {deliveryFeeValue.toFixed(2)})</span>
            </label>
            <label className="flex items-center"><input type="radio" checked={deliveryType === 'pickup'} onChange={() => setDeliveryType('pickup')} className="mr-2" disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment} /><span>Retirada no local (Grátis)</span></label>
          </div>
        </div>

        {deliveryType === 'delivery' && (
          <div>
            <label className="block text-sm font-medium mb-2">Endereço para entrega</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro..." className="w-full p-3 border rounded-lg text-sm" rows={3} disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment} />
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Forma de Pagamento</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="radio" name="paymentMethod" checked={paymentMethod === 'pix'} onChange={() => { setPaymentMethod('pix'); if (!hasSeenPixInstructions) setShowPixInstructions(true); localStorage.removeItem('hasSeenMercadoPagoWarning'); setIsMercadoPagoAcknowledged(false); }} className="mr-2" disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment} />
              <Smartphone className="w-4 h-4 mr-2" /><span>PIX</span>
            </label>
            {paymentMethod === 'pix' && hasSeenPixInstructions && pixKeyValue && (
              <div className="ml-6 mt-2 p-3 bg-gray-100 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Chave PIX:</p>
                  <p className="font-mono text-sm break-all">{pixKeyValue}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pixKeyValue);
                    toast.success('Chave PIX copiada!');
                  }}
                  className="ml-4 p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  aria-label="Copiar chave PIX"
                >
                  <Copy className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            )}
            {!pixKeyValue && paymentMethod === 'pix' && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm mt-2">Atenção: A chave Pix não foi configurada no painel administrativo. Por favor, escolha outra forma de pagamento.</div>
            )}
            <label className="flex items-center">
              <input type="radio" name="paymentMethod" checked={paymentMethod === 'card'} onChange={() => { setPaymentMethod('card'); setHasSeenPixInstructions(false); localStorage.removeItem('hasSeenPixInstructions'); clearPixFlags(); }} className="mr-2" disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment} />
              <CreditCard className="w-4 h-4 mr-2" /><span>Cartão - você será redirecionado para o mercado pago</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="paymentMethod" checked={paymentMethod === 'cash'} onChange={() => { setPaymentMethod('cash'); setHasSeenPixInstructions(false); localStorage.removeItem('hasSeenPixInstructions'); localStorage.removeItem('hasSeenMercadoPagoWarning'); setIsMercadoPagoAcknowledged(false); clearPixFlags(); }} className="mr-2" disabled={isMercadoPagoReturnFlow || isAwaitingPixPayment} />
              <DollarSign className="w-4 h-4 mr-2" /><span>Dinheiro (na entrega)</span>
            </label>
          </div>
        </div>

        {paymentMethod === 'cash' && (
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Precisa de troco?</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setNeedsChange(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${needsChange === true ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Sim
              </button>
              <button
                onClick={() => { setNeedsChange(false); setChangeForAmount(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${needsChange === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Não
              </button>
            </div>
            {needsChange === true && (
              <div className="animate-fade-in">
                <label htmlFor="changeFor" className="block text-sm font-medium text-gray-700 mb-1">
                  Troco para quanto?
                </label>
                <input
                  id="changeFor"
                  type="number"
                  value={changeForAmount}
                  onChange={(e) => setChangeForAmount(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                  placeholder="Ex: 50.00"
                  min={total}
                />
                {parseFloat(changeForAmount) > total && (
                  <p className="text-sm text-green-600 mt-2">
                    Seu troco será de: <strong>R$ {(parseFloat(changeForAmount) - total).toFixed(2)}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t p-4 bg-gray-50">
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between"><span>Subtotal:</span><span>R$ {subtotal.toFixed(2)}</span></div>
          {deliveryFee > 0 && (<div className="flex justify-between"><span>Taxa de entrega:</span><span>R$ {deliveryFee.toFixed(2)}</span></div>)}
          {discount > 0 && (<div className="flex justify-between text-green-600"><span>Desconto:</span><span>-R$ {discount.toFixed(2)}</span></div>)}
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span>R$ {total.toFixed(2)}</span></div>
        </div>

        {!canPlaceOrder && (<div className="mb-4 p-3 bg-red-100 text-red-800 text-sm rounded-lg text-center">O restaurante está fechado. Não é possível finalizar o pedido agora.</div>)}
        {canPlaceOrder && !isStoreOpen && (<div className="mb-4 p-3 bg-blue-100 text-blue-800 text-sm rounded-lg text-center">O restaurante está fechado, mas você pode agendar seu pedido para mais tarde.</div>)}
        {!user && (<div className="mb-4 p-3 bg-orange-100 text-orange-800 text-sm rounded-lg text-center">Faça login para finalizar seu pedido.</div>)}
        <button
          onClick={handleFinishOrder}
          disabled={isSubmitting || !canPlaceOrder || !user || !paymentMethod || (paymentMethod === 'pix' && (!pixKeyValue || !hasSeenPixInstructions))}
          className={`w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${paymentMethod === 'card' && isMercadoPagoAcknowledged ? 'animate-pulse ring-4 ring-red-300' : ''}`}
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
  );
};