import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import toast from 'react-hot-toast';
import { Sliders, HelpCircle } from 'lucide-react';

interface Settings {
  [key: string]: string;
}

interface AdminPreOrderBannersProps {
  onSettingsSaved?: () => void;
}

export const AdminPreOrderBanners: React.FC<AdminPreOrderBannersProps> = ({ onSettingsSaved }) => {
  const [settings, setSettings] = useState<Settings>({
    pre_order_banner_text: 'Estaremos atendendo a partir das 18h, mas você pode deixar seu pedido agendado em nosso sistema.',
    world_cup_pre_order_popup_title: 'ATENDIMENTO ESPECIAL',
    world_cup_pre_order_popup_subtitle: 'Copa do Mundo 2026 🏆',
    world_cup_pre_order_popup_warning_title: 'Atenção: este é um pedido agendado!',
    world_cup_pre_order_popup_warning_description: 'Os atendimentos e entregas da C&R Sushi para esta promoção especial acontecerão exclusivamente na sexta-feira a partir das 18h.',
    world_cup_pre_order_popup_description: 'Ao realizar sua compra, você garante sua reserva antecipada para receber seu sushi na sexta-feira e torcer pelo Brasil rumo ao Hexa com muito sabor!',
    world_cup_pre_order_popup_footer: 'Programe-se e garanta o seu sushi para o jogo! ⚽🇧🇷',
    world_cup_pre_order_popup_button: 'Garantir Minha Reserva! ⚽',
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchBannersSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'pre_order_banner_text',
          'world_cup_pre_order_popup_title',
          'world_cup_pre_order_popup_subtitle',
          'world_cup_pre_order_popup_warning_title',
          'world_cup_pre_order_popup_warning_description',
          'world_cup_pre_order_popup_description',
          'world_cup_pre_order_popup_footer',
          'world_cup_pre_order_popup_button'
        ]);

      if (error) {
        toast.error('Erro ao carregar as configurações dos banners.');
      } else if (data) {
        const fetchedSettings = data.reduce((acc: Settings, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {});
        setSettings(prev => ({ ...prev, ...fetchedSettings }));
      }
      setLoading(false);
    };

    fetchBannersSettings();
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const settingsPayload = Object.entries(settings).map(([key, value]) => ({ key, value }));

    const { error } = await supabase
      .from('settings')
      .upsert(settingsPayload, { onConflict: 'key' });

    setIsSaving(false);

    if (error) {
      toast.error('Erro ao salvar as configurações dos banners.');
      console.error(error);
    } else {
      toast.success('Banners salvos com sucesso!');
      onSettingsSaved?.();
    }
  };

  if (loading) {
    return <div className="text-gray-600">Carregando editores de banners...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Banners de Agendamento</h1>
        <p className="text-gray-600">Edite as mensagens do banner do cardápio e do pop-up de agendamento da Copa.</p>
      </div>

      {/* Seção 1: Banner do Cardápio */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-red-600" />
          Banner de Aviso no Cardápio (Estilo Tarjeta)
        </h2>
        
        <div>
          <label htmlFor="preOrderBannerText" className="block text-sm font-medium text-gray-700 mb-2">
            Texto do Banner (Exibido sob a imagem principal)
          </label>
          <textarea
            id="preOrderBannerText"
            value={settings.pre_order_banner_text || ''}
            onChange={(e) => handleInputChange('pre_order_banner_text', e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-900 bg-white"
            rows={3}
            placeholder="Digite o aviso de agendamento que os clientes de Comandatuba verão no topo..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Este banner vermelho de aviso só aparecerá para a rota Comandatuba quando o agendamento estiver ativo.
          </p>
        </div>
      </div>

      {/* Seção 2: Pop-up da Copa */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-green-600" />
          Pop-up de Pré-agendamento da Copa (Modal de Entrada)
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Cabeçalho</label>
              <input
                type="text"
                value={settings.world_cup_pre_order_popup_title || ''}
                onChange={(e) => handleInputChange('world_cup_pre_order_popup_title', e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-900 bg-white"
                placeholder="Ex: ATENDIMENTO ESPECIAL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo do Cabeçalho</label>
              <input
                type="text"
                value={settings.world_cup_pre_order_popup_subtitle || ''}
                onChange={(e) => handleInputChange('world_cup_pre_order_popup_subtitle', e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-900 bg-white"
                placeholder="Ex: Copa do Mundo 2026 🏆"
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Caixa de Alerta (Aviso Rígido)</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Alerta</label>
                <input
                  type="text"
                  value={settings.world_cup_pre_order_popup_warning_title || ''}
                  onChange={(e) => handleInputChange('world_cup_pre_order_popup_warning_title', e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm text-gray-900 bg-white"
                  placeholder="Ex: Atenção: este é um pedido agendado!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Alerta</label>
                <textarea
                  value={settings.world_cup_pre_order_popup_warning_description || ''}
                  onChange={(e) => handleInputChange('world_cup_pre_order_popup_warning_description', e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm text-gray-900 bg-white"
                  rows={2}
                  placeholder="Ex: Os atendimentos e entregas da C&R Sushi acontecerão exclusivamente na sexta-feira..."
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Textos Adicionais & Botão</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Central (Corpo do Modal)</label>
              <textarea
                value={settings.world_cup_pre_order_popup_description || ''}
                onChange={(e) => handleInputChange('world_cup_pre_order_popup_description', e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-900 bg-white"
                rows={3}
                placeholder="Explicação detalhada sobre a reserva antecipada..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Rodapé (Footer)</label>
                <input
                  type="text"
                  value={settings.world_cup_pre_order_popup_footer || ''}
                  onChange={(e) => handleInputChange('world_cup_pre_order_popup_footer', e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm text-gray-900 bg-white"
                  placeholder="Ex: Programe-se e garanta o seu sushi para o jogo!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Botão de Confirmação</label>
                <input
                  type="text"
                  value={settings.world_cup_pre_order_popup_button || ''}
                  onChange={(e) => handleInputChange('world_cup_pre_order_popup_button', e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm text-gray-900 bg-white"
                  placeholder="Ex: Garantir Minha Reserva! ⚽"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold"
        >
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
};
