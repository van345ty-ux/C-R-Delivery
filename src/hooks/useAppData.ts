import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import toast from 'react-hot-toast';
import { City, OperatingHour } from '../types';

export const useAppData = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [appSettings, setAppSettings] = useState<{ [key: string]: string }>({});
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
  const [initialAppDataLoading, setInitialAppDataLoading] = useState(true);

  const fetchInitialAppData = useCallback(async () => {
    console.log('useAppData: fetchInitialAppData: Starting initial app data fetch.');
    setInitialAppDataLoading(true);
    console.log('useAppData: initialAppDataLoading set to true (start of fetchInitialAppData)');
    try {
      const settingsPromise = supabase.from('settings').select('key, value');
      const citiesPromise = supabase.from('cities').select('*').order('name', { ascending: true });
      const hoursPromise = supabase.from('operating_hours').select('*');

      const [settingsResult, citiesResult, hoursResult] = await Promise.all([settingsPromise, citiesPromise, hoursPromise]);

      if (settingsResult.error) {
        toast.error('Erro ao carregar configurações: ' + settingsResult.error.message);
        console.error('useAppData: fetchInitialAppData: Settings error:', settingsResult.error);
      } else if (settingsResult.data) {
        const settingsMap = settingsResult.data.reduce((acc, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {} as { [key: string]: string });
        setAppSettings(settingsMap);
        console.log('useAppData: fetchInitialAppData: Settings loaded.');
      }

      if (citiesResult.error) {
        toast.error('Erro ao carregar cidades: ' + citiesResult.error.message);
        console.error('useAppData: fetchInitialAppData: Cities error:', citiesResult.error);
      } else {
        setCities(citiesResult.data || []);
        console.log('useAppData: fetchInitialAppData: Cities loaded.');
      }

      if (hoursResult.error) {
        toast.error('Erro ao verificar horário de funcionamento: ' + hoursResult.error.message);
        console.error('useAppData: fetchInitialAppData: Operating hours error:', hoursResult.error);
      } else if (hoursResult.data) {
        setOperatingHours(hoursResult.data || []);
        console.log('useAppData: fetchInitialAppData: Operating hours loaded.');
      }
    } catch (error: any) {
      console.error("useAppData: fetchInitialAppData: Critical error during initial app data fetching:", error);
      toast.error("Falha crítica ao carregar dados iniciais do aplicativo: " + (error.message || "Erro desconhecido"));
    } finally {
      setInitialAppDataLoading(false);
      console.log('useAppData: initialAppDataLoading set to false (end of fetchInitialAppData)');
    }
  }, []);

  useEffect(() => {
    fetchInitialAppData();
  }, [fetchInitialAppData]);

  return {
    cities,
    appSettings,
    operatingHours,
    initialAppDataLoading,
    fetchInitialAppData,
  };
};