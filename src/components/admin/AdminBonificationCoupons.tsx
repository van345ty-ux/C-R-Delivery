import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User as UserIcon, Gift, XCircle, Sparkles, Award, TrendingUp, Cake } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import toast from 'react-hot-toast';
import { Coupon as CouponType } from '../../types'; // Importando o tipo Coupon

// Definindo a interface local para o cupom, garantindo que todas as propriedades do DB estejam presentes
interface PendingCoupon extends CouponType {
  name: string; // Garantindo que 'name' esteja presente
  active: boolean; // Garantindo que 'active' esteja presente
  usage_count: number; // Garantindo que 'usage_count' esteja presente
  profiles: { full_name: string; phone: string } | null;
}

interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string;
  birth_date: string;
  purchase_count: number;
}

export const AdminBonificationCoupons: React.FC = () => {
  const [pendingCoupons, setPendingCoupons] = useState<PendingCoupon[]>([]);
  const [metaReachedProfiles, setMetaReachedProfiles] = useState<CustomerProfile[]>([]);
  const [nearProfiles, setNearProfiles] = useState<CustomerProfile[]>([]);
  const [birthdayCelebrants, setBirthdayCelebrants] = useState<CustomerProfile[]>([]);
  const [existingBirthdayCoupons, setExistingBirthdayCoupons] = useState<{ user_id: string; code: string }[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Nome dos meses em português
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentMonthIndex = new Date().getMonth();
  const currentMonthName = months[currentMonthIndex];
  const currentMonthStr = String(currentMonthIndex + 1).padStart(2, '0'); // ex: "05" para Maio

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Buscar cupons pendentes (clientes que atingiram 10 compras e aguardam liberação)
    const { data: couponsData, error: couponsError } = await supabase
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
        usage_count,
        user_id,
        profiles (full_name, phone)
      `)
      .eq('is_pending_admin_approval', true)
      .order('created_at', { ascending: true });

    // 2. Buscar todos os clientes da base para realizar filtragem em memória (extremamente robusto)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, birth_date, purchase_count')
      .eq('role', 'customer');

    // 3. Buscar cupons de aniversário já criados para evitar duplicações de presente
    const { data: birthdayCouponsData, error: birthdayCouponsError } = await supabase
      .from('coupons')
      .select('user_id, code')
      .eq('type', 'birthday');

    if (couponsError) {
      console.error('Error fetching pending coupons:', couponsError);
      toast.error('Erro ao buscar cupons pendentes.');
    } else {
      setPendingCoupons(couponsData as unknown as PendingCoupon[] || []);
    }

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else if (profilesData) {
      // Filtrar clientes próximos ou que já atingiram a meta (8 ou mais compras) e que não têm cupom de fidelidade pendente
      const pendingUserIds = new Set((couponsData || []).map(c => c.user_id));
      
      // Filtrar clientes que atingiram a meta (10 ou mais compras) mas não têm cupom pendente ainda
      const reached10 = profilesData.filter(p => p.purchase_count >= 10 && !pendingUserIds.has(p.id));
      setMetaReachedProfiles(reached10 as CustomerProfile[]);
      
      // Filtrar clientes próximos da meta (8 ou 9 compras) e sem cupom pendente
      const near = profilesData.filter(p => (p.purchase_count === 8 || p.purchase_count === 9) && !pendingUserIds.has(p.id));
      near.sort((a, b) => b.purchase_count - a.purchase_count);
      setNearProfiles(near as CustomerProfile[]);

      // Filtrar aniversariantes do mês atual
      const celebrants = profilesData.filter(p => {
        if (!p.birth_date) return false;
        const parts = p.birth_date.split('-');
        if (parts.length >= 2) {
          return parts[1] === currentMonthStr;
        }
        return false;
      });
      // Ordena por dia de nascimento
      celebrants.sort((a, b) => {
        const dayA = parseInt(a.birth_date.split('-')[2] || '0');
        const dayB = parseInt(b.birth_date.split('-')[2] || '0');
        return dayA - dayB;
      });
      setBirthdayCelebrants(celebrants as CustomerProfile[]);
    }

    if (birthdayCouponsError) {
      console.error('Error fetching birthday coupons:', birthdayCouponsError);
    } else {
      setExistingBirthdayCoupons(birthdayCouponsData || []);
    }

    setLoading(false);
  };

  const handleSendCoupon = async (couponId: string) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from('coupons')
      .update({ active: true, is_pending_admin_approval: false })
      .eq('id', couponId);

    if (error) {
      toast.error('Erro ao enviar cupom: ' + error.message);
    } else {
      toast.success('Cupom enviado e ativado para o cliente!');
      fetchData(); // Refresh the lists
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
      fetchData(); // Refresh the lists
    }
    setIsUpdating(false);
  };

  // Nova função para gerar cupom de aniversário de forma automática
  const handleGiftBirthdayCoupon = async (profile: CustomerProfile) => {
    setIsUpdating(true);
    
    // Normalizar o primeiro nome do cliente para criar o código do cupom (ex: "ATILA")
    const cleanName = profile.full_name
      ? profile.full_name.split(' ')[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '')
      : 'NIVER';
    
    const couponCode = `NIVER-${cleanName}${currentMonthStr}`;
    
    const today = new Date();
    const validTo = new Date(today);
    validTo.setDate(today.getDate() + 30); // Válido por 30 dias

    const { error } = await supabase
      .from('coupons')
      .insert({
        name: `Parabéns, ${profile.full_name}! 🎂`,
        code: couponCode,
        discount: 10, // 10% OFF de presente
        type: 'birthday',
        valid_from: today.toISOString().split('T')[0],
        valid_to: validTo.toISOString().split('T')[0],
        active: true, // Já cria ativado
        usage_limit: 1, // Limite de 1 uso
        user_id: profile.id,
        is_pending_admin_approval: false, // Sem precisar de aprovação
      });

    if (error) {
      console.error(error);
      toast.error('Erro ao gerar cupom de aniversário: ' + error.message);
    } else {
      toast.success(`Cupom de aniversário "${couponCode}" criado e enviado com sucesso!`);
      
      // Enviar notificação de aniversário para o WhatsApp do cliente
      if (profile.phone) {
        let phone = profile.phone.replace(/\D/g, '');
        if (phone.length > 0 && !phone.startsWith('55')) {
          phone = `55${phone}`;
        }
        
        const n8nPayload = {
          project_type: 'delivery',
          workflow_type: 'birthday_coupon',
          phone_number: phone,
          message_data: {
            nome: profile.full_name,
            cupom_aniversario: couponCode,
          }
        };

        supabase.functions.invoke('whatsapp-router', {
          body: n8nPayload,
        }).then(({ error }) => {
          if (error) console.error('Erro ao notificar n8n de aniversário:', error);
          else console.log('Notificação de aniversário enviada com sucesso!');
        });
      }

      fetchData(); // Atualiza a listagem
    }
    setIsUpdating(false);
  };

  const handleReactivateBirthdayCoupon = async (profileId: string, name: string) => {
    setIsUpdating(true);
    try {
      // 1. Deletar os cupons de aniversário antigos deste usuário
      const { error: deleteError } = await supabase
        .from('coupons')
        .delete()
        .eq('user_id', profileId)
        .eq('type', 'birthday');

      if (deleteError) throw deleteError;

      toast.success(`Cupom antigo de "${name}" removido com sucesso! Agora você pode clicar em "Presentear" para gerar um cupom novo e testar do zero.`);
      fetchData(); // Atualiza a listagem
    } catch (error: any) {
      console.error('Error deleting birthday coupon for reactivation:', error);
      toast.error('Erro ao reiniciar cupom: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateLoyaltyCoupon = async (profile: CustomerProfile) => {
    setIsUpdating(true);
    const today = new Date();
    const validTo = new Date(today);
    validTo.setDate(today.getDate() + 7); // Válido por 7 dias

    // 1. Deletar qualquer cupom CLIENTE10 antigo deste usuário para evitar conflito de chave única (UNIQUE constraint)
    const { error: deleteError } = await supabase
      .from('coupons')
      .delete()
      .eq('user_id', profile.id)
      .eq('code', 'CLIENTE10');

    if (deleteError) {
      console.error('Error clearing old loyalty coupon:', deleteError);
    }

    // 2. Criar o cupom de fidelidade ativo diretamente
    const { error: insertError } = await supabase
      .from('coupons')
      .insert({
        name: 'Cupom Fidelidade C&R Sushi 🏆',
        code: 'CLIENTE10',
        discount: 10,
        type: 'loyalty',
        valid_from: today.toISOString().split('T')[0],
        valid_to: validTo.toISOString().split('T')[0],
        active: true, // Já cria ativo para o cliente usar
        usage_limit: 1,
        user_id: profile.id,
        is_pending_admin_approval: false,
      });

    if (insertError) {
      console.error('Error generating loyalty coupon:', insertError);
      toast.error('Erro ao gerar cupom de fidelidade: ' + insertError.message);
      setIsUpdating(false);
      return;
    }

    // Resetar contagem de compras do cliente para 0
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ purchase_count: 0 })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error resetting purchase count:', updateError);
      toast.error('Cupom gerado, mas erro ao resetar compras do cliente.');
    } else {
      toast.success(`Cupom "CLIENTE10" gerado e ativado para ${profile.full_name}! Contagem de compras resetada.`);
      
      // Enviar notificação de cupom fidelidade para o WhatsApp do cliente
      if (profile.phone) {
        let phone = profile.phone.replace(/\D/g, '');
        if (phone.length > 0 && !phone.startsWith('55')) {
          phone = `55${phone}`;
        }

        const n8nPayload = {
          project_type: 'delivery',
          workflow_type: 'loyalty_coupon',
          phone_number: phone,
          message_data: {
            nome: profile.full_name,
            cupom_10: 'CLIENTE10',
          }
        };

        supabase.functions.invoke('whatsapp-router', {
          body: n8nPayload,
        }).then(({ error }) => {
          if (error) console.error('Erro ao notificar n8n de fidelidade:', error);
          else console.log('Notificação de fidelidade enviada com sucesso!');
        });
      }
    }

    fetchData(); // Atualiza a listagem
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

  const formatDateDay = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length < 3) return dateString;
    const day = parts[2];
    const monthIdx = parseInt(parts[1]) - 1;
    return `Dia ${day} de ${months[monthIdx]}`;
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando cupons de bonificação e dados de fidelidade...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-6 h-6 text-red-600" />
          Gerenciamento de Bonificações
        </h1>
        <p className="text-gray-600">Acompanhe a fidelidade de seus clientes e libere cupons de bonificação.</p>
      </div>

      {/* SEÇÃO 1: CUPONS PENDENTES DE APROVAÇÃO (10 COMPRAS ATINGIDAS) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Liberações Pendentes (10 compras atingidas)
          <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">
            {pendingCoupons.length + metaReachedProfiles.length}
          </span>
        </h2>

        {pendingCoupons.length === 0 && metaReachedProfiles.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800">Nenhum cupom pendente de liberação</h3>
            <p className="text-sm text-gray-500 mt-1">Os clientes que completarem 10 compras aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* 1. Clientes que atingiram a meta de 10 compras mas não têm o cupom inserido no banco de dados ainda */}
            {metaReachedProfiles.map((profile) => {
              return (
                <div key={profile.id} className="bg-white rounded-xl shadow-sm border border-green-200 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-green-500 animate-pulse"></div>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-green-100 text-green-800 border border-green-200">
                          Meta Atingida 🎉
                        </span>
                        <span className="text-xs text-gray-400 font-mono">10/10 compras</span>
                      </div>
                      
                      <p className="text-gray-800 text-base font-medium mb-3">
                        🎉 <strong className="text-gray-950 font-bold">{profile.full_name}</strong> atingiu a meta de 10 compras! Clique no botão ao lado para gerar e liberar o cupom de fidelidade dele(a).
                      </p>

                      <div className="flex items-center text-sm text-gray-600">
                        <UserIcon className="w-4 h-4 mr-2" />
                        <span>Celular: {profile.phone || 'Não cadastrado'}</span>
                      </div>
                    </div>

                    <div className="text-right bg-green-50 border border-green-100 rounded-xl p-4 min-w-[150px] self-start md:self-auto">
                      <p className="text-2xl font-black text-green-600">10% OFF</p>
                      <p className="text-xs text-gray-500 font-medium mt-1">Código Sugerido</p>
                      <span className="inline-block mt-2 font-mono font-bold text-sm text-green-700 bg-white px-2.5 py-1 rounded border border-green-200">
                        CLIENTE10
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between border-t mt-5 pt-4 gap-3">
                    <div className="flex items-center text-xs text-gray-400 self-start sm:self-auto">
                      <span>O cliente já completou todos os requisitos!</span>
                    </div>
                    <div className="flex space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleGenerateLoyaltyCoupon(profile)}
                        disabled={isUpdating}
                        className="flex-1 sm:flex-none justify-center bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center font-bold text-sm shadow-sm"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isUpdating ? 'Gerando...' : 'Gerar e Conceder Cupom'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 2. Cupons inseridos que aguardam aprovação */}
            {pendingCoupons.map((coupon) => {
              const customerName = coupon.profiles?.full_name || 'Usuário Desconhecido';
              return (
                <div key={coupon.id} className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400"></div>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getCouponTypeColor(coupon.type)}`}>
                          {getCouponTypeLabel(coupon.type)}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">ID: {coupon.id.substring(0, 6)}...</span>
                      </div>
                      
                      {/* Texto personalizado solicitado pelo usuário */}
                      <p className="text-gray-800 text-base font-medium mb-3">
                        🎉 <strong className="text-gray-950 font-bold">{customerName}</strong> fez 10 compras! Bonifique o cliente com algum cupom por tamanha fidelidade à nossa C&R Sushi.
                      </p>

                      <div className="flex items-center text-sm text-gray-600">
                        <UserIcon className="w-4 h-4 mr-2" />
                        <span>Celular: {coupon.profiles?.phone || 'Não cadastrado'}</span>
                      </div>
                    </div>

                    <div className="text-right bg-yellow-50 border border-yellow-100 rounded-xl p-4 min-w-[150px] self-start md:self-auto">
                      <p className="text-2xl font-black text-yellow-600">{coupon.discount}% OFF</p>
                      <p className="text-xs text-gray-500 font-medium mt-1">Código Promocional</p>
                      <span className="inline-block mt-2 font-mono font-bold text-sm text-red-600 bg-white px-2.5 py-1 rounded border border-red-200">
                        {coupon.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between border-t mt-5 pt-4 gap-3">
                    <div className="flex items-center text-sm text-gray-600 self-start sm:self-auto">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Válido até: {new Date(coupon.valid_to).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleDeclineCoupon(coupon.id)}
                        disabled={isUpdating}
                        className="flex-1 sm:flex-none justify-center bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center font-medium text-sm"
                      >
                        <XCircle className="w-4 h-4 mr-2 text-gray-500" />
                        Recusar
                      </button>
                      <button
                        onClick={() => handleSendCoupon(coupon.id)}
                        disabled={isUpdating}
                        className="flex-1 sm:flex-none justify-center bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center font-bold text-sm shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {isUpdating ? 'Concedendo...' : 'Conceder Cupom'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO 2: CLIENTES PRÓXIMOS DA BONIFICAÇÃO (8 E 9 COMPRAS) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Clientes Próximos da Bonificação (8 e 9 compras)
          <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded-full">
            {nearProfiles.length}
          </span>
        </h2>

        {nearProfiles.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800">Nenhum cliente com 8 ou 9 compras</h3>
            <p className="text-sm text-gray-500 mt-1">Conforme os clientes fizerem mais compras, eles serão listados aqui como incentivo.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {nearProfiles.map((profile) => {
              const isNine = profile.purchase_count === 9;
              
              return (
                <div key={profile.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${isNine ? 'bg-orange-500' : 'bg-orange-400'}`}></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 text-base">{profile.full_name || 'Cliente'}</h3>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      isNine ? 'bg-orange-100 text-orange-800' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {profile.purchase_count}/10 compras
                    </span>
                  </div>

                  {/* Frases personalizadas */}
                  <p className="text-sm text-gray-700 mb-4 font-medium">
                    {isNine ? (
                      <span>📈 <strong className="text-gray-900">{profile.full_name}</strong> já tem 9 compras, falta apenas <strong className="text-red-600 font-bold">uma</strong> para gerar o cupom de bonificação.</span>
                    ) : (
                      <span>📈 <strong className="text-gray-900">{profile.full_name}</strong> já tem 8 compras, falta apenas <strong className="text-orange-600 font-bold">duas</strong> para gerar o cupom de bonificação.</span>
                    )}
                  </p>

                  {/* Barra de progresso visual */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500 font-semibold">
                      <span>Progresso da Meta</span>
                      <span>{profile.purchase_count * 10}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isNine ? 'bg-gradient-to-r from-orange-400 to-orange-600 animate-pulse' : 'bg-gradient-to-r from-orange-300 to-orange-500'
                        }`}
                        style={{ width: `${(profile.purchase_count / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-gray-400 gap-2">
                    <span>Telefone: {profile.phone || 'Não cadastrado'}</span>
                    <span className="font-semibold text-gray-500">
                      {isNine ? 'Falta pouco! 🔥' : 'Faltam 2 compras'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO 3: ANIVERSARIANTES DO MÊS ATUAL (🎂) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
          <Cake className="w-5 h-5 text-pink-500" />
          Aniversariantes do Mês ({currentMonthName})
          <span className="bg-pink-100 text-pink-800 text-xs font-semibold px-2 py-0.5 rounded-full">
            {birthdayCelebrants.length}
          </span>
        </h2>

        {birthdayCelebrants.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            <Cake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800">Nenhum aniversariante em {currentMonthName}</h3>
            <p className="text-sm text-gray-500 mt-1">Os clientes que fazem aniversário neste mês aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {birthdayCelebrants.map((profile) => {
              // Verificar se o cupom de aniversário já foi enviado para esse cliente
              const couponGifted = existingBirthdayCoupons.find(c => c.user_id === profile.id);
              
              return (
                <div key={profile.id} className="bg-white rounded-xl shadow-sm border border-pink-100 p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-500"></div>
                  
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-950 text-base flex items-center gap-1.5">
                        {profile.full_name || 'Cliente'}
                        <span className="text-sm">🎈</span>
                      </h3>
                      <p className="text-xs text-pink-700 font-bold mt-0.5 bg-pink-50 px-2 py-0.5 rounded-full inline-block">
                        🎁 {formatDateDay(profile.birth_date)}
                      </p>
                    </div>
                    {couponGifted ? (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
                        Presente Enviado!
                      </span>
                    ) : (
                      <span className="bg-pink-50 text-pink-700 text-xs font-bold px-2.5 py-1 rounded-full border border-pink-100">
                        Festa! 🎉
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 my-4 font-medium">
                    🍰 <strong className="text-gray-900">{profile.full_name}</strong> é aniversariante de <strong className="text-pink-600 font-bold">{currentMonthName}</strong>! Dê a ele(a) um cupom de aniversário de 10% OFF de presente.
                  </p>

                  <div className="flex items-center justify-between border-t pt-3 mt-3 gap-2">
                    <span className="text-xs text-gray-400">Contato: {profile.phone || 'Não cadastrado'}</span>
                    
                    {couponGifted ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded">
                          Código: {couponGifted.code}
                        </span>
                        <button
                          onClick={() => handleReactivateBirthdayCoupon(profile.id, profile.full_name)}
                          disabled={isUpdating}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                          title="Reativar cupom para fins de testes"
                        >
                          Reativar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGiftBirthdayCoupon(profile)}
                        disabled={isUpdating}
                        className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        Presentear (10% OFF)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};