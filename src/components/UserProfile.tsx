import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Phone, Calendar, LogOut, X, ShoppingBag, Gift } from 'lucide-react'; // Adicionado Gift para o ícone de cupons
import { User, Order } from '../App';
import { UserOrders } from './UserOrders';
import { UserCoupons } from './UserCoupons'; // Importando o novo componente
import { supabase } from '../integrations/supabase/client'; // Importar supabase

interface UserProfileProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onViewOrder: (order: Order) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onClose, onLogout, onViewOrder }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'coupons'>('profile');
  const [hasAvailableCoupons, setHasAvailableCoupons] = useState(false); // Novo estado

  // Efeito para verificar cupons disponíveis ao montar o componente
  useEffect(() => {
    const checkAvailableCoupons = async () => {
      if (!user?.id) return;

      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`) // Cupons específicos do usuário ou universais
        .eq('active', true) // Apenas cupons ativos
        .eq('is_pending_admin_approval', false); // Apenas cupons já aprovados

      if (couponsError) {
        console.error('Error fetching user coupons for notification:', couponsError);
        setHasAvailableCoupons(false);
        return;
      }

      const today = new Date();
      const availableCoupons = (couponsData || []).filter(coupon => {
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
      setHasAvailableCoupons(availableCoupons.length > 0);
    };

    checkAvailableCoupons();
  }, [user?.id]); // Depende do ID do usuário

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Minha Conta</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'profile' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Meu Perfil
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'orders' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Meus Pedidos
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`relative flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'coupons' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'
            }`}
          >
            <Gift className="w-4 h-4" />
            Meus Cupons
            {hasAvailableCoupons && ( // Bolinha vermelha
              <span className="absolute top-2 right-8 block h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center">
                <UserIcon className="w-5 h-5 text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Nome Completo</p>
                  <p className="font-medium text-gray-800">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">E-mail</p>
                  <p className="font-medium text-gray-800">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Celular</p>
                  <p className="font-medium text-gray-800">{user.phone}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Data de Nascimento</p>
                  <p className="font-medium text-gray-800">{formatDate(user.birthDate)}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <UserOrders userId={user.id} onViewOrder={onViewOrder} />
          )}

          {activeTab === 'coupons' && (
            <UserCoupons userId={user.id} />
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t mt-auto">
          <button
            onClick={onLogout}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
};