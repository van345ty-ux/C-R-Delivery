import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User as UserIcon } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import toast from 'react-hot-toast';
import { Coupon as CouponType } from '../../types'; // Importando o tipo Coupon

// Definindo a interface local para o cupom, garantindo que todas as propriedades do DB estejam presentes
interface Coupon extends CouponType {
  name: string; // Garantindo que 'name' esteja presente
  active: boolean; // Garantindo que 'active' esteja presente
  usage_count: number; // Garantindo que 'usage_count' esteja presente
  profiles?: { full_name: string } | null;
}

interface Profile {
  id: string;
  full_name: string;
}

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    discount: 10,
    type: 'promotion' as Coupon['type'],
    valid_from: '',
    valid_to: '',
    active: true,
    usage_limit: undefined as number | undefined,
    user_id: undefined as string | undefined, // Novo campo para user_id
  });
  const [allCustomers, setAllCustomers] = useState<Profile[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  useEffect(() => {
    fetchCoupons();
    fetchAllCustomers();
  }, []);

  const fetchCoupons = async () => {
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
        active,
        usage_limit,
        usage_count,
        user_id,
        profiles (full_name)
      `)
      .eq('is_pending_admin_approval', false) // Only show non-pending coupons here
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Erro ao buscar cupons.');
    } else {
      // Fix: Usando 'as unknown as Coupon[]' para forçar a tipagem correta do resultado do join
      setCoupons(data as unknown as Coupon[] || []);
    }
    setLoading(false);
  };

  const fetchAllCustomers = async () => {
    // Removendo a busca de email via supabase.auth.admin.getUserById por questões de segurança.
    // Apenas o full_name do perfil será usado para identificação.
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name', { ascending: true });

    if (profilesError) {
      console.error('Error fetching customers:', profilesError);
    } else {
      setAllCustomers(profilesData || []);
    }
  };

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        name: coupon.name,
        code: coupon.code,
        discount: coupon.discount,
        type: coupon.type,
        valid_from: coupon.valid_from,
        valid_to: coupon.valid_to,
        active: coupon.active,
        usage_limit: coupon.usage_limit,
        user_id: coupon.user_id,
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        name: '',
        code: '',
        discount: 10,
        type: 'promotion',
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        active: true,
        usage_limit: undefined,
        user_id: undefined,
      });
    }
    setCustomerSearchTerm(''); // Reset search term
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCoupon(null);
  };

  const handleSaveCoupon = async () => {
    const payload = { 
      ...formData, 
      usage_limit: formData.usage_limit || null,
      user_id: formData.user_id || null, // Set to null if no user is selected
      is_pending_admin_approval: false, // Manually created coupons are not pending
    };

    if (editingCoupon) {
      const { error } = await supabase
        .from('coupons')
        .update(payload)
        .eq('id', editingCoupon.id);
      if (error) toast.error('Erro ao atualizar cupom.');
    } else {
      const { error } = await supabase
        .from('coupons')
        .insert([payload]);
      if (error) toast.error('Erro ao criar cupom.');
    }
    fetchCoupons();
    handleCloseModal();
    toast.success('Cupom salvo com sucesso!');
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (confirm('Tem certeza que deseja excluir este cupom?')) {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);
      if (error) {
        toast.error('Erro ao excluir cupom.');
      } else {
        toast.success('Cupom excluído com sucesso!');
      }
      fetchCoupons();
    }
  };

  const toggleCouponStatus = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('coupons')
      .update({ active: !coupon.active })
      .eq('id', coupon.id);
    if (error) {
      toast.error('Erro ao atualizar status.');
    } else {
      toast.success('Status do cupom atualizado!');
    }
    fetchCoupons();
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

  const isExpired = (validTo: string) => {
    const endDate = new Date(validTo);
    endDate.setHours(23, 59, 59, 999); // Consider the full day
    return endDate < new Date();
  };

  const filteredCustomers = allCustomers.filter(customer =>
    customer.full_name?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  if (loading) return <div>Carregando cupons...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Cupons</h1>
          <p className="text-gray-600">Crie e gerencie cupons de desconto</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cupom
        </button>
      </div>

      <div className="grid gap-6">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{coupon.name}</h3>
                  <div className="ml-3 flex space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCouponTypeColor(coupon.type)}`}>
                      {getCouponTypeLabel(coupon.type)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      coupon.active && !isExpired(coupon.valid_to)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {coupon.active && !isExpired(coupon.valid_to) ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                {coupon.user_id && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span>Para: {coupon.profiles?.full_name || 'Usuário Desconhecido'}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-gray-600">Código</p><p className="font-mono font-bold text-red-600">{coupon.code}</p></div>
                  <div><p className="text-gray-600">Desconto</p><p className="font-semibold">{coupon.discount}%</p></div>
                  <div><p className="text-gray-600">Válido até</p><p className="font-semibold">{new Date(coupon.valid_to).toLocaleDateString('pt-BR')}</p></div>
                  <div><p className="text-gray-600">Usos</p><p className="font-semibold">{coupon.usage_count}{coupon.usage_limit !== undefined && coupon.usage_limit !== null && `/${coupon.usage_limit}`}</p></div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => toggleCouponStatus(coupon)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${coupon.active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{coupon.active ? 'Desativar' : 'Ativar'}</button>
                <button onClick={() => handleOpenModal(coupon)} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteCoupon(coupon.id)} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-900">{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cupom</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="Ex: Promoção de Verão" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Código</label><input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full p-3 border rounded-lg font-mono" placeholder="Ex: VERAO20" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label><input type="number" min="1" max="100" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) })} className="w-full p-3 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Coupon['type'] })} className="w-full p-3 border rounded-lg"><option value="promotion">Promoção</option><option value="birthday">Aniversário</option><option value="loyalty">Fidelidade</option></select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Válido de</label><input type="date" value={formData.valid_from} onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} className="w-full p-3 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Válido até</label><input type="date" value={formData.valid_to} onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })} className="w-full p-3 border rounded-lg" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Limite de Uso (opcional)</label><input type="number" min="1" value={formData.usage_limit || ''} onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full p-3 border rounded-lg" placeholder="Deixe vazio para ilimitado" /></div>
              
              {/* Campo para selecionar cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Atribuir a um Cliente Específico (opcional)
                </label>
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  placeholder="Buscar cliente por nome"
                  className="w-full p-3 border rounded-lg mb-2"
                />
                <select
                  value={formData.user_id || ''}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value || undefined })}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Cupom Universal (para todos os clientes)</option>
                  {filteredCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Se um cliente for selecionado, apenas ele poderá usar este cupom.
                </p>
              </div>

              <div><label className="flex items-center"><input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="mr-2" /><span className="text-sm font-medium text-gray-700">Cupom ativo</span></label></div>
            </div>
            <div className="p-6 border-t flex space-x-3">
              <button onClick={handleCloseModal} className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg">Cancelar</button>
              <button onClick={handleSaveCoupon} className="flex-1 bg-red-600 text-white py-3 rounded-lg">{editingCoupon ? 'Salvar' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};