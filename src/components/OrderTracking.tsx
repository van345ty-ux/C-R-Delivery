import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, Package, Truck, Home, AlertTriangle } from 'lucide-react';
import { Order, CartItem } from '../types';
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';

interface OrderTrackingProps {
  order: Order;
  onBack: () => void;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({ order: initialOrder, onBack }) => {
  const [order, setOrder] = useState<Order>(initialOrder);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchOrderStatus = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single();

      if (error) {
        console.error('Error fetching order status:', error);
        return;
      }

      if (data) {
        const formattedItems: CartItem[] = (data.items || []).map((item: any) => ({
          quantity: item.quantity,
          observations: item.observations,
          product: {
            id: item.product_id || '',
            name: item.name,
            price: item.price,
            image: '',
            description: '',
            category: '',
            available: true,
          }
        }));

        const newOrderObj = {
          id: data.id,
          orderNumber: data.order_number,
          items: formattedItems,
          total: data.total,
          deliveryFee: data.delivery_fee,
          deliveryType: data.delivery_type,
          paymentMethod: data.payment_method,
          address: data.address,
          status: data.status,
          customerName: data.customer_name,
          customerPhone: data.customer_phone,
          createdAt: data.created_at,
          couponUsed: data.coupon_used,
          changeFor: data.change_for,
          sushi_egg_delivery_day: data.sushi_egg_delivery_day,
        };

        if (
          data.status !== order.status ||
          data.order_number !== order.orderNumber ||
          !order.deliveryType ||
          !order.paymentMethod ||
          order.items.length !== formattedItems.length
        ) {
          setOrder(newOrderObj);
          if (data.status !== order.status) {
            toast.success(`Status do pedido atualizado para: ${data.status}`);
          }
        }
      }
    };

    fetchOrderStatus();
    intervalId = setInterval(fetchOrderStatus, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [order.id, order.status, order.orderNumber, order.deliveryType, order.paymentMethod, order.items.length]);

  const getDeliverySteps = () => {
    return [
      'Pedido recebido',
      'Em preparação',
      'Pronto para entrega',
      'Saiu para entrega',
      'Entregue'
    ];
  };

  const getPickupSteps = () => {
    return [
      'Pedido recebido',
      'Em preparação',
      'Aguardando cliente retirar o pedido',
      'Cliente já fez a retirada'
    ];
  };

  const steps = order.deliveryType === 'delivery' ? getDeliverySteps() : getPickupSteps();
  const currentStepIndex = steps.indexOf(order.status);

  const getStepIcon = (step: string, isCompleted: boolean, isActive: boolean) => {
    const iconClass = `w-6 h-6 ${
      isCompleted ? 'text-green-600' : isActive ? 'text-yellow-600' : 'text-gray-400'
    }`;

    switch (step) {
      case 'Pedido recebido':
        return <CheckCircle className={iconClass} />;
      case 'Em preparação':
        return <Clock className={iconClass} />;
      case 'Pronto para entrega':
      case 'Aguardando cliente retirar o pedido':
        return <Package className={iconClass} />;
      case 'Saiu para entrega':
        return <Truck className={iconClass} />;
      case 'Entregue':
      case 'Cliente já fez a retirada':
        return <Home className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="shadow-sm transition-colors duration-300" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Acompanhar Pedido</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pedido #C&R{order.orderNumber.toString().padStart(2, '0')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Attention Message */}
        <div className="border-l-4 border-yellow-500 p-4 rounded-lg flex items-center space-x-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm font-medium">
            Atenção: Mantenha esta página aberta para acompanhar as atualizações do seu pedido em tempo real ou acompanhe as notificações no whatsapp em tempo real.
          </p>
        </div>

        {/* Order Status */}
        <div className="rounded-lg shadow-sm p-6 border transition-colors duration-300" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Status do Pedido</h2>
          
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isActive = index === currentStepIndex;
              
              return (
                <div key={step} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300" style={{
                    backgroundColor: isCompleted 
                      ? 'rgba(34, 197, 94, 0.15)' 
                      : isActive 
                        ? 'rgba(234, 179, 8, 0.15)' 
                        : 'var(--bg-secondary)'
                  }}>
                    {getStepIcon(step, isCompleted, isActive)}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-semibold transition-colors duration-300" style={{
                      color: isCompleted 
                        ? '#22c55e' 
                        : isActive 
                          ? '#eab308' 
                          : 'var(--text-tertiary)'
                    }}>
                      {step}
                    </p>
                    {isActive && (
                      <p className="text-sm mt-1 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                        {step === 'Entregue' || step === 'Cliente já fez a retirada' ? (
                          <>
                            Obrigado e volte sempre!
                            <br />
                            <span className="font-bold text-red-600">C&R SUSHI</span>
                          </>
                        ) : step === 'Em preparação' ? (
                          'Estamos preparando seu pedido com muito carinho!'
                        ) : (
                          'Aguarde as próximas atualizações'
                        )}
                      </p>
                    )}
                  </div>
                  
                  {isCompleted && (
                    <div className="text-green-500">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="rounded-lg shadow-sm p-6 border transition-colors duration-300" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Detalhes do Pedido</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Tipo de entrega:</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {order.deliveryType === 'delivery' ? 'Delivery' : 'Retirada no local'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Pagamento:</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {order.paymentMethod === 'pix' ? 'PIX' : 
                 order.paymentMethod === 'card' ? 'Cartão (na entrega)' : 'Dinheiro (na entrega)'}
              </span>
            </div>
            
            {order.address && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Endereço:</span>
                <span className="font-semibold text-right max-w-[70%]" style={{ color: 'var(--text-primary)' }}>{order.address}</span>
              </div>
            )}

            {order.changeFor && order.changeFor > order.total && (
              <>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Troco para:</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>R$ {order.changeFor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  <span>Seu troco:</span>
                  <span>R$ {(order.changeFor - order.total).toFixed(2)}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between border-t pt-3 mt-3 transition-colors duration-300" style={{ borderColor: 'var(--border-primary)' }}>
              <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Total:</span>
              <span className="font-bold text-lg text-red-600 dark:text-red-500">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="rounded-lg shadow-sm p-6 border transition-colors duration-300" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Itens do Pedido</h2>
          
          <div className="space-y-4">
            {order.items.map((item: CartItem) => (
              <div key={item.product.id} className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0 transition-colors duration-300" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.product.name}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Quantidade: {item.quantity} | R$ {item.product.price.toFixed(2)} cada
                  </p>
                  {item.observations && (
                    <p className="text-sm mt-1 italic" style={{ color: 'var(--text-tertiary)' }}>Obs: {item.observations}</p>
                  )}
                </div>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  R$ {(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="rounded-lg p-4 text-center border transition-colors duration-300" style={{ 
          backgroundColor: 'var(--accent-light)', 
          borderColor: 'var(--accent-primary)' 
        }}>
          <p className="font-bold mb-1" style={{ color: 'var(--accent-primary)' }}>Precisa de ajuda?</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Entre em contato conosco pelo WhatsApp:{' '}
            <a href="https://wa.me/5573999743274" target="_blank" rel="noopener noreferrer" className="font-bold text-red-600 dark:text-red-400 hover:underline">
              (73) 99974-3274
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};