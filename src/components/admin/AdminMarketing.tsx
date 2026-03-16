import React, { useState, useEffect } from 'react';
import { Megaphone, Users, Play, Search, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import toast from 'react-hot-toast';

interface CustomerProfile {
    id: string;
    full_name: string;
    phone: string;
}

interface FilaStatus {
    id: string;
    nome_cliente: string;
    status: string;
}

export const AdminMarketing: React.FC = () => {
    const [customers, setCustomers] = useState<CustomerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // States of the form
    const [messageText, setMessageText] = useState('');
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
    const [manualName, setManualName] = useState('');
    const [manualPhone, setManualPhone] = useState('');

    // Progress & Campaign states
    const [isSending, setIsSending] = useState(false);
    const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
    const [activeFila, setActiveFila] = useState<FilaStatus[]>([]);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (!currentCampaignId) return;

        let isSubscribed = true;

        // Função de Polling (Busca manual no banco a cada 3 segundos)
        // Isso resolve o problema caso o Realtime do Supabase não esteja ativado na tabela 'fila_disparos'
        const fetchFilaStatus = async () => {
            if (!isSubscribed) return;
            try {
                const { data, error } = await supabase
                    .from('fila_disparos')
                    .select('id, nome_cliente, status')
                    .eq('campanha_id', currentCampaignId);

                if (error) throw error;
                if (data) {
                    setActiveFila(data);

                    const allProcessed = data.length > 0 && data.every(item => item.status !== 'pendente');
                    if (allProcessed) {
                        setIsSending(false);
                        setCurrentCampaignId(null);
                        toast.success('Disparo em massa concluído com sucesso!');
                        isSubscribed = false; // Parar o polling
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar status da fila:', err);
            }
        };

        // Roda a primeira vez logo de cara e depois a cada 3 segundos
        fetchFilaStatus();
        const pollInterval = setInterval(fetchFilaStatus, 3000);

        // Mantém também o Realtime ativado (caso no futuro seja configurado na dashboard)
        const channel = supabase
            .channel('fila_disparos_updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'fila_disparos',
                    filter: `campanha_id=eq.${currentCampaignId}`,
                },
                (payload) => {
                    fetchFilaStatus(); // Em vez de montar na mão, puxamos a lista atualizada
                }
            )
            .subscribe();

        return () => {
            isSubscribed = false;
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
        };
    }, [currentCampaignId]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .eq('role', 'customer')
                .order('full_name', { ascending: true });

            if (error) throw error;
            setCustomers(data || []);
        } catch (error: any) {
            toast.error('Erro ao buscar clientes: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedCustomerIds(filteredCustomers.map(c => c.id));
        } else {
            setSelectedCustomerIds([]);
        }
    };

    const handleSelectCustomer = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedCustomerIds(prev => [...prev, id]);
        } else {
            setSelectedCustomerIds(prev => prev.filter(customerId => customerId !== id));
        }
    };

    const handleAddManualCustomer = () => {
        if (!manualName.trim() || !manualPhone.trim()) {
            toast.error('Preencha nome e telefone para adicionar um cliente.');
            return;
        }

        const newCustomer: CustomerProfile = {
            id: `manual-${Date.now()}`,
            full_name: manualName.trim(),
            phone: manualPhone.trim()
        };

        setCustomers(prev => [newCustomer, ...prev]);
        setSelectedCustomerIds(prev => [...prev, newCustomer.id]);

        setManualName('');
        setManualPhone('');
        toast.success('Cliente avulso adicionado e selecionado!');
    };

    const handleDeleteCustomer = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza que deseja apagar o cliente "${name}" permanentemente da sua lista e da base de dados?`)) return;

        try {
            if (id.startsWith('manual-')) {
                setCustomers(prev => prev.filter(c => c.id !== id));
                setSelectedCustomerIds(prev => prev.filter(cid => cid !== id));
                toast.success('Cliente avulso apagado!');
                return;
            }

            const { error } = await supabase.from('profiles').delete().eq('id', id);

            if (error) throw error;

            setCustomers(prev => prev.filter(c => c.id !== id));
            setSelectedCustomerIds(prev => prev.filter(cid => cid !== id));
            toast.success('Cliente apagado com sucesso do banco de dados!');
        } catch (err: any) {
            console.error(err);
            toast.error('Ocorreu um erro ao apagar o cliente: ' + err.message);
        }
    };

    const startCampaign = async () => {
        if (!messageText.trim()) {
            toast.error('Por favor, digite a mensagem da campanha.');
            return;
        }
        if (selectedCustomerIds.length === 0) {
            toast.error('Selecione pelo menos um cliente para enviar.');
            return;
        }

        setIsSending(true);

        try {
            // 1. Prepare finalized text (Opt-out is handled by n8n)
            const finalMessage = messageText;

            // 2. Insert Campaign
            const { data: campanha, error: campanhaError } = await supabase
                .from('campanhas')
                .insert({
                    texto_mensagem: finalMessage,
                    status: 'rodando'
                })
                .select()
                .single();

            if (campanhaError) throw campanhaError;

            const campanhaId = campanha.id;
            setCurrentCampaignId(campanhaId);

            // 3. Prepare Fila payload
            const selectedCustomersData = customers.filter(c => selectedCustomerIds.includes(c.id));
            const filaPayload = selectedCustomersData.map(c => ({
                campanha_id: campanhaId,
                nome_cliente: c.full_name || 'Cliente',
                telefone_cliente: c.phone || '',
                status: 'pendente'
            }));

            // 4. Insert Fila
            const { data: insertedFila, error: filaError } = await supabase
                .from('fila_disparos')
                .insert(filaPayload)
                .select('id, nome_cliente, status');

            if (filaError) throw filaError;

            setActiveFila(insertedFila || []);

            // 5. Trigger Webhook via Edge Function Proxy (Resolves CORS)
            try {
                const { error: invokeError } = await supabase.functions.invoke('whatsapp-router', {
                    body: {
                        project_type: 'marketing',
                        loja: 'cr_sushi',
                        campanha_id: campanhaId,
                        canpanha_id: campanhaId, // Adicionando com erro de digitação para compatibilidade com n8n
                        acao: 'iniciar_disparo',
                        mensagem: finalMessage
                    }
                });

                if (invokeError) throw invokeError;

                toast.success('Disparo humanizado iniciado com sucesso!');
            } catch (webhookError) {
                console.error('Erro no webhook via Edge Function:', webhookError);
                toast.error('A campanha foi registada, mas não foi possível contactar o n8n via Edge Function.');
            }

            // Cleanup UI
            setMessageText('');
            setSelectedCustomerIds([]);

        } catch (error: any) {
            console.error(error);
            toast.error('Ocorreu um erro ao iniciar a campanha: ' + error.message);
            setIsSending(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        (c.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm)
    );

    const pendingCount = activeFila.filter(f => f.status === 'pendente').length;
    const sentCount = activeFila.filter(f => f.status === 'enviado').length;
    const errorCount = activeFila.filter(f => f.status === 'erro').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Megaphone className="w-6 h-6 mr-2 text-red-600" />
                        Disparos de Marketing e Notificações
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Disparo em massa humanizado para WhatsApp</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Form and Selection */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Compor Mensagem</h2>

                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Ex: Olá {nome}! Temos uma promoção especial de sushi hoje..."
                            className="w-full h-32 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            disabled={isSending}
                        ></textarea>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-gray-500" />
                                Selecionar Clientes C&R Sushi
                            </h2>
                            <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                                {selectedCustomerIds.length} selecionados
                            </span>
                        </div>

                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Buscar cliente por nome ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            />
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        </div>

                        <div className="border rounded-md overflow-hidden max-h-80 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-sm text-gray-500">Carregando clientes...</div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredCustomers.map(customer => (
                                            <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCustomerIds.includes(customer.id)}
                                                        onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                                                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.full_name || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleDeleteCustomer(customer.id, customer.full_name || 'Desconhecido')}
                                                        disabled={isSending}
                                                        className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                                        title="Excluir Cliente"
                                                    >
                                                        <Trash2 className="w-4 h-4 ml-auto" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredCustomers.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                                    Nenhum cliente encontrado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Manual Customer Entry */}
                        <div className="mt-4 p-4 border rounded-md bg-gray-50 flex flex-col md:flex-row gap-3 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={manualName}
                                    onChange={(e) => setManualName(e.target.value)}
                                    placeholder="Ex: João Silva"
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                    disabled={isSending}
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    value={manualPhone}
                                    onChange={(e) => setManualPhone(e.target.value)}
                                    placeholder="Ex: 5511999999999"
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                    disabled={isSending}
                                />
                            </div>
                            <button
                                onClick={handleAddManualCustomer}
                                disabled={isSending}
                                className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50 w-full md:w-auto mt-4 md:mt-0"
                            >
                                Adicionar
                            </button>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={startCampaign}
                                disabled={isSending || selectedCustomerIds.length === 0}
                                className={`flex items-center px-6 py-2 rounded-md font-medium text-white transition-colors ${isSending || selectedCustomerIds.length === 0
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {isSending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Iniciar Disparo Humanizado
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Progress */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Progresso Atual</h2>

                        {activeFila.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                Nenhuma campanha em execução
                            </div>
                        ) : (
                            <div>
                                <div className="mb-4 space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Pendentes:</span>
                                        <span className="font-semibold text-yellow-600">{pendingCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Enviados (✅):</span>
                                        <span className="font-semibold text-green-600">{sentCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Erros (❌):</span>
                                        <span className="font-semibold text-red-600">{errorCount}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                                        <div
                                            className="bg-green-600 h-2.5 transition-all duration-500 ease-in-out"
                                            style={{ width: `${(sentCount / activeFila.length) * 100}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-right text-gray-500 mt-1">
                                        {Math.round((sentCount / activeFila.length) * 100) || 0}% Concluído
                                    </p>
                                </div>

                                <h3 className="text-sm font-semibold text-gray-700 mb-2 border-t pt-4">Lista de Envio</h3>
                                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                    {activeFila.map(item => (
                                        <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                                            <span className="text-gray-700 truncate max-w-[120px]" title={item.nome_cliente}>
                                                {item.nome_cliente}
                                            </span>
                                            {item.status === 'enviado' && (
                                                <span className="flex items-center text-green-600 text-xs font-medium">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> OK
                                                </span>
                                            )}
                                            {item.status === 'pendente' && (
                                                <span className="flex items-center text-yellow-600 text-xs font-medium">
                                                    <Clock className="w-3 h-3 mr-1" /> Espera
                                                </span>
                                            )}
                                            {item.status === 'erro' && (
                                                <span className="flex items-center text-red-600 text-xs font-medium">
                                                    <AlertCircle className="w-3 h-3 mr-1" /> Falhou
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
