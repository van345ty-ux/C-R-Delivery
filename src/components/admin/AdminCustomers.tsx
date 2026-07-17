import React, { useState, useEffect } from 'react';
import { User, Phone, Calendar, ShoppingBag, Trash2, Gift, Pencil, Check, X } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import toast from 'react-hot-toast';

interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string;
  birth_date: string;
  purchase_count: number;
  updated_at: string;
  role?: string;
  total_orders?: number;
}

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [onlineUsersMap, setOnlineUsersMap] = useState<Map<string, string>>(new Map());
  const [todayLoginsMap, setTodayLoginsMap] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState<'all' | 'online' | 'today'>('all');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ full_name: '', phone: '' });

  // Efeito 1: Apenas para verificar a role do usuário
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role === 'admin') {
          setIsAdmin(true);
        } else {
          setError('Acesso negado. Você não é um administrador.');
          setLoading(false);
        }
      }
    };
    checkUserRole();
  }, []);

  // Efeito 2: Roda SOMENTE quando 'isAdmin' se torna verdadeiro
  useEffect(() => {
    if (isAdmin) {
      fetchCustomers();
      fetchTodayLogins();
    }
  }, [isAdmin]);

  const fetchTodayLogins = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Meia-noite de hoje local

      const { data, error } = await supabase
        .from('login_notifications')
        .select('user_id, created_at')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true }); // Ordena do mais antigo pro mais novo

      if (error) throw error;

      const loginsMap = new Map<string, string>();
      if (data) {
        data.forEach(log => {
          // O último a ser lido vai sobrescrever, ficando com o acesso mais recente do dia
          loginsMap.set(log.user_id, log.created_at);
        });
      }
      setTodayLoginsMap(loginsMap);
    } catch (err) {
      console.error('Erro ao buscar logins de hoje:', err);
    }
  };

  // Efeito 3: Rastreamento de usuários online via Supabase Presence
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase.channel('online-users');

    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState();
      const onlineMap = new Map<string, string>();
      for (const id in newState) {
        const presenceList = newState[id];
        if (presenceList && presenceList.length > 0) {
          const presence = presenceList[0] as { user_id: string; online_at?: string };
          if (presence && presence.user_id) {
            // Se não houver online_at, usa a hora atual como fallback
            onlineMap.set(presence.user_id, presence.online_at || new Date().toISOString());
          }
        }
      }
      setOnlineUsersMap(onlineMap);
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Buscar os perfis dos clientes
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('updated_at', { ascending: false });

      if (profilesError) throw profilesError;

      // 2. Buscar a contagem de todos os pedidos entregues/retirados para cálculo do total histórico
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('user_id')
        .in('status', ['Entregue', 'Cliente já fez a retirada']);

      if (ordersError) console.error('Erro ao carregar histórico de pedidos:', ordersError);

      const orderCounts: Record<string, number> = {};
      if (ordersData) {
        ordersData.forEach(order => {
          if (order.user_id) {
            orderCounts[order.user_id] = (orderCounts[order.user_id] || 0) + 1;
          }
        });
      }

      // 3. Mapear os perfis acoplando o total histórico calculado
      const mappedCustomers: CustomerProfile[] = (profiles || []).map(profile => ({
        ...profile,
        total_orders: orderCounts[profile.id] || 0
      }));

      setCustomers(mappedCustomers);
    } catch (error: any) { // Explicitly type error as any
      console.error('Erro ao carregar clientes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name,
          phone: editFormData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Cliente atualizado com sucesso!');
      setEditingCustomerId(null);
      await fetchCustomers();
    } catch (err: any) {
      console.error('Erro ao atualizar cliente:', err);
      toast.error('Erro ao atualizar cliente: ' + err.message);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    const confirmMessage = `ATENÇÃO (Conformidade LGPD - Art. 18):\n\n` +
      `Tem certeza que deseja apagar o cliente "${name}" permanentemente?\n\n` +
      `Esta ação irá:\n` +
      `1. Excluir permanentemente o perfil do cliente do banco de dados.\n` +
      `2. Anonimizar todos os pedidos associados a este cliente (definindo o nome do comprador como 'Cliente Anonimizado' e removendo telefone/endereço) para resguardar a privacidade do usuário conforme a LGPD.\n` +
      `3. Preservar intactos os dados financeiros dos pedidos (valores, itens e impostos) apenas para fins fiscais e de auditoria.\n\n` +
      `Esta ação NÃO pode ser desfeita. Deseja prosseguir com a exclusão?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Cliente excluído e pedidos anonimizados (LGPD) com sucesso!');
      await fetchCustomers();
    } catch (err: any) {
      console.error('Erro ao excluir cliente:', err);
      toast.error('Erro ao excluir cliente: ' + err.message);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p>Verificando permissões e carregando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">Erro: {error}</div>
        <button 
          onClick={fetchCustomers}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes Cadastrados</h1>
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'online' | 'today')}
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2"
          >
            <option value="all">Padrão (Todos)</option>
            <option value="online">Últimos Online (Ativos agora)</option>
            <option value="today">Entraram Hoje (Histórico)</option>
          </select>
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            Total: {customers.length}
          </span>
        </div>
      </div>

      {/* Container com rolagem interna para não estender a página inteira */}
      <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-2 scrollbar-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {[...customers]
            .filter(customer => {
              if (filter === 'all') return true;
              if (filter === 'online') return onlineUsersMap.has(customer.id);
              if (filter === 'today') return todayLoginsMap.has(customer.id) || onlineUsersMap.has(customer.id);
              return true;
            })
            .sort((a, b) => {
            const aOnline = onlineUsersMap.has(a.id);
            const bOnline = onlineUsersMap.has(b.id);
            const aToday = todayLoginsMap.has(a.id);
            const bToday = todayLoginsMap.has(b.id);
            
            // Se o filtro for 'online', ordena por quem entrou mais recentemente
            if (filter === 'online' && aOnline && bOnline) {
              const timeA = new Date(onlineUsersMap.get(a.id)!).getTime();
              const timeB = new Date(onlineUsersMap.get(b.id)!).getTime();
              return timeB - timeA;
            }

            // Se o filtro for 'today', os online vêm primeiro, depois os de hoje ordenados do mais recente
            if (filter === 'today') {
              if (aOnline && !bOnline) return -1;
              if (!aOnline && bOnline) return 1;
              if (!aOnline && !bOnline && aToday && bToday) {
                const timeA = new Date(todayLoginsMap.get(a.id)!).getTime();
                const timeB = new Date(todayLoginsMap.get(b.id)!).getTime();
                return timeB - timeA;
              }
            }

            if (aOnline && !bOnline) return -1;
            if (!aOnline && bOnline) return 1;
            return 0; // fallback para ordem original (updated_at)
          }).map((customer) => {
            const isOnline = onlineUsersMap.has(customer.id);
            const isToday = !isOnline && todayLoginsMap.has(customer.id);
            
            const onlineAtStr = isOnline ? onlineUsersMap.get(customer.id) : (isToday ? todayLoginsMap.get(customer.id) : null);
            const onlineAt = onlineAtStr ? new Date(onlineAtStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
            const isEditing = editingCustomerId === customer.id;
            
            return (
            <div key={customer.id} className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow relative ${isOnline ? 'border-green-300 shadow-green-100 ring-1 ring-green-400' : (isToday ? 'border-gray-300 bg-gray-50' : '')}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center w-full">
                  <div className="bg-red-100 p-2 rounded-full mr-3">
                    <User className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.full_name}
                          onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                          className="font-bold text-lg text-gray-900 border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-red-500"
                          placeholder="Nome do cliente"
                        />
                      ) : (
                        <h3 className="font-bold text-lg text-gray-900 line-clamp-1" title={customer.full_name}>
                          {customer.full_name || 'Nome não informado'}
                        </h3>
                      )}
                    </div>
                    {filter !== 'today' && (
                      <p className="text-sm text-gray-500">ID: {customer.id.substring(0, 6)}...</p>
                    )}
                    <div className="mt-1.5">
                      {isOnline && (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-green-200 shadow-sm w-fit">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Online Agora
                          </span>
                          <span className="text-[10px] text-green-600 mt-0.5 font-medium">Entrou às {onlineAt}</span>
                        </div>
                      )}
                      {isToday && (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 shadow-sm w-fit">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                            Offline
                          </span>
                          <span className="text-[10px] text-gray-500 mt-0.5 font-medium">Esteve online hoje às {onlineAt}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center ml-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSaveCustomer(customer.id)}
                        className="text-green-600 hover:text-green-700 p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                        title="Salvar"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingCustomerId(null)}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingCustomerId(customer.id);
                          setEditFormData({ full_name: customer.full_name || '', phone: customer.phone || '' });
                        }}
                        className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Editar cliente"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id, customer.full_name || 'Nome não informado')}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Excluir cliente e anonimizar pedidos (LGPD)"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {filter !== 'today' && (
                <div className="space-y-3 text-sm text-gray-600 mt-2">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-0.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="Telefone"
                      />
                    ) : (
                      <span>{customer.phone || 'Não informado'}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{formatDate(customer.birth_date)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Gift className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
                    <span>Progresso Fidelidade: <strong>{customer.purchase_count || 0}/10</strong></span>
                  </div>

                  <div className="flex items-center">
                    <ShoppingBag className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                    <span>Total de Pedidos: <strong>{customer.total_orders || 0}</strong></span>
                  </div>
                  
                  <div className="pt-2 mt-2 border-t text-xs text-gray-400">
                    Última atualização: {formatDate(customer.updated_at)}
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      </div>
    </div>
  );
};