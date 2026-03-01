import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react'; // Removed unused Circle import
import { supabase } from '../../integrations/supabase/client';
import toast from 'react-hot-toast';
import { Highlight } from '../../types'; // Corrected import path

export const AdminHighlights: React.FC = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    image_url: '',
    border_color: '#dc2626', // Default red-600
    order_index: 0,
    shadow_size: 4, // Novo campo com valor padrão
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('highlights')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching highlights:', error);
      toast.error('Erro ao buscar destaques.');
    } else {
      setHighlights(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (highlight?: Highlight) => {
    if (highlight) {
      setEditingHighlight(highlight);
      setFormData({
        name: highlight.name,
        price: highlight.price,
        image_url: highlight.image_url,
        border_color: highlight.border_color,
        order_index: highlight.order_index,
        shadow_size: highlight.shadow_size || 4, // Usar valor existente ou padrão
      });
    } else {
      setEditingHighlight(null);
      setFormData({
        name: '',
        price: 0,
        image_url: '',
        border_color: '#dc2626',
        order_index: highlights.length > 0 ? Math.max(...highlights.map(h => h.order_index)) + 1 : 0,
        shadow_size: 4, // Valor padrão para novo destaque
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingHighlight(null);
    setSelectedFile(null);
  };

  const handleSaveHighlight = async () => {
    setIsSaving(true);
    let imageUrl = formData.image_url;

    if (selectedFile) {
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('highlight_images') // Usar um bucket específico para destaques
        .upload(fileName, selectedFile);

      if (uploadError) {
        toast.error('Erro ao enviar a imagem: ' + uploadError.message);
        setIsSaving(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('highlight_images')
        .getPublicUrl(fileName);
      
      imageUrl = publicUrl;
    }

    const payload = { ...formData, image_url: imageUrl };

    if (editingHighlight) {
      const { error } = await supabase
        .from('highlights')
        .update(payload)
        .eq('id', editingHighlight.id);
      if (error) toast.error('Erro ao atualizar destaque.');
    } else {
      const { error } = await supabase
        .from('highlights')
        .insert([payload]);
      if (error) toast.error('Erro ao criar destaque.');
    }
    
    setIsSaving(false);
    fetchHighlights();
    handleCloseModal();
    toast.success('Destaque salvo com sucesso!');
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (confirm('Tem certeza que deseja excluir este destaque?')) {
      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('id', highlightId);
      if (error) {
        toast.error('Erro ao excluir destaque.');
      } else {
        toast.success('Destaque excluído com sucesso!');
      }
      fetchHighlights();
    }
  };

  if (loading) {
    return <div>Carregando destaques...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Destaques</h1>
          <p className="text-gray-600">Gerencie os itens que aparecem na seção de destaques do cardápio.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Destaque
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {highlights.map((highlight) => (
          <div key={highlight.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="relative p-4 flex items-center justify-center">
              <div 
                className="relative w-28 h-28 rounded-full flex items-center justify-center overflow-hidden shadow-lg" 
                /* Aumentado de w-20 h-20 para w-28 h-28 */
                style={{ 
                  border: `3px solid ${highlight.border_color}`,
                  boxShadow: `0 0 ${highlight.shadow_size || 4}px rgba(0, 0, 0, 0.9)`, // Usar shadow_size
                  margin: '7px'
                }}
              >
                <img
                  src={highlight.image_url}
                  alt={highlight.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="p-4 text-center">
              <h3 className="font-semibold text-gray-900 mb-1">{highlight.name}</h3>
              <p className="text-lg font-bold text-green-600 mb-4">
                R$ {highlight.price.toFixed(2)}
              </p>
              
              <div className="flex space-x-2 justify-center">
                <button
                  onClick={() => handleOpenModal(highlight)}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteHighlight(highlight.id)}
                  className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {highlights.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum destaque cadastrado</h3>
          <p className="text-gray-600 mb-4">
            Crie seus primeiros destaques para aparecerem no cardápio.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Criar primeiro destaque
          </button>
        </div>
      )}

      {/* Highlight Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingHighlight ? 'Editar Destaque' : 'Novo Destaque'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Destaque</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="Ex: Rolinho Primavera" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="w-full p-3 border rounded-lg" placeholder="Ex: 12.50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem</label>
                <input type="url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="https://exemplo.com/imagem.jpg" disabled={!!selectedFile} />
              </div>

              <div className="text-center my-2 text-sm text-gray-500">OU</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enviar Imagem do Computador</label>
                <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                {selectedFile && <p className="text-xs text-gray-600 mt-1">Arquivo selecionado: {selectedFile.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor da Borda (Hex ou Nome CSS)</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={formData.border_color} onChange={(e) => setFormData({ ...formData, border_color: e.target.value })} className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer" />
                  <input type="text" value={formData.border_color} onChange={(e) => setFormData({ ...formData, border_color: e.target.value })} className="flex-1 p-3 border rounded-lg" placeholder="#dc2626 ou red-600" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use um código hexadecimal (ex: #FF0000) ou um nome de cor CSS (ex: red, blue).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho da Sombra (0-10px)</label>
                <input type="number" min="0" max="10" value={formData.shadow_size} onChange={(e) => setFormData({ ...formData, shadow_size: parseInt(e.target.value) || 0 })} className="w-full p-3 border rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">
                  Controla a intensidade da sombra ao redor do destaque.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordem de Exibição</label>
                <input type="number" value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })} className="w-full p-3 border rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">
                  Destaques com menor número aparecem primeiro.
                </p>
              </div>
            </div>

            <div className="p-6 border-t flex space-x-3">
              <button onClick={handleCloseModal} className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg">Cancelar</button>
              <button onClick={handleSaveHighlight} disabled={isSaving} className="flex-1 bg-red-600 text-white py-3 rounded-lg disabled:opacity-50">{isSaving ? 'Salvando...' : (editingHighlight ? 'Salvar Alterações' : 'Criar Destaque')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};