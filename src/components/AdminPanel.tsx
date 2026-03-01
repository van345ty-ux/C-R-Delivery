import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Users, BarChart, MapPin, Tag, SlidersHorizontal, Star, Gift } from 'lucide-react';
import { AdminOrders } from './admin/AdminOrders';
import { AdminProducts } from './admin/AdminProducts';
import { AdminCities } from './admin/AdminCities';
import { AdminCoupons } from './admin/AdminCoupons';
import { AdminPromotions } from './admin/AdminPromotions';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminCustomers } from './admin/AdminCustomers';
import { AdminSettings } from './admin/AdminSettings';
import { AdminHighlights } from './admin/AdminHighlights';
import { AdminBonificationCoupons } from './admin/AdminBonificationCoupons';
import { LoginNotification } from './LoginNotification';
import { supabase } from '../integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AdminPanelProps {
  onBack: () => void;
  onUserUpdate: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onUserUpdate }) => {
  // Inicializa o estado lendo do localStorage, com 'dashboard' como padrão.
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'dashboard';
  });

  const [customerLoginNotificationUser, setCustomerLoginNotificationUser] = useState<string | null>(null);
  const [pendingBonificationCount, setPendingBonificationCount] = useState(0);

  // Salva a aba ativa no localStorage sempre que ela mudar.
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  const playNotificationSound = () => {
    const audio = document.getElementById('login-sound') as HTMLAudioElement;
    if (audio) {
      audio.play().catch(error => {
        console.warn("A reprodução automática do som foi bloqueada pelo navegador.", error);
      });
    }
  };

  const fetchPendingBonificationCount = async () => {
    const { count, error } = await supabase
      .from('coupons')
      .select('id', { count: 'exact' })
      .eq('is_pending_admin_approval', true);

    if (error) {
      console.error('Error fetching pending bonification count:', error);
      setPendingBonificationCount(0);
    } else {
      setPendingBonificationCount(count || 0);
    }
  };

  useEffect(() => {
    console.log('🔵 AdminPanel: useEffect INICIADO'); // LOG EXTRA
    let loginChannel: RealtimeChannel | null = null;
    let bonificationChannel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user ? user.id : null;
      console.log('AdminPanel: setupRealtime called. Admin ID:', adminId); // Log de depuração

      if (adminId) {
        console.log('🟢 AdminPanel: Criando subscription para login_notifications'); // LOG EXTRA

        // Criar channel com nome único baseado no timestamp para evitar conflitos
        const channelName = `login_notifications_${Date.now()}`;

        loginChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'login_notifications',
            },
            (payload) => {
              console.log('🎉 AdminPanel: PAYLOAD RECEBIDO:', payload); // LOG EXTRA
              const newLogin = payload.new as { user_id: string; user_name: string };
              console.log('AdminPanel: New login notification received:', newLogin); // Log de depuração
              console.log('🔍 AdminPanel: Comparando IDs - newLogin.user_id:', newLogin.user_id, 'adminId:', adminId); // LOG EXTRA
              if (newLogin.user_id !== adminId) {
                console.log('✅ AdminPanel: Exibindo notificação para:', newLogin.user_name); // LOG EXTRA
                setCustomerLoginNotificationUser(newLogin.user_name);
                playNotificationSound();
              } else {
                console.log('⚠️ AdminPanel: Notificação ignorada (mesmo usuário)'); // LOG EXTRA
              }
            }
          )
          .subscribe(async (status, err) => {
            console.log('AdminPanel: Login Channel Status:', status, err ? `Error: ${err}` : ''); // Log de status da subscrição

            if (status === 'SUBSCRIBED') {
              console.log('✅ AdminPanel: Login channel SUBSCRIBED com sucesso!');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ AdminPanel: Erro na subscription:', err);
            } else if (status === 'TIMED_OUT') {
              console.error('⏱️ AdminPanel: Subscription timeout');
            }
          });

        bonificationChannel = supabase
          .channel('pending_bonification_coupons')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'coupons',
              filter: 'is_pending_admin_approval=eq.true',
            },
            () => {
              console.log('AdminPanel: Bonification change detected. Refetching count.'); // Log de depuração
              fetchPendingBonificationCount();
            }
          )
          .subscribe((status) => {
            console.log('AdminPanel: Bonification Channel Status:', status); // Log de status da subscrição
          });
      }
    };

    setupRealtime();
    fetchPendingBonificationCount();

    return () => {
      if (loginChannel) {
        console.log('AdminPanel: Unsubscribing from loginChannel.');
        supabase.removeChannel(loginChannel);
      }
      if (bonificationChannel) {
        console.log('AdminPanel: Unsubscribing from bonificationChannel.');
        supabase.removeChannel(bonificationChannel);
      }
    };
  }, []);

  const handleCloseLoginNotification = () => {
    setCustomerLoginNotificationUser(null);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart },
    { id: 'orders', label: 'Pedidos', icon: Package },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'highlights', label: 'Destaques', icon: Star },
    { id: 'cities', label: 'Rota Atual', icon: MapPin },
    { id: 'bonification_coupons', label: 'Bonificações', icon: Gift, notificationCount: pendingBonificationCount },
    { id: 'coupons', label: 'Cupons', icon: Tag },
    { id: 'promotions', label: 'Promoções', icon: Tag },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'settings', label: 'Configurações', icon: SlidersHorizontal }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'orders':
        return <AdminOrders onUserUpdate={onUserUpdate} />;
      case 'products':
        return <AdminProducts />;
      case 'highlights':
        return <AdminHighlights />;
      case 'cities':
        return <AdminCities />;
      case 'bonification_coupons':
        return <AdminBonificationCoupons />;
      case 'coupons':
        return <AdminCoupons />;
      case 'promotions':
        return <AdminPromotions />;
      case 'customers':
        return <AdminCustomers />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={onBack} className="mr-4">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-sm text-gray-600">C&R Sushi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                  {tab.id === 'bonification_coupons' && tab.notificationCount !== undefined && tab.notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {renderTabContent()}
      </div>

      {customerLoginNotificationUser && (
        <LoginNotification
          userName={customerLoginNotificationUser}
          onClose={handleCloseLoginNotification}
        />
      )}
    </div>
  );
};