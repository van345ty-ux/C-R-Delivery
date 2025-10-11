import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Image } from 'lucide-react';
import { Product } from '../../App';
import { supabase } from '../../integrations/supabase/client';

export const AdminPromotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    price: 0,
    original_price: 0,
    badge_text: '',
    available: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'Promoção')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotions:', error);
      alert('Erro ao buscar promoções.');
    } else {
      setPromotions(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (promotion?: Product) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        name: promotion.name,
        description: promotion.description,
        image: promotion.image,
        price: promotion.price,
        original_price: promotion.original_price || 0,
        badge_text: promotion.badge_text || '',
        available: promotion.available,
      });
    } else {
      setEditingPromotion(null);
      setFormData({
        name: '',
        description: '',
        image: '',
        price: 0,
        original_price: 0,
        badge_text: '',
        available: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
    setSelectedFile(null);
  };

  const handleSavePromotion = async () => {
    setIsSaving(true);
    let imageUrl = formData.image;

    if (selectedFile) {
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(fileName, selectedFile);

      if (uploadError) {
        alert('Erro ao enviar a imagem: ' + uploadError.message);
        setIsSaving(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product_images')
        .getPublicUrl(fileName);
      
      imageUrl = publicUrl;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      image: imageUrl,
      price: formData.price,
      original_price: formData.original_price > 0 ? formData.original_price : null,
      badge_text: formData.badge_text || null,
      available: formData.available,
      category: 'Promoção',
    };

    if (editingPromotion) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingPromotion.id);
      if (error) alert('Erro ao atualizar promoção.');
    } else {
      const { error } = await supabase
        .from('products')
        .insert([payload]);
      if (error) alert('Erro ao criar promoção.');
    }
    
    setIsSaving(false);
    fetchPromotions();
    handleCloseModal();
  };

  const handleDeletePromotion = async (promotionId: string) => {
    if (confirm('Tem certeza que deseja excluir esta promoção? Ela será removida do cardápio.')) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', promotionId);
      if (error) alert('Erro ao excluir promoção.');
      fetchPromotions();
    }
  };

  const togglePromotionStatus = async (promotion: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ available: !promotion.available })
      .eq('id', promotion.id);
    if (error) alert('Erro ao atualizar status.');
    fetchPromotions();
  };

  if (loading) {
    return <div>Carregando promoções...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promoções</h1>
          <p className="text-gray-600">Crie itens promocionais que aparecerão no pop-up e no cardápio</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Promoção
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {promotions.map((promotion) => (
          <div key={promotion.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="relative">
              <img
                src={promotion.image}
                alt={promotion.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2 flex space-x-2">
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  promotion.available
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {promotion.available ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-900 mb-2">{promotion.name}</h3>
                <div className="text-right">
                  {promotion.original_price && (
                    <span className="text-sm text-gray-500 line-through">
                      R$ {promotion.original_price.toFixed(2)}
                    </span>
                  )}
                  <span className="text-lg font-bold text-green-600 block">
                    R$ {promotion.price.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{promotion.description}</p>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => togglePromotionStatus(promotion)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    promotion.available
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {promotion.available ? 'Desativar' : 'Ativar'}
                </button>
                
                <button
                  onClick={() => handleOpenModal(promotion)}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleDeletePromotion(promotion.id)}
                  className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {promotions.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma promoção cadastrada</h3>
          <p className="text-gray-600 mb-4">
            Crie promoções atrativas para seus clientes
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Criar primeira promoção
          </button>
        </div>
      )}

      {/* Promotion Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título da Promoção</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="Ex: Combo Especial de Verão" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full p-3 border rounded-lg" rows={3} placeholder="Ex: 20 peças variadas + 1 Temaki Filadélfia" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem</label>
                <input type="url" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="https://exemplo.com/imagem.jpg" disabled={!!selectedFile} />
              </div>

              <div className="text-center my-2 text-sm text-gray-500">OU</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enviar Imagem do Computador</label>
                <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                {selectedFile && <p className="text-xs text-gray-600 mt-1">Arquivo selecionado: {selectedFile.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço Original (De:)</label>
                  <input type="number" min="0" step="0.01" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: parseFloat(e.target.value) || 0 })} className="w-full p-3 border rounded-lg" placeholder="Ex: 59.90" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço Promocional (Por:)</label>
                  <input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="w-full p-3 border rounded-lg" placeholder="Ex: 49.90" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Selo (opcional)</label>
                <input type="text" value={formData.badge_text} onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="Ex: EM PROMOÇÃO, NOVIDADE" />
              </div>

              <div>
                <label className="flex items-center">
                  <input type="checkbox" checked={formData.available} onChange={(e) => setFormData({ ...formData, available: e.target.checked })} className="mr-2" />
                  <span className="text-sm font-medium text-gray-700">Promoção ativa e visível</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex space-x-3">
              <button onClick={handleCloseModal} className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg">Cancelar</button>
              <button onClick={handleSavePromotion} disabled={isSaving} className="flex-1 bg-red-600 text-white py-3 rounded-lg disabled:opacity-50">{isSaving ? 'Salvando...' : (editingPromotion ? 'Salvar Alterações' : 'Criar Promoção')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};