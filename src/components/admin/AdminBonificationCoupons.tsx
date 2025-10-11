import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User as UserIcon, Gift, XCircle } from 'lucide-react'; // Adicionado XCircle para o ícone de recusar
import { supabase } from '../../integrations/supabase/client';
import toast from 'react-hot-toast';

interface PendingCoupon {
  id: string;
  name: string;
  code: string;
  discount: number;
  type: 'birthday' | 'loyalty' | 'promotion';
  valid_from: string;
  valid_to: string;
  user_id: string;
  profiles: { full_name: string } | null; // Ajustado para não incluir email diretamente do join
}

export const AdminBonificationCoupons: React.FC = () => {
  const [pendingCoupons, setPendingCoupons] = useState<PendingCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchPendingCoupons();
  }, []);

  const fetchPendingCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select(`
        id,
        name,
        code,
        discount,
        type,
        valid_from,
        valid_to,
        user_id,
        profiles (full_name)
      `) // Removido 'email' do select de profiles
      .eq('is_pending_admin_approval', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending coupons:', error);
      toast.error('Erro ao buscar cupons pendentes.');
    } else {
      setPendingCoupons(data || []);
    }
    setLoading(false);
  };

  const handleSendCoupon = async (couponId: string, userId: string) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from('coupons')
      .update({ active: true, is_pending_admin_approval: false })
      .eq('id', couponId);

    if (error) {
      toast.error('Erro ao enviar cupom: ' + error.message);
    } else {
      toast.success('Cupom enviado e ativado para o cliente!');
      fetchPendingCoupons(); // Refresh the list
    }
    setIsUpdating(false);
  };

  const handleDeclineCoupon = async (couponId: string) => {
    if (!confirm('Tem certeza que deseja recusar este cupom? Ele será excluído permanentemente.')) {
      return;
    }
    setIsUpdating(true);
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', couponId);

    if (error) {
      toast.error('Erro ao recusar cupom: ' + error.message);
    } else {
      toast.success('Cupom recusado e excluído!');
      fetchPendingCoupons(); // Refresh the list
    }
    setIsUpdating(false);
  };

  const getCouponTypeLabel = (type: PendingCoupon['type']) => {
    const labels = { birthday: 'Aniversário', loyalty: 'Fidelidade', promotion: 'Promoção' };
    return labels[type] || type;
  };

  const getCouponTypeColor = (type: PendingCoupon['type']) => {
    const colors = {
      birthday: 'bg-pink-100 text-pink-800',
      loyalty: 'bg-yellow-100 text-yellow-800',
      promotion: 'bg-blue-100 text-blue-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div>Carregando cupons de bonificação...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Bonificações</h1>
        <p className="text-gray-600">Libere cupons de fidelidade e aniversário para seus clientes.</p>
      </div>

      {pendingCoupons.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Nenhum cupom pendente</h3>
          <p className="text-gray-600">Não há cupons de fidelidade ou aniversário aguardando liberação no momento.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {pendingCoupons.map((coupon) => (
            <div key={coupon.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{coupon.name}</h3>
                    <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getCouponTypeColor(coupon.type)}`}>
                      {getCouponTypeLabel(coupon.type)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span>{coupon.profiles?.full_name || 'Usuário Desconhecido'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{coupon.discount}% OFF</p>
                  <p className="text-sm text-gray-600">Código: <span className="font-mono font-bold text-red-600">{coupon.code}</span></p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Válido até: {new Date(coupon.valid_to).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDeclineCoupon(coupon.id)}
                    disabled={isUpdating}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Recusar
                  </button>
                  <button
                    onClick={() => handleSendCoupon(coupon.id, coupon.user_id)}
                    disabled={isUpdating}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isUpdating ? 'Enviando...' : 'Conceder Cupom'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};