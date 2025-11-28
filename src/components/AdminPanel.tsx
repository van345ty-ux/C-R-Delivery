import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Users, BarChart, MapPin, Tag, SlidersHorizontal, Star, Gift } from 'lucide-react'; // Adicionado Star para o ícone de Destaques e Gift para Bonificações
import { AdminOrders } from './admin/AdminOrders';
import { AdminProducts } from './admin/AdminProducts';
import { AdminCities } from './admin/AdminCities';
import { AdminCoupons } from './admin/AdminCoupons';
import { AdminPromotions } from './admin/AdminPromotions';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminCustomers } from './admin/AdminCustomers';
import { AdminSettings } from './admin/AdminSettings';
import { AdminHighlights } from './admin/AdminHighlights';
import { AdminBonificationCoupons } from './admin/AdminBonificationCoupons'; // Importando o novo componente
import { LoginNotification } from './LoginNotification';
import { supabase } from '../integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AdminPanelProps {
  onBack: () => void;
  onUserUpdate: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customerLoginNotificationUser, setCustomerLoginNotificationUser] = useState<string | null>(null);
  const [pendingBonificationCount, setPendingBonificationCount] = useState(0); // Novo estado para a contagem de cupons pendentes

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let bonificationChannel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user ? user.id : null;

      if (adminId) {
        // Realtime para notificações de login
        channel = supabase
          .channel('login_notifications_channel')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'login_notifications',
            },
            (payload) => {
              const newLogin = payload.new as { user_id: string; user_name: string };
              if (newLogin.user_id !== adminId) {
                setCustomerLoginNotificationUser(newLogin.user_name);
                
                // Toca o som de notificação
                const audio = document.getElementById('login-sound') as HTMLAudioElement;
                if (audio) {
                  audio.play().catch(error => {
                    console.warn("A reprodução automática do som foi bloqueada pelo navegador.", error);
                  });
                }
              }
            }
          )
          .subscribe();

        // Realtime para cupons de bonificação pendentes
        bonificationChannel = supabase
          .channel('pending_bonification_coupons')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'coupons',
              filter: 'is_pending_admin_approval=eq.true', // Only interested in pending ones
            },
            () => {
              fetchPendingBonificationCount(); // Refetch count on any change to pending coupons
            }
          )
          .subscribe();
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

    setupRealtime();
    fetchPendingBonificationCount(); // Initial fetch

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (bonificationChannel) {
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
    { id: 'bonification_coupons', label: 'Bonificações', icon: Gift, notificationCount: pendingBonificationCount }, // Nova aba de Bonificações com notificação
    { id: 'coupons', label: 'Cupons', icon: Tag },
    { id: 'promotions', label: 'Promoções', icon: Tag },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'settings', label: 'Configurações', icon: SlidersHorizontal }
  ];

  const renderTabContent = () => {
    // Usando activeTab como parte da key para forçar a remontagem do componente
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard key={`admin-dashboard-${activeTab}`} />;
      case 'orders':
        return <AdminOrders key={`admin-orders-${activeTab}`} onUserUpdate={onUserUpdate} />;
      case 'products':
        return <AdminProducts key={`admin-products-${activeTab}`} />;
      case 'highlights':
        return <AdminHighlights key={`admin-highlights-${activeTab}`} />;
      case 'cities':
        return <AdminCities key={`admin-cities-${activeTab}`} />;
      case 'bonification_coupons':
        return <AdminBonificationCoupons key={`admin-bonification-coupons-${activeTab}`} />;
      case 'coupons':
        return <AdminCoupons key={`admin-coupons-${activeTab}`} />;
      case 'promotions':
        return <AdminPromotions key={`admin-promotions-${activeTab}`} />;
      case 'customers':
        return <AdminCustomers key={`admin-customers-${activeTab}`} />;
      case 'settings':
        return <AdminSettings key={`admin-settings-${activeTab}`} />;
      default:
        return <AdminDashboard key={`admin-dashboard-default-${activeTab}`} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {renderTabContent()}
      </div>

      {/* Customer Login Notification */}
      {customerLoginNotificationUser && (
        <LoginNotification 
          userName={customerLoginNotificationUser} 
          onClose={handleCloseLoginNotification} 
        />
      )}
    </div>
  );
};