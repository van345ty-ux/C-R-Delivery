import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Order, CartItem } from '../App';
import { Package, Calendar, Hash, ChevronRight } from 'lucide-react';

interface UserOrdersProps {
  userId: string;
  onViewOrder: (order: Order) => void;
}

interface DbOrder {
  id: string;
  order_number: number; // Adicionado order_number
  items: Array<{ name: string; quantity: number; price: number; observations?: string; product_id: string }>;
  total: number;
  delivery_fee: number;
  delivery_type: 'delivery' | 'pickup';
  payment_method: 'pix' | 'card' | 'cash';
  address?: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  coupon_used?: string;
}

export const UserOrders: React.FC<UserOrdersProps> = ({ userId, onViewOrder }) => {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [userId]);

  const handleViewDetails = (dbOrder: DbOrder) => {
    const formattedItems: CartItem[] = dbOrder.items.map(item => ({
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

    const formattedOrder: Order = {
      id: dbOrder.id,
      orderNumber: dbOrder.order_number, // Mapeia o order_number
      items: formattedItems,
      total: dbOrder.total,
      deliveryFee: dbOrder.delivery_fee,
      deliveryType: dbOrder.delivery_type,
      paymentMethod: dbOrder.payment_method,
      address: dbOrder.address,
      status: dbOrder.status,
      customerName: dbOrder.customer_name,
      customerPhone: dbOrder.customer_phone,
      createdAt: dbOrder.created_at,
      couponUsed: dbOrder.coupon_used
    };
    
    onViewOrder(formattedOrder);
  };

  if (loading) {
    return <div className="text-center p-8">Carregando seus pedidos...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center p-8">
        <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">Você ainda não fez nenhum pedido.</p>
      </div>
    );
  }

  const completedStatuses = ['Entregue', 'Cliente já fez a retirada'];
  const currentOrders = orders.filter(order => !completedStatuses.includes(order.status));
  const previousOrders = orders.filter(order => completedStatuses.includes(order.status));

  const renderOrder = (order: DbOrder) => (
    <button
      key={order.id}
      onClick={() => handleViewDetails(order)}
      className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-colors"
    >
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <Hash className="w-3 h-3 mr-1" />
            <span>Pedido #C&R{order.order_number.toString().padStart(2, '0')}</span> {/* Usando order_number */}
            <span className="mx-2">•</span>
            <Calendar className="w-3 h-3 mr-1" />
            <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <p className="font-semibold text-gray-800">
            Total: R$ {order.total.toFixed(2)}
          </p>
          <p className="text-sm text-blue-600 font-medium mt-1">{order.status}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </button>
  );

  return (
    <div className="space-y-4">
      {currentOrders.map(renderOrder)}

      {currentOrders.length > 0 && previousOrders.length > 0 && (
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-sm font-medium text-gray-500">
              Pedidos anteriores
            </span>
          </div>
        </div>
      )}

      {previousOrders.map(renderOrder)}
    </div>
  );
};