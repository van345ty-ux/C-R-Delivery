import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import toast from 'react-hot-toast';

interface Settings {
  [key: string]: string;
}

interface OperatingHour {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    promotion_modal_title: 'Promoções do Dia',
    delivery_fee: '3.00',
    app_logo_url: '/assets/logo.png',
    pix_key: '',
    hero_image_url: 'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    // Novas configurações para o título e subtítulo do hero
    hero_title_text: 'C&R Sushi',
    hero_title_font_size: '48px',
    hero_title_font_color: '#ffffff',
    hero_title_border_color: '#000000',
    hero_subtitle_text: 'A Experiência Japonesa Autêntica na Sua Casa',
    hero_subtitle_font_size: '20px',
    hero_subtitle_font_color: '#ffffff',
    hero_subtitle_border_color: '#000000',
    is_festive_mode_enabled: 'false',
  });
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [selectedHeroFile, setSelectedHeroFile] = useState<File | null>(null);

  const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  useEffect(() => {
    const fetchAllSettings = async () => {
      setLoading(true);

      const settingsPromise = supabase.from('settings').select('key, value');
      const hoursPromise = supabase.from('operating_hours').select('*').order('day_of_week', { ascending: true });

      const [settingsResult, hoursResult] = await Promise.all([settingsPromise, hoursPromise]);

      // Handle general settings
      if (settingsResult.error) {
        toast.error('Erro ao carregar as configurações.');
      } else if (settingsResult.data) {
        const fetchedSettings = settingsResult.data.reduce((acc: Settings, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {});
        setSettings(prev => ({ ...prev, ...fetchedSettings }));
      }

      // Handle operating hours
      if (hoursResult.error) {
        toast.error('Erro ao carregar horários de funcionamento.');
      } else {
        setOperatingHours(hoursResult.data || []);
      }

      setLoading(false);
    };

    fetchAllSettings();
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleOperatingHoursChange = (dayIndex: number, field: keyof OperatingHour, value: any) => {
    setOperatingHours(prev =>
      prev.map(day =>
        day.day_of_week === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const uploadFile = async (file: File, bucketName: string): Promise<string | null> => {
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file);

    if (uploadError) {
      console.error(`Error uploading to ${bucketName}:`, uploadError);
      toast.error(`Erro ao enviar a imagem para ${bucketName}.`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSave = async () => {
    setIsSaving(true);

    let newLogoUrl = settings.app_logo_url;
    if (selectedLogoFile) {
      const uploadedUrl = await uploadFile(selectedLogoFile, 'app_assets');
      if (uploadedUrl) {
        newLogoUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    }

    let newHeroImageUrl = settings.hero_image_url;
    if (selectedHeroFile) {
      const uploadedUrl = await uploadFile(selectedHeroFile, 'app_hero_images');
      if (uploadedUrl) {
        newHeroImageUrl = uploadedUrl;
      } else {
        setIsSaving(false);
        return;
      }
    }

    const settingsToSave = {
      ...settings,
      app_logo_url: newLogoUrl,
      hero_image_url: newHeroImageUrl
    };
    const settingsPayload = Object.entries(settingsToSave).map(([key, value]) => ({ key, value }));

    const settingsPromise = supabase.from('settings').upsert(settingsPayload, { onConflict: 'key' });
    const hoursPromise = supabase.from('operating_hours').upsert(operatingHours, { onConflict: 'day_of_week' });

    const [settingsResult, hoursResult] = await Promise.all([settingsPromise, hoursPromise]);

    setIsSaving(false);
    if (settingsResult.error || hoursResult.error) {
      toast.error('Ocorreu um erro ao salvar as configurações.');
      console.error('Settings Error:', settingsResult.error);
      console.error('Hours Error:', hoursResult.error);
    } else {
      toast.success('Configurações salvas com sucesso!');
      setSettings(settingsToSave);
      setSelectedLogoFile(null);
      setSelectedHeroFile(null);
    }
  };

  if (loading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações Gerais</h1>
        <p className="text-gray-600">Ajuste as configurações globais do aplicativo.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Horário de Funcionamento</h2>
        <div className="space-y-4">
          {operatingHours.map((day) => (
            <div key={day.day_of_week} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 p-2 rounded-lg even:bg-gray-50">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={(e) => handleOperatingHoursChange(day.day_of_week, 'is_open', e.target.checked)}
                  className="mr-3 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="font-medium text-gray-700">{daysOfWeek[day.day_of_week]}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={day.open_time?.substring(0, 5) || '18:00'}
                  onChange={(e) => handleOperatingHoursChange(day.day_of_week, 'open_time', e.target.value)}
                  disabled={!day.is_open}
                  className="w-full p-2 border rounded-lg text-sm disabled:opacity-50"
                />
                <span>às</span>
                <input
                  type="time"
                  value={day.close_time?.substring(0, 5) || '23:00'}
                  onChange={(e) => handleOperatingHoursChange(day.day_of_week, 'close_time', e.target.value)}
                  disabled={!day.is_open}
                  className="w-full p-2 border rounded-lg text-sm disabled:opacity-50"
                />
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${day.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {day.is_open ? 'Aberto' : 'Fechado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Identidade Visual</h2>
        <div>
          <label htmlFor="logoUpload" className="block text-sm font-medium text-gray-700 mb-2">
            Logo do Aplicativo
          </label>
          <div className="flex items-center gap-4">
            <img src={settings.app_logo_url || '/assets/logo.png'} alt="Logo atual" className="w-16 h-16 rounded-full object-cover border" />
            <input
              id="logoUpload"
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedLogoFile(e.target.files ? e.target.files[0] : null)}
              className="w-full max-w-xs text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Envie uma nova imagem para atualizar a logo em todo o aplicativo. Recomendado: formato quadrado (ex: 512x512).
          </p>
        </div>

        <div className="mt-6 pt-6 border-t">
          <label htmlFor="heroImageUpload" className="block text-sm font-medium text-gray-700 mb-2">
            Imagem Principal do Cardápio (Hero Section)
          </label>
          <div className="flex items-center gap-4 mb-2">
            <img src={settings.hero_image_url} alt="Imagem principal atual" className="w-32 h-20 object-cover border rounded-lg" />
            <input
              id="heroImageUpload"
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedHeroFile(e.target.files ? e.target.files[0] : null)}
              className="w-full max-w-xs text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
            />
          </div>
          <input
            type="url"
            value={settings.hero_image_url}
            onChange={(e) => handleInputChange('hero_image_url', e.target.value)}
            className="w-full max-w-md p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mt-2"
            placeholder="Ou insira uma URL de imagem (ex: https://exemplo.com/hero.jpg)"
            disabled={!!selectedHeroFile}
          />
          <p className="text-xs text-gray-500 mt-2">
            Esta imagem aparecerá no topo do cardápio. Recomendado: formato retangular (ex: 1200x400).
          </p>
        </div>

        {/* Novas configurações para o Título do Hero */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Título Principal do Cardápio</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Título</label>
            <input type="text" value={settings.hero_title_text} onChange={(e) => handleInputChange('hero_title_text', e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ex: C&R Sushi" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho da Fonte (ex: 48px)</label>
              <input type="text" value={settings.hero_title_font_size} onChange={(e) => handleInputChange('hero_title_font_size', e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ex: 48px" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor da Fonte</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.hero_title_font_color} onChange={(e) => handleInputChange('hero_title_font_color', e.target.value)} className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer" />
                <input type="text" value={settings.hero_title_font_color} onChange={(e) => handleInputChange('hero_title_font_color', e.target.value)} className="flex-1 p-3 border rounded-lg" placeholder="#ffffff" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor da Sombra do Texto (Borda)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.hero_title_border_color} onChange={(e) => handleInputChange('hero_title_border_color', e.target.value)} className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer" />
              <input type="text" value={settings.hero_title_border_color} onChange={(e) => handleInputChange('hero_title_border_color', e.target.value)} className="flex-1 p-3 border rounded-lg" placeholder="#000000" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Esta cor será usada para criar um efeito de sombra/borda ao redor do texto.
            </p>
          </div>
        </div>

        {/* Novas configurações para o Subtítulo do Hero */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subtítulo do Cardápio</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Subtítulo</label>
            <input type="text" value={settings.hero_subtitle_text} onChange={(e) => handleInputChange('hero_subtitle_text', e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ex: A Experiência Japonesa Autêntica na Sua Casa" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho da Fonte (ex: 20px)</label>
              <input type="text" value={settings.hero_subtitle_font_size} onChange={(e) => handleInputChange('hero_subtitle_font_size', e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ex: 20px" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor da Fonte</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.hero_subtitle_font_color} onChange={(e) => handleInputChange('hero_subtitle_font_color', e.target.value)} className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer" />
                <input type="text" value={settings.hero_subtitle_font_color} onChange={(e) => handleInputChange('hero_subtitle_font_color', e.target.value)} className="flex-1 p-3 border rounded-lg" placeholder="#ffffff" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor da Sombra do Texto (Borda)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.hero_subtitle_border_color} onChange={(e) => handleInputChange('hero_subtitle_border_color', e.target.value)} className="w-10 h-10 p-0 border-none rounded-lg cursor-pointer" />
              <input type="text" value={settings.hero_subtitle_border_color} onChange={(e) => handleInputChange('hero_subtitle_border_color', e.target.value)} className="flex-1 p-3 border rounded-lg" placeholder="#000000" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Esta cor será usada para criar um efeito de sombra/borda ao redor do texto.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pop-up de Promoções</h2>
        <div>
          <label htmlFor="promotionTitle" className="block text-sm font-medium text-gray-700 mb-2">
            Título do Pop-up
          </label>
          <input
            id="promotionTitle"
            type="text"
            value={settings.promotion_modal_title}
            onChange={(e) => handleInputChange('promotion_modal_title', e.target.value)}
            className="w-full max-w-md p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: Promoções do Dia, Dicas do Chef..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Este título aparecerá no pop-up que é exibido ao abrir o cardápio.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Entrega</h2>
        <div>
          <label htmlFor="deliveryFee" className="block text-sm font-medium text-gray-700 mb-2">
            Taxa de Entrega (R$)
          </label>
          <input
            id="deliveryFee"
            type="number"
            step="0.01"
            min="0"
            value={settings.delivery_fee}
            onChange={(e) => handleInputChange('delivery_fee', e.target.value)}
            className="w-full max-w-xs p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: 3.00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Este valor será cobrado para todos os pedidos do tipo "Delivery".
          </p>
        </div>
      </div>

      {/* Nova seção para Forma de Pagamento */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Forma de Pagamento</h2>
        <div>
          <label htmlFor="pixKey" className="block text-sm font-medium text-gray-700 mb-2">
            Chave Pix
          </label>
          <input
            id="pixKey"
            type="text"
            value={settings.pix_key}
            onChange={(e) => handleInputChange('pix_key', e.target.value)}
            className="w-full max-w-md p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Ex: seuemail@email.com ou 000.000.000-00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Esta chave será exibida ao cliente quando ele escolher pagar com Pix.
          </p>
        </div>
      </div>

      {/* Seção de Ornamentação Festiva */}
      <div className="bg-white rounded-lg shadow-sm border p-6 border-yellow-400 bg-yellow-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🎄 Ornamentação Festiva <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">Novo</span>
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ative para exibir neve caindo, cores douradas e efeitos de natal/ano novo no aplicativo.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.is_festive_mode_enabled === 'true'}
              onChange={(e) => handleInputChange('is_festive_mode_enabled', e.target.checked ? 'true' : 'false')}
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-500"></div>
          </label>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
};