import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Package, Truck, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import toast from 'react-hot-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Order {
  id: string;
  user_id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  items: Array<{ name: string; quantity: number; price: number; observations?: string }>;
  total: number;
  delivery_type: 'delivery' | 'pickup';
  payment_method: string;
  address?: string;
  status: string;
  created_at: string;
  change_for?: number | null; // Adicionado campo para o troco
}

interface AdminOrdersProps {
  onUserUpdate: () => void;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ onUserUpdate }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    console.log('AdminOrders: fetchOrders called.');
    setLoading(true);

    // Buscar apenas os últimos 200 pedidos para evitar timeout
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200); // LIMITE ADICIONADO

    if (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erro ao buscar pedidos.');
    } else {
      console.log(`AdminOrders: ${data?.length || 0} pedidos carregados`);
      setOrders(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const playNotificationSound = () => {
      const audio = document.getElementById('login-sound') as HTMLAudioElement;
      if (audio) {
        audio.play().catch(error => {
          console.warn("A reprodução automática do som foi bloqueada pelo navegador.", error);
        });
      }
    };

    const orderChannel: RealtimeChannel = supabase
      .channel('admin-orders-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const newOrder = payload.new as { order_number: number };
          toast.success(`Novo Pedido Recebido! #C&R${newOrder.order_number.toString().padStart(2, '0')}`);
          playNotificationSound();
          fetchOrders(); // Atualiza a lista de pedidos
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [fetchOrders]);

  const getDeliverySteps = () => [
    'Pedido recebido',
    'Em preparação',
    'Pronto para entrega',
    'Saiu para entrega',
    'Entregue'
  ];

  const getPickupSteps = () => [
    'Pedido recebido',
    'Em preparação',
    'Aguardando cliente retirar o pedido',
    'Cliente já fez a retirada'
  ];

  const updateOrderStatus = async (orderId: string, newStatus: string, userId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast.error('Erro ao atualizar status do pedido.');
    } else {
      if (newStatus === 'Entregue' || newStatus === 'Cliente já fez a retirada') {
        await handleOrderDelivered(userId);
        onUserUpdate();
      }
      fetchOrders();
      toast.success(`Status do pedido atualizado para "${newStatus}"`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido permanentemente? Esta ação não pode ser desfeita.')) {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        toast.error('Erro ao excluir o pedido.');
        console.error('Error deleting order:', error);
      } else {
        toast.success('Pedido excluído com sucesso.');
        fetchOrders();
      }
    }
  };

  const handleOrderDelivered = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('purchase_count')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile for loyalty:', profileError);
      return;
    }

    let newPurchaseCount = (profile.purchase_count || 0) + 1;
    let resetPurchaseCount = false;

    if (newPurchaseCount >= 10) {
      const { data: existingCoupon, error: couponError } = await supabase
        .from('coupons')
        .select('id')
        .eq('user_id', userId)
        .eq('code', 'CLIENTE10')
        .eq('is_pending_admin_approval', true)
        .single();

      if (couponError && couponError.code !== 'PGRST116') {
        console.error('Error checking existing pending coupon:', couponError);
      }

      if (!existingCoupon) {
        const today = new Date();
        const validTo = new Date(today);
        validTo.setDate(today.getDate() + 7);

        const { error: insertCouponError } = await supabase
          .from('coupons')
          .insert({
            name: 'Cupom Fidelidade C&R Sushi',
            code: 'CLIENTE10',
            discount: 10,
            type: 'loyalty',
            valid_from: today.toISOString().split('T')[0],
            valid_to: validTo.toISOString().split('T')[0],
            active: false,
            usage_limit: 1,
            user_id: userId,
            is_pending_admin_approval: true,
          });

        if (insertCouponError) {
          console.error('Error creating loyalty coupon:', insertCouponError);
          toast.error('Erro ao gerar cupom de fidelidade.');
        } else {
          toast.success('Novo cupom de fidelidade "CLIENTE10" gerado para aprovação do admin!');
        }
      } else {
        toast('Cliente já possui um cupom CLIENTE10 pendente de aprovação.');
      }
      resetPurchaseCount = true;
      newPurchaseCount = 0;
    }

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ purchase_count: newPurchaseCount })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('Error updating purchase count:', updateProfileError);
      toast.error('Erro ao atualizar contagem de compras do cliente.');
    } else if (!resetPurchaseCount) {
      toast.success(`Contagem de compras do cliente atualizada para ${newPurchaseCount}/10.`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pedido recebido': return <Clock className="w-5 h-5" />;
      case 'Em preparação': return <Package className="w-5 h-5" />;
      case 'Pronto para entrega':
      case 'Aguardando cliente retirar o pedido': return <Package className="w-5 h-5" />;
      case 'Saiu para entrega': return <Truck className="w-5 h-5" />;
      case 'Entregue':
      case 'Cliente já fez a retirada': return <CheckCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pedido recebido': return 'text-blue-600 bg-blue-100';
      case 'Em preparação': return 'text-yellow-600 bg-yellow-100';
      case 'Pronto para entrega':
      case 'Aguardando cliente retirar o pedido': return 'text-orange-600 bg-orange-100';
      case 'Saiu para entrega': return 'text-purple-600 bg-purple-100';
      case 'Entregue':
      case 'Cliente já fez a retirada': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div>Carregando pedidos...</div>;
  }

  const completedStatuses = ['Entregue', 'Cliente já fez a retirada'];
  const activeOrders = orders.filter(order => !completedStatuses.includes(order.status));
  const finishedOrders = orders.filter(order => completedStatuses.includes(order.status));

  const activeOrdersCount = activeOrders.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Pedidos</h1>
        <div className="bg-red-600 text-white font-bold px-3 py-1 rounded-full text-sm flex items-center">
          <span>{activeOrdersCount}</span>
          <span className="ml-1.5">{activeOrdersCount === 1 ? 'pedido ativo' : 'pedidos ativos'}</span>
        </div>
      </div>

      {orders.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Nenhum pedido encontrado</h3>
          <p className="text-gray-600">Aguardando novos pedidos de clientes.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {[...activeOrders, ...finishedOrders].map((order, index) => {
            const isCompleted = completedStatuses.includes(order.status);
            const previousOrder = index > 0 ? [...activeOrders, ...finishedOrders][index - 1] : null;
            const previousIsCompleted = previousOrder ? completedStatuses.includes(previousOrder.status) : false;
            const showSeparator = isCompleted && !previousIsCompleted;
            const steps = order.delivery_type === 'delivery' ? getDeliverySteps() : getPickupSteps();

            return (
              <React.Fragment key={order.id}>
                {showSeparator && (
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-gray-50 px-3 text-sm font-medium text-gray-500">
                        Pedidos Finalizados
                      </span>
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-6 border-b">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Pedido #C&R{order.order_number.toString().padStart(2, '0')}</h3>
                        <p className="text-sm text-gray-600">{order.customer_name} • {order.customer_phone}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">R$ {order.total.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{order.delivery_type === 'delivery' ? 'Delivery' : 'Retirada'}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                          title="Excluir Pedido Permanentemente"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Itens do Pedido</h4>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx}>
                              <p className="text-sm text-gray-600">
                                {item.quantity}x {item.name} - R$ {(item.price * item.quantity).toFixed(2)}
                              </p>
                              {item.observations && (
                                <p className="text-xs text-red-600 ml-4 mt-0.5">
                                  Obs: {item.observations}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Detalhes</h4>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <strong>Pagamento:</strong> {order.payment_method}
                            {order.change_for && order.change_for > order.total && (
                              <span className="text-blue-600 font-semibold"> (Troco para R$ {order.change_for.toFixed(2)}, levar R$ {(order.change_for - order.total).toFixed(2)})</span>
                            )}
                          </p>
                          {order.address && (<p className="text-sm text-gray-600"><strong>Endereço:</strong> {order.address}</p>)}
                          <p className="text-sm text-gray-600"><strong>Pedido às:</strong> {new Date(order.created_at).toLocaleTimeString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Status do Pedido</h4>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {steps.map((step) => {
                        const currentIndex = steps.indexOf(order.status);
                        const isStepCompleted = steps.indexOf(step) < currentIndex;
                        const isStepActive = steps.indexOf(step) === currentIndex;
                        return (
                          <button
                            key={step}
                            onClick={() => updateOrderStatus(order.id, step, order.user_id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isStepActive && (step === 'Entregue' || step === 'Cliente já fez a retirada')
                                ? 'bg-green-600 text-white'
                                : isStepActive
                                  ? 'bg-red-600 text-white'
                                  : isStepCompleted
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                          >
                            {step}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};