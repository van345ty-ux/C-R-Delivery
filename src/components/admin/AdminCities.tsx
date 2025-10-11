import React, { useState, useEffect } from 'react';
import { Plus, MapPin } from 'lucide-react';
import { City } from '../../App';
import { supabase } from '../../integrations/supabase/client';

export const AdminCities: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCityName, setNewCityName] = useState('');

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching cities:', error);
      alert('Erro ao buscar cidades.');
    } else {
      setCities(data || []);
    }
    setLoading(false);
  };

  const toggleCityStatus = async (city: City) => {
    const { error } = await supabase
      .from('cities')
      .update({ active: !city.active })
      .eq('id', city.id);

    if (error) {
      alert('Erro ao atualizar status da cidade.');
    } else {
      fetchCities(); // Re-fetch to get updated list
    }
  };

  const addNewCity = async () => {
    if (newCityName.trim() && !cities.find(city => city.name.toLowerCase() === newCityName.trim().toLowerCase())) {
      const { error } = await supabase
        .from('cities')
        .insert([{ name: newCityName.trim(), active: false }]);

      if (error) {
        alert('Erro ao adicionar nova cidade.');
      } else {
        setNewCityName('');
        setShowModal(false);
        fetchCities(); // Re-fetch
      }
    } else {
      alert('Nome da cidade inválido ou já existe.');
    }
  };

  const removeCity = async (city: City) => {
    if (confirm(`Tem certeza que deseja remover a cidade "${city.name}"?`)) {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', city.id);

      if (error) {
        alert('Erro ao remover cidade.');
      } else {
        fetchCities(); // Re-fetch
      }
    }
  };

  if (loading) {
    return <div>Carregando cidades...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rota Atual</h1>
          <p className="text-gray-600">Gerencie as cidades atendidas pelo delivery</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Cidade
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Cidades Cadastradas</h2>
          <p className="text-sm text-gray-600 mt-1">
            {cities.filter(c => c.active).length} de {cities.length} cidades ativas
          </p>
        </div>

        <div className="divide-y">
          {cities.map((city) => (
            <div key={city.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  city.active ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {city.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Status: {city.active ? 'Ativa (atendendo pedidos)' : 'Inativa (não atendendo)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleCityStatus(city)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    city.active
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {city.active ? 'Desativar' : 'Ativar'}
                </button>
                
                <button
                  onClick={() => removeCity(city)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {cities.length === 0 && (
          <div className="p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma cidade cadastrada ainda</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-red-600 hover:text-red-700"
            >
              Cadastrar primeira cidade
            </button>
          </div>
        )}
      </div>

      {/* Add City Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Nova Cidade</h2>
              <p className="text-sm text-gray-600 mt-1">
                Adicione uma nova cidade à sua área de atendimento
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Cidade
              </label>
              <input
                type="text"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="Ex: Salvador"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                A cidade será criada como inativa por padrão
              </p>
            </div>

            <div className="p-6 border-t flex space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewCityName('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addNewCity}
                disabled={!newCityName.trim()}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar Cidade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};