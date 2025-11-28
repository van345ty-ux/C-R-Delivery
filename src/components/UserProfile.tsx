import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Phone, Calendar, LogOut, X, ShoppingBag, Gift, Edit, Settings } from 'lucide-react'; // Adicionado Settings icon
import { User, Order, Coupon } from '../types'; // Corrected import path
import { UserOrders } from './UserOrders';
import { UserCoupons } from './UserCoupons';
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';

interface UserProfileProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onViewOrder: (order: Order) => void;
  onUserUpdate: () => void;
  onAdminAccess: () => void; // Nova prop para acessar o painel
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onClose, onLogout, onViewOrder, onUserUpdate, onAdminAccess }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'coupons'>('profile');
  const [hasAvailableCoupons, setHasAvailableCoupons] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableUser, setEditableUser] = useState<User>(user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditableUser(user); // Atualiza editableUser se o prop user mudar
  }, [user]);

  // Efeito para verificar cupons disponíveis ao montar o componente
  useEffect(() => {
    const checkAvailableCoupons = async () => {
      if (!user?.id) return;

      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .eq('active', true)
        .eq('is_pending_admin_approval', false);

      if (couponsError) {
        console.error('Error fetching user coupons for notification:', couponsError);
        setHasAvailableCoupons(false);
        return;
      }

      const today = new Date();
      const availableCoupons = (couponsData || []).filter((coupon: Coupon) => {
        const validFrom = new Date(coupon.valid_from);
        const validTo = new Date(coupon.valid_to);
        validTo.setHours(23, 59, 59, 999);

        const isCurrentlyValid = today >= validFrom && today <= validTo;
        const hasUsagesLeft = coupon.usage_limit === null || coupon.usage_limit === undefined || coupon.usage_count < coupon.usage_limit;

        if ((coupon.type === 'birthday' || coupon.type === 'loyalty') && !coupon.user_id) {
          return false; 
        }
        return isCurrentlyValid && hasUsagesLeft;
      });
      setHasAvailableCoupons(availableCoupons.length > 0);
    };

    checkAvailableCoupons();
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableUser((prev: User) => ({ ...prev, [name]: value })); // Explicitly typed prev
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      // Update profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editableUser.name,
          phone: editableUser.phone,
          birth_date: editableUser.birthDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update auth.users table for email if changed
      if (editableUser.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: editableUser.email,
        });
        if (authError) throw authError;
        toast.success('E-mail atualizado! Verifique sua caixa de entrada para confirmar o novo e-mail.');
      }

      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
      onUserUpdate(); // Notifica o App.tsx para recarregar o usuário
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Erro ao salvar o perfil.');
      toast.error('Erro ao salvar o perfil: ' + (err.message || 'Tente novamente.'));
    } finally {
      setLoading(false);
    }
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
            {hasAvailableCoupons && (
              <span className="absolute top-2 right-8 block h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</p>}
              
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <UserIcon className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Nome Completo</p>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={editableUser.name}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md text-gray-800"
                      />
                    ) : (
                      <p className="font-medium text-gray-800">{user.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">E-mail</p>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={editableUser.email}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md text-gray-800"
                      />
                    ) : (
                      <p className="font-medium text-gray-800">{user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Celular</p>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={editableUser.phone}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md text-gray-800"
                      />
                    ) : (
                      <p className="font-medium text-gray-800">{user.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Data de Nascimento</p>
                    {isEditing ? (
                      <input
                        type="date"
                        name="birthDate"
                        value={editableUser.birthDate}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md text-gray-800"
                      />
                    ) : (
                      <p className="font-medium text-gray-800">{formatDate(user.birthDate)}</p>
                    )}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => { setIsEditing(false); setEditableUser(user); setError(null); }}
                    className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <UserOrders userId={user.id} onViewOrder={onViewOrder} />
          )}

          {activeTab === 'coupons' && (
            <UserCoupons userId={user.id} />
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t mt-auto space-y-2">
          {user.role === 'admin' && (
            <button
              onClick={onAdminAccess}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Painel Administrativo
            </button>
          )}
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