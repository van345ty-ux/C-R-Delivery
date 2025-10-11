import React from 'react';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useQuery } from '../../hooks/useQuery';

interface Order {
  id: string;
  order_number: number; // Adicionado order_number
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  payment_method: string;
  user_id: string;
}

const fetchDashboardData = async () => {
  console.log('AdminDashboard: fetchDashboardData called.'); // Adicionado log aqui
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_name, total, status, created_at, items, payment_method, user_id, order_number') // Seleciona order_number
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dashboard data:', error);
    throw new Error('Could not fetch dashboard data: ' + error.message); // Adicionado mensagem de erro
  }
  return orders || [];
};

export const AdminDashboard: React.FC = () => {
  const { data: orders, loading, error } = useQuery<Order[]>(fetchDashboardData, []);

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p>Carregando dados do dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p className="font-bold mb-2">Erro ao carregar dados do dashboard:</p>
        <p>{error.message}</p>
        <p className="mt-4 text-sm text-gray-500">Verifique sua conexão ou tente novamente mais tarde.</p>
      </div>
    );
  }

  // --- Calculations ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysOrders = orders.filter(o => new Date(o.created_at) >= today);

  const salesToday = todaysOrders.reduce((sum, o) => sum + o.total, 0);
  const ordersTodayCount = todaysOrders.length;
  const averageTicket = ordersTodayCount > 0 ? salesToday / ordersTodayCount : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeCustomers = new Set(
    orders.filter(o => new Date(o.created_at) >= thirtyDaysAgo).map(o => o.user_id)
  ).size;

  const stats = [
    { title: 'Vendas Hoje', value: `R$ ${salesToday.toFixed(2)}`, icon: DollarSign, color: 'bg-green-500' },
    { title: 'Pedidos Hoje', value: ordersTodayCount.toString(), icon: ShoppingCart, color: 'bg-blue-500' },
    { title: 'Clientes Ativos (30d)', value: activeCustomers.toString(), icon: Users, color: 'bg-purple-500' },
    { title: 'Ticket Médio Hoje', value: `R$ ${averageTicket.toFixed(2)}`, icon: TrendingUp, color: 'bg-orange-500' }
  ];

  const recentOrders = orders.slice(0, 4);

  const productSales = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      if (!acc[item.name]) {
        acc[item.name] = { sales: 0, revenue: 0 };
      }
      acc[item.name].sales += item.quantity;
      acc[item.name].revenue += item.quantity * item.price;
    });
    return acc;
  }, {} as Record<string, { sales: number; revenue: number }>);

  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b.sales - a.sales)
    .slice(0, 4)
    .map(([name, data]) => ({ name, ...data }));

  const paymentMethods = orders.reduce((acc, order) => {
    acc[order.payment_method] = (acc[order.payment_method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalPayments = Object.values(paymentMethods).reduce((sum, count) => sum + count, 0);

  const paymentPercentages = {
    pix: totalPayments > 0 ? ((paymentMethods['pix'] || 0) / totalPayments) * 100 : 0,
    card: totalPayments > 0 ? ((paymentMethods['card'] || 0) / totalPayments) * 100 : 0,
    cash: totalPayments > 0 ? ((paymentMethods['cash'] || 0) / totalPayments) * 100 : 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold text-gray-900">Pedidos Recentes</h2></div>
          <div className="p-6">
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">#C&R{order.order_number.toString().padStart(2, '0')}</p> {/* Usando order_number */}
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">R$ {order.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleTimeString('pt-BR')}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    order.status === 'Entregue' ? 'bg-green-100 text-green-800' :
                    order.status === 'Saiu para entrega' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'Em preparação' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold text-gray-900">Produtos Mais Vendidos</h2></div>
          <div className="p-6">
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-red-600">{index + 1}</span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.sales} vendas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">R$ {product.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Formas de Pagamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{paymentPercentages.pix.toFixed(0)}%</div>
            <div className="text-sm text-gray-600">PIX</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{paymentPercentages.card.toFixed(0)}%</div>
            <div className="text-sm text-gray-600">Cartão</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{paymentPercentages.cash.toFixed(0)}%</div>
            <div className="text-sm text-gray-600">Dinheiro</div>
          </div>
        </div>
      </div>
    </div>
  );
};