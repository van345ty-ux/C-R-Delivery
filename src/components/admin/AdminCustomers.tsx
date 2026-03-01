import React, { useState, useEffect } from 'react';
import { User, Phone, Calendar, ShoppingBag } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string;
  birth_date: string;
  purchase_count: number;
  updated_at: string;
  role?: string;
}

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
    }
  }, [isAdmin]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('updated_at', { ascending: false });

      if (profilesError) throw profilesError;

      setCustomers(profiles || []);
    } catch (error: any) { // Explicitly type error as any
      console.error('Erro ao carregar clientes:', error);
      setError(error.message);
    } finally {
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
        <div className="flex items-center">
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            Total: {customers.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <User className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {customer.full_name || 'Nome não informado'}
                </h3>
                <p className="text-sm text-gray-500">ID: {customer.id.substring(0, 6)}...</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-500" />
                <span>{customer.phone || 'Não informado'}</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                <span>{formatDate(customer.birth_date)}</span>
              </div>
              
              <div className="flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2 text-gray-500" />
                <span>Compras: {customer.purchase_count || 0}</span>
              </div>
              
              <div className="pt-2 mt-2 border-t text-xs text-gray-400">
                Última atualização: {formatDate(customer.updated_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};