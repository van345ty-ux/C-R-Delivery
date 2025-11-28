import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, Package, Truck, Home, AlertTriangle } from 'lucide-react';
import { Order, CartItem } from '../types'; // Corrected import path and added CartItem type
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
        .select('status, order_number') // Seleciona order_number também
        .eq('id', order.id)
        .single();

      if (error) {
        console.error('Error fetching order status:', error);
        // toast.error('Erro ao buscar status do pedido.'); // Pode ser muito intrusivo para polling
        return;
      }

      if (data && (data.status !== order.status || data.order_number !== order.orderNumber)) {
        setOrder((prevOrder: Order) => ({ // Explicitly typed prevOrder
          ...prevOrder,
          status: data.status,
          orderNumber: data.order_number, // Atualiza orderNumber se necessário
        }));
        toast.success(`Status do pedido atualizado para: ${data.status}`);
      }
    };

    // Fetch immediately and then every 5 seconds
    fetchOrderStatus();
    intervalId = setInterval(fetchOrderStatus, 5000); // Poll every 5 seconds

    // Cleanup interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [order.id, order.status, order.orderNumber]); // Dependência de order.status e order.orderNumber para re-renderizar e atualizar o UI

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Acompanhar Pedido</h1>
              <p className="text-sm text-gray-600">Pedido #C&R{order.orderNumber.toString().padStart(2, '0')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Attention Message */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            Atenção: Mantenha esta página aberta para acompanhar as atualizações do seu pedido em tempo real ou acompanhe as notificações no whatsapp em tempo real.
          </p>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Status do Pedido</h2>
          
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isActive = index === currentStepIndex;
              
              return (
                <div key={step} className="flex items-center space-x-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100' : isActive ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    {getStepIcon(step, isCompleted, isActive)}
                  </div>
                  
                  <div className="flex-1">
                    <p className={`font-medium ${
                      isCompleted ? 'text-green-800' : isActive ? 'text-yellow-800' : 'text-gray-500'
                    }`}>
                      {step}
                    </p>
                    {isActive && (
                      <p className="text-sm text-gray-600 mt-1">
                        {step === 'Entregue' || step === 'Cliente já fez a retirada' ? (
                          <>
                            Obrigado e volte sempre!
                            <br />
                            <span className="font-semibold text-red-600">C&R SUSHI</span>
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
                    <div className="text-green-600">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Detalhes do Pedido</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo de entrega:</span>
              <span className="font-medium">
                {order.deliveryType === 'delivery' ? 'Delivery' : 'Retirada no local'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Pagamento:</span>
              <span className="font-medium">
                {order.paymentMethod === 'pix' ? 'PIX' : 
                 order.paymentMethod === 'card' ? 'Cartão (na entrega)' : 'Dinheiro (na entrega)'}
              </span>
            </div>
            
            {order.address && (
              <div className="flex justify-between">
                <span className="text-gray-600">Endereço:</span>
                <span className="font-medium text-right">{order.address}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-lg">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Itens do Pedido</h2>
          
          <div className="space-y-3">
            {order.items.map((item: CartItem) => ( // Explicitly typed item
              <div key={item.product.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-gray-600">
                    Quantidade: {item.quantity} | R$ {item.product.price.toFixed(2)} cada
                  </p>
                  {item.observations && (
                    <p className="text-sm text-gray-500 mt-1">Obs: {item.observations}</p>
                  )}
                </div>
                <span className="font-medium">
                  R$ {(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <p className="text-red-800 font-medium mb-2">Precisa de ajuda?</p>
          <p className="text-red-600 text-sm">
            Entre em contato conosco pelo WhatsApp: (73) 99974-3274
          </p>
        </div>
      </div>
    </div>
  );
};