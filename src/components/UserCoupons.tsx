import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';
import { Gift, Copy, Clock, Tag } from 'lucide-react';

interface UserCouponsProps {
  userId: string;
}

interface Coupon {
  id: string;
  name: string;
  code: string;
  discount: number;
  type: 'birthday' | 'loyalty' | 'promotion';
  valid_from: string;
  valid_to: string;
  active: boolean;
  usage_limit?: number;
  usage_count: number;
  user_id?: string;
}

export const UserCoupons: React.FC<UserCouponsProps> = ({ userId }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserCoupons = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`) // Cupons específicos do usuário ou universais
        .eq('active', true) // Apenas cupons ativos
        .eq('is_pending_admin_approval', false) // Apenas cupons já aprovados
        .order('valid_to', { ascending: true });

      if (error) {
        console.error('Error fetching user coupons:', error);
        toast.error('Erro ao carregar seus cupons.');
      } else {
        const today = new Date();
        const activeAndValidCoupons = (data || []).filter(coupon => {
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
        setCoupons(activeAndValidCoupons);
      }
      setLoading(false);
    };

    fetchUserCoupons();
  }, [userId]);

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código do cupom copiado!');
  };

  const getCouponTypeLabel = (type: Coupon['type']) => {
    const labels = { birthday: 'Aniversário', loyalty: 'Fidelidade', promotion: 'Promoção' };
    return labels[type] || type;
  };

  const getCouponTypeColor = (type: Coupon['type']) => {
    const colors = {
      birthday: 'bg-pink-100 text-pink-800',
      loyalty: 'bg-yellow-100 text-yellow-800',
      promotion: 'bg-blue-100 text-blue-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center p-8">Carregando seus cupons...</div>;
  }

  if (coupons.length === 0) {
    return (
      <div className="text-center p-8">
        <Gift className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">Você não possui cupons ativos no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {coupons.map((coupon) => (
        <div key={coupon.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900">{coupon.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCouponTypeColor(coupon.type)}`}>
              {getCouponTypeLabel(coupon.type)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{coupon.discount}% de desconto</p>
          
          <div className="flex items-center justify-between bg-white border border-dashed border-red-300 rounded-lg p-3 mb-3">
            <span className="font-mono font-semibold text-red-600 text-lg">{coupon.code}</span>
            <button
              onClick={() => copyCouponCode(coupon.code)}
              className="ml-3 p-2 rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
              title="Copiar código"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            <span>Válido até: {new Date(coupon.valid_to).toLocaleDateString('pt-BR')}</span>
            {coupon.usage_limit && (
              <>
                <span className="mx-2">•</span>
                <Tag className="w-3 h-3 mr-1" />
                <span>Usos: {coupon.usage_count}/{coupon.usage_limit}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};