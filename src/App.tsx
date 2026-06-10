import { useState, useEffect, useCallback, useRef } from 'react';
import { LocationSelect } from './components/LocationSelect';
import { HomePage } from './components/HomePage';
import { AdminPanel } from './components/AdminPanel';
import { UserAuth } from './components/UserAuth';
import { OrderTracking } from './components/OrderTracking';
import { UserProfile } from './components/UserProfile';
import { UserCouponNotification } from './components/UserCouponNotification';
import { ThemeProvider } from './contexts/ThemeContext';
import { supabase } from './integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import { User, Coupon, Product, CartItem, Order, City, OperatingHour } from './types'; // Importando tipos de types.ts
import { CookieBanner } from './components/CookieBanner';
import { ValentineTheme } from './components/ValentineTheme';

// Usa fetch nativo para evitar travamento do SDK do Supabase
const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  console.log('fetchUserProfile: Fetching profile for user ID:', supabaseUser.id);
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const getAuthToken = async () => {
    try {
      const stored = localStorage.getItem(`sb-${SUPABASE_URL.split('.')[0].replace('https://', '')}-auth-token`);
      if (stored) return JSON.parse(stored)?.access_token;
    } catch { /* ignore */ }
    return SUPABASE_KEY;
  };

  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Busca o perfil
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${supabaseUser.id}&select=*&limit=1`,
      { headers }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const profiles = await res.json();
    let data = profiles?.[0] || null;

    if (!data) {
      // Perfil não existe, cria
      console.log('fetchUserProfile: Profile not found, creating...');
      const createRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: supabaseUser.id,
          full_name: supabaseUser.user_metadata?.full_name,
          phone: supabaseUser.user_metadata?.phone,
          birth_date: supabaseUser.user_metadata?.birth_date,
          role: 'customer',
        }),
      });
      if (!createRes.ok) { console.error('fetchUserProfile: Failed to create profile'); return null; }
      const created = await createRes.json();
      data = Array.isArray(created) ? created[0] : created;
    }

    if (!data) return null;
    return {
      id: data.id,
      name: data.full_name,
      email: supabaseUser.email!,
      phone: data.phone,
      birthDate: data.birth_date,
      purchaseCount: data.purchase_count || 0,
      role: data.role || 'customer',
    };
  } catch (err) {
    console.error('fetchUserProfile: Error:', err);
    return null;
  }
};

// Constante para o limite de inatividade (Removido limite, recarrega sempre)
// const INACTIVITY_LIMIT_MS = 10 * 1000;
const LAST_ACCESS_KEY = 'lastAccessTimestamp';

function App() {
  // Função para determinar a view inicial, agora simplificada
  const getInitialView = (savedView: string, savedCity: string): 'location' | 'home' | 'admin' | 'auth' | 'tracking' => {
    if (typeof window === 'undefined') return 'location';

    // Se a cidade não estiver selecionada, força a tela de localização.
    if (!savedCity) {
      console.log('App: Forcing location view due to missing city.');
      return 'location';
    }

    // Caso contrário, retorna a última view salva
    return savedView as 'location' | 'home' | 'admin' | 'auth' | 'tracking' || 'location';
  };

  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedCity') || '';
    }
    return '';
  });

  const [currentView, setCurrentView] = useState<'location' | 'home' | 'admin' | 'auth' | 'tracking'>(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('lastView');
      return getInitialView(savedView || 'location', selectedCity);
    }
    return 'location';
  });

  const [valentineTriggerKey, setValentineTriggerKey] = useState(0);

  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          return JSON.parse(savedCart);
        } catch (e) {
          console.error("Failed to parse cart from localStorage", e);
          return [];
        }
      }
    }
    return [];
  });

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Verifica se há sessão salva no localStorage para evitar loading screen desnecessária
  const hasStoredSession = (() => {
    try {
      const keys = Object.keys(localStorage);
      return keys.some(k => k.includes('-auth-token') && localStorage.getItem(k));
    } catch { return false; }
  })();
  const [showProfile, setShowProfile] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [appSettings, setAppSettings] = useState<{ [key: string]: string }>({});
  const [initialAppDataLoading, setInitialAppDataLoading] = useState(true);
  // Inicializa como true se houver sessão armazenada para evitar renderizações precoces
  const [authLoading, setAuthLoading] = useState(hasStoredSession);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [canPlaceOrder, setCanPlaceOrder] = useState(false); // Novo estado para controlar se pode fazer pedido (incluindo pré-pedido)
  const [showUserCouponNotification, setShowUserCouponNotification] = useState(false);
  const [pendingCouponNotificationUserId, setPendingCouponNotificationUserId] = useState<string | null>(null);
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]); // Novo estado para operatingHours
  const [showPreOrderModal, setShowPreOrderModal] = useState(false); // Novo estado para o modal de pré-pedido
  const [showPreOrderBanner, setShowPreOrderBanner] = useState(false); // Novo estado para o banner de pré-pedido
  const [isMercadoPagoReturnFlow, setIsMercadoPagoReturnFlow] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('isMercadoPagoReturnFlow') || 'false');
    }
    return false;
  });
  const [isPixReturnFlow, setIsPixReturnFlow] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('isPixReturnFlow') || 'false');
    }
    return false;
  });

  // O aplicativo só para de carregar quando os dados iniciais E a autenticação estiverem prontos E o perfil do usuário logado (se houver) estiver carregado
  const isLoading = initialAppDataLoading || authLoading || (session !== null && user === null);
  console.log('App: isLoading:', isLoading, 'initialAppDataLoading:', initialAppDataLoading, 'authLoading:', authLoading, 'sessionActive:', session !== null, 'userProfileLoaded:', user !== null);

  // Effect to save currentView to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastView', currentView);
    }
  }, [currentView]);

  // Effect to save selectedCity to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCity', selectedCity);
    }
  }, [selectedCity]);

  // Effect to save cart to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart]);

  // Effect to save isMercadoPagoReturnFlow to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isMercadoPagoReturnFlow', JSON.stringify(isMercadoPagoReturnFlow));
    }
  }, [isMercadoPagoReturnFlow]);

  // Effect to save isPixReturnFlow to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isPixReturnFlow', JSON.stringify(isPixReturnFlow));
    }
  }, [isPixReturnFlow]);

  // Apenas atualiza o timestamp, sem reload
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoading) {
      localStorage.setItem(LAST_ACCESS_KEY, Date.now().toString());
    }
  }, [isLoading]);

  // Verifica se há novas atualizações na Vercel ao retornar para o app
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Captura os scripts carregados no início da sessão
    const currentScripts = Array.from(document.querySelectorAll('script[src]'))
      .map(s => s.getAttribute('src'))
      .filter(Boolean) as string[];

    const checkForUpdates = async () => {
      try {
        const response = await fetch('/index.html?t=' + Date.now());
        if (!response.ok) return;
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newScripts = Array.from(doc.querySelectorAll('script[src]'))
          .map(s => s.getAttribute('src'))
          .filter(Boolean) as string[];

        // Se houver algum script novo no HTML da Vercel que não está carregado atualmente
        const hasUpdate = newScripts.some(src => !currentScripts.includes(src));
        if (hasUpdate) {
          console.log('App: Nova atualização detectada na Vercel. Recarregando...');
          window.location.reload();
        }
      } catch (error) {
        console.error('App: Erro ao verificar atualizações:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);


  // Debugging logs for App state
  useEffect(() => {
    console.log('App State - pendingCouponNotificationUserId:', pendingCouponNotificationUserId);
    console.log('App State - showUserCouponNotification:', showUserCouponNotification);
    console.log('App State - user:', user ? user.name : 'null');
    console.log('App State - session:', session ? 'active' : 'null');
    console.log('App State - currentView:', currentView);
    console.log('App State - showPreOrderModal:', showPreOrderModal);
    console.log('App State - showPreOrderBanner:', showPreOrderBanner);
    console.log('App State - isStoreOpen:', isStoreOpen);
    console.log('App State - canPlaceOrder (incl. pre-order):', canPlaceOrder); // Adicionado log
    console.log('App State - isMercadoPagoReturnFlow:', isMercadoPagoReturnFlow); // Adicionado log
    console.log('App State - isPixReturnFlow:', isPixReturnFlow); // Adicionado log
  }, [pendingCouponNotificationUserId, showUserCouponNotification, user, session, currentView, showPreOrderModal, showPreOrderBanner, isStoreOpen, canPlaceOrder, isMercadoPagoReturnFlow, isPixReturnFlow]);

  // Usando useRef para evitar que a função seja recriada e cause loop infinito no useEffect de auth
  const checkAndShowCouponNotificationRef = useRef(async (userId: string) => {
    console.log('checkAndShowCouponNotification called for userId:', userId);

    const { data: couponsData, error: couponsError } = await supabase
      .from('coupons')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('active', true)
      .eq('is_pending_admin_approval', false);

    if (couponsError) {
      console.error('Error fetching coupons for notification:', couponsError);
      setPendingCouponNotificationUserId(null);
      return;
    }

    const today = new Date();
    const hasAvailableCoupons = (couponsData || []).filter((coupon: Coupon) => {
      const validFrom = new Date(coupon.valid_from);
      const validTo = new Date(coupon.valid_to);
      validTo.setHours(23, 59, 59, 999);

      const isCurrentlyValid = today >= validFrom && today <= validTo;
      const hasUsagesLeft = coupon.usage_limit === null || coupon.usage_limit === undefined || coupon.usage_count < coupon.usage_limit;

      if (!coupon.user_id) {
        return false; // Não notificar automaticamente cupons universais (apenas uso manual)
      }

      if ((coupon.type === 'birthday' || coupon.type === 'loyalty') && !coupon.user_id) {
        return false;
      }
      return isCurrentlyValid && hasUsagesLeft;
    }).length > 0;
    console.log('hasAvailableCoupons:', hasAvailableCoupons);

    if (hasAvailableCoupons) {
      setPendingCouponNotificationUserId(userId);
      console.log('Setting pendingCouponNotificationUserId to:', userId);
    } else {
      setPendingCouponNotificationUserId(null);
      console.log('No available coupons, clearing pendingCouponNotificationUserId');
    }
  });

  const checkAndShowCouponNotification = checkAndShowCouponNotificationRef.current;

  // Função para re-buscar apenas as configurações — chamada após o admin salvar settings
  const fetchSettingsOnly = useCallback(async () => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    };
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const settingsMap = (data || []).reduce((acc: { [key: string]: string }, { key, value }: { key: string, value: string }) => {
        acc[key] = value;
        return acc;
      }, {});
      setAppSettings(settingsMap);
      console.log('fetchSettingsOnly: Settings re-loaded.', Object.keys(settingsMap).length, 'keys');
    } catch (err) {
      console.error('fetchSettingsOnly: Error:', err);
    }
  }, []);

  // Effect for initial app data fetching (settings, cities, hours)
  useEffect(() => {
    const fetchInitialAppData = async () => {
      console.log('fetchInitialAppData: Starting initial app data fetch.');
      setInitialAppDataLoading(true);

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      };

      const fetchWithTimeout = async (url: string, ms = 8000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), ms);
        try {
          const res = await fetch(url, { headers, signal: controller.signal });
          clearTimeout(id);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        } catch (err) {
          clearTimeout(id);
          throw err;
        }
      };

      try {
        console.log('fetchInitialAppData: Fetching all initial data in parallel...');
        const [settingsData, citiesData, hoursData] = await Promise.all([
          fetchWithTimeout(`${SUPABASE_URL}/rest/v1/settings?select=key,value`),
          fetchWithTimeout(`${SUPABASE_URL}/rest/v1/cities?select=*&order=name.asc`),
          fetchWithTimeout(`${SUPABASE_URL}/rest/v1/operating_hours?select=*`)
        ]);

        const settingsMap = (settingsData || []).reduce((acc: { [key: string]: string }, { key, value }: { key: string, value: string }) => {
          acc[key] = value;
          return acc;
        }, {});
        setAppSettings(settingsMap);
        console.log('fetchInitialAppData: Settings loaded.', Object.keys(settingsMap).length, 'keys');

        setCities(citiesData || []);
        console.log('fetchInitialAppData: Cities loaded.', citiesData?.length, 'cities');

        const fetchedOperatingHours: OperatingHour[] = hoursData || [];
        setOperatingHours(fetchedOperatingHours);
        console.log('fetchInitialAppData: Hours loaded.', fetchedOperatingHours.length, 'entries');

        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.toTimeString().slice(0, 5);
        const todayHours = fetchedOperatingHours.find(h => h.day_of_week === currentDay);

        let storeCurrentlyOpen = false;
        let canPreOrder = false;
        let showPreOrderModalOnLoad = false;
        let showPreOrderBannerOnLoad = false;

        if (todayHours && todayHours.is_open) {
          storeCurrentlyOpen = currentTime >= todayHours.open_time && currentTime < todayHours.close_time;
          canPreOrder = !storeCurrentlyOpen && currentTime >= '07:00' && currentTime <= '17:00';

          const todayDateString = now.toISOString().split('T')[0];
          const lastSeenPreOrderModalDate = localStorage.getItem('preOrderModalLastSeenDate');
          const hasSeenPreOrderModalToday = lastSeenPreOrderModalDate === todayDateString;

          if (canPreOrder && !hasSeenPreOrderModalToday) {
            showPreOrderModalOnLoad = true;
            localStorage.setItem('preOrderModalLastSeenDate', todayDateString);
          }
          if (canPreOrder) showPreOrderBannerOnLoad = true;
        }

        setIsStoreOpen(storeCurrentlyOpen);
        setCanPlaceOrder(storeCurrentlyOpen || canPreOrder);
        setShowPreOrderModal(showPreOrderModalOnLoad);
        setShowPreOrderBanner(showPreOrderBannerOnLoad);

        console.log('fetchInitialAppData: Store open:', storeCurrentlyOpen, '| Can pre-order:', canPreOrder);

      } catch (error: any) {
        console.error('fetchInitialAppData: Error fetching data:', error);
        toast.error('Erro ao carregar dados. Verifique sua conexão.');
      } finally {
        setInitialAppDataLoading(false);
        console.log('fetchInitialAppData: Initial app data fetch finished.');
      }
    };

    fetchInitialAppData();
  }, []); // Empty dependency array means this runs once on mount


  // Effect for Supabase Auth Session and User Profile
  useEffect(() => {
    let authSubscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;
    let lastProcessedUserId: string | null = null;
    let isMounted = true;

    const handleAuthChange = async (event: string, authSession?: any) => {
      if (!isMounted) return;
      console.log(`handleAuthChange: Event received: ${event}, lastProcessedUserId: ${lastProcessedUserId}`);

      if (event === 'SIGNED_OUT') {
        console.log('handleAuthChange: SIGNED_OUT event detected. Clearing all user-related states.');
        setSession(null);
        setUser(null);
        setCart([]);
        setSelectedCity('');
        setCurrentView('location');
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
        setAuthLoading(false);
        setIsMercadoPagoReturnFlow(false);
        localStorage.removeItem('isMercadoPagoReturnFlow');
        setIsPixReturnFlow(false);
        localStorage.removeItem('isPixReturnFlow');
        toast.success('Você foi desconectado.');
        lastProcessedUserId = null;
        return;
      }

      // Ignora TOKEN_REFRESHED - não precisa fazer nada
      if (event === 'TOKEN_REFRESHED') {
        console.log('handleAuthChange: Token refreshed, ignoring');
        return;
      }

      // Ignora SIGNED_IN duplicados ANTES de buscar sessão (mais eficiente)
      if (event === 'SIGNED_IN' && lastProcessedUserId !== null) {
        console.log(`handleAuthChange: SIGNED_IN ignored, user already processed (${lastProcessedUserId})`);
        return;
      }

      // Usa a sessão recebida no evento. Se for undefined (como no INITIAL_LOAD manual), busca a sessão
      let latestSession = authSession;
      if (authSession === undefined) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('handleAuthChange: Erro ao buscar sessão:', sessionError);
          if (isMounted) setAuthLoading(false);
          return;
        }
        latestSession = session;
      }

      if (!isMounted) return;

      console.log(`handleAuthChange: Processing event for user: ${latestSession?.user?.id}`);
      
      setSession(latestSession);

      if (latestSession?.user) {
        if (isMounted) setAuthLoading(true);
        // Dispara a busca do perfil sem fazer 'await' (isso evita o DEADLOCK do Supabase SDK)
        fetchUserProfile(latestSession.user).then((profile) => {
          if (!isMounted) return;
          
          setUser(profile);
          lastProcessedUserId = latestSession.user.id;
          console.log(`handleAuthChange: User processed and saved: ${lastProcessedUserId}`);

          if (profile && event === 'SIGNED_IN' && profile.role === 'customer') {
            const userName = latestSession.user.user_metadata.full_name || latestSession.user.email;
            if (userName) {
              // Fire and forget insert
              supabase.from('login_notifications').insert({
                user_id: latestSession.user.id,
                user_name: userName,
              }).then(() => {}); 
            }
            if (isMounted) checkAndShowCouponNotification(latestSession.user.id);
          }
          if (isMounted) setAuthLoading(false);
        }).catch(err => {
          console.error('Erro ao buscar perfil do usuário de forma assíncrona:', err);
          if (isMounted) setAuthLoading(false);
        });
      } else {
        if (isMounted) setUser(null);
        lastProcessedUserId = null;
        if (isMounted) setAuthLoading(false);
      }
    };

    // Configura o listener em tempo real para mudanças de forma síncrona
    authSubscription = supabase.auth.onAuthStateChange(handleAuthChange).data.subscription;
    console.log('useEffect: Auth state change listener set up.');

    // Busca a sessão inicial
    const initializeAuth = async () => {
      console.log('initializeAuth: Starting initial auth check.');
      try {
        await supabase.auth.getSession();
        await handleAuthChange('INITIAL_LOAD'); // Processa a sessão inicial
      } catch (error) {
        console.error('initializeAuth: Erro ao buscar a sessão inicial:', error);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (authSubscription) {
        console.log('Auth subscription unsubscribed.');
        authSubscription.unsubscribe();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refetchUser = useCallback(async () => {
    console.log('refetchUser: Called.');
    if (session?.user) {
      const profile = await fetchUserProfile(session.user);
      setUser(profile);
    }
  }, [session]);

  // Redireciona para a home se o usuário estiver logado e a view atual for auth
  useEffect(() => {
    console.log('useEffect [user, currentView]: User:', user ? user.name : 'null', 'CurrentView:', currentView);
    if (user && currentView === 'auth') {
      console.log('Redirecting from auth to home due to logged-in user.');
      setCurrentView('home');
    }
  }, [user, currentView]);

  const handleCitySelect = (cityName: string) => {
    console.log('handleCitySelect: Selected city:', cityName);
    const city = cities.find(c => c.name === cityName);
    if (city?.active) {
      setSelectedCity(cityName);

      // Sinaliza que o modal de promoção deve ser exibido ao carregar a HomePage
      localStorage.setItem('showPromotionModalOnLoad', 'true');

      // Atualiza o timestamp de acesso ao selecionar a cidade
      localStorage.setItem(LAST_ACCESS_KEY, Date.now().toString());

      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
      const todayHours = operatingHours.find(h => h.day_of_week === currentDay);

      let shouldShowPreOrderModal = false;
      if (todayHours && todayHours.is_open) {
        const isCurrentlyOpen = currentTime >= todayHours.open_time && currentTime < todayHours.close_time;
        // Show pre-order modal if:
        // 1. Store is open today
        // 2. Store is NOT currently open
        // 3. Current time is between 07:00 and 17:00
        if (todayHours.is_open && !isCurrentlyOpen && currentTime >= '07:00' && currentTime <= '17:00') {
          shouldShowPreOrderModal = true;
        }
      }

      setCurrentView('home'); // Always go to home
      setShowPreOrderModal(shouldShowPreOrderModal); // Show modal based on conditions
    }
  };

  const handleAdminAccess = () => {
    console.log('handleAdminAccess: Called. User:', user ? user.name : 'null');
    if (!user) {
      setCurrentView('auth');
      toast('Faça login para acessar o painel administrativo.');
    } else if (user.role === 'admin') {
      setShowProfile(false); // Fecha o modal de perfil
      setCurrentView('admin');
    } else {
      toast.error('Você não tem permissão para acessar o painel administrativo.');
    }
  };

  const handleLogout = async () => {
    console.log('handleLogout: Called.');
    setShowProfile(false); // Fecha o modal de perfil imediatamente

    const { error } = await supabase.auth.signOut();

    // If there's an error (like AuthSessionMissingError), it often means the session is already invalid.
    // In this case, the 'SIGNED_OUT' event might not fire.
    // We'll perform a manual cleanup on the client-side as a robust fallback.
    if (error) {
      console.error('handleLogout: Error during signOut, performing manual client-side cleanup:', error);

      // Manually clear all user-related states
      setSession(null);
      setUser(null);
      setCart([]);
      // Don't clear selectedCity, let the user stay on the current menu
      setCurrentView('home');
      setPendingCouponNotificationUserId(null);
      setShowUserCouponNotification(false);
      setIsMercadoPagoReturnFlow(false); // Clear Mercado Pago flag on manual logout
      localStorage.removeItem('isMercadoPagoReturnFlow');
      setIsPixReturnFlow(false); // Clear PIX flag on manual logout
      localStorage.removeItem('isPixReturnFlow');

      toast.success('Você foi desconectado.'); // Still inform the user of success
      return; // Exit after manual cleanup
    }

    // If signOut is successful, the onAuthStateChange listener will handle the state cleanup and show the success toast.
    console.log('handleLogout: signOut initiated successfully. State cleanup will be handled by onAuthStateChange.');
  };

  const handleProfileClick = () => {
    if (user) {
      setShowProfile(true);
    } else {
      setCurrentView('auth');
    }
  };

  // Função onLogin que faltava
  const handleLogin = () => {
    setCurrentView('auth');
  };

  const addToCart = (product: Product, quantity: number = 1, observations?: string) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id);

      if (existingItemIndex > -1) {
        // Atualiza item existente
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity,
          observations: observations // Mantém ou atualiza observações
        };
        return updatedCart;
      } else {
        // Adiciona novo item
        return [...prevCart, { product, quantity, observations }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateCartItem = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const handleViewOrder = (order: Order) => {
    setCurrentOrder(order);
    setShowProfile(false);
    setCurrentView('tracking');
    setIsMercadoPagoReturnFlow(false); // Clear Mercado Pago flag when viewing order tracking
    localStorage.removeItem('isMercadoPagoReturnFlow');
    setIsPixReturnFlow(false); // Clear PIX flag when viewing order tracking
    localStorage.removeItem('isPixReturnFlow');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  const logoUrl = appSettings.app_logo_url || 'public/assets/logo.png';
  const heroImageUrl = appSettings.hero_image_url || 'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

  // Tema Dia dos Namorados — ativado/desativado unicamente pelo toggle do admin
  const isValentineThemeActive = appSettings.valentine_theme_active === 'true';
  console.log('[ValentineTheme] isValentineThemeActive:', isValentineThemeActive, '| raw value:', appSettings.valentine_theme_active, '| all settings keys:', Object.keys(appSettings));

  const handleTriggerValentine = () => {
    if (isValentineThemeActive) {
      setValentineTriggerKey(prev => prev + 1);
    }
  };

  // Novas props para o título e subtítulo do hero
  const heroTitleText = appSettings.hero_title_text || '';
  const heroTitleFontSize = appSettings.hero_title_font_size || '48px';
  const heroTitleFontColor = appSettings.hero_title_font_color || '#ffffff';
  const heroTitleBorderColor = appSettings.hero_title_border_color || '#000000';

  const heroSubtitleText = appSettings.hero_subtitle_text || '';
  const heroSubtitleFontSize = appSettings.hero_subtitle_font_size || '20px';
  const heroSubtitleFontColor = appSettings.hero_subtitle_font_color || '#ffffff';
  const heroSubtitleBorderColor = appSettings.hero_subtitle_border_color || '#000000';
  
  const heroTextBackgroundEnabled = appSettings.hero_text_background_enabled !== 'false'; // Nova configuração

  // Nova configuração para colunas do menu mobile
  const menuMobileColumns = appSettings.menu_mobile_columns || '1';

  const renderContent = () => {
    if (currentView === 'location') {
      return <LocationSelect cities={cities} onCitySelect={handleCitySelect} logoUrl={logoUrl} />;
    }
    if (currentView === 'admin') {
      // Only render AdminPanel if user is an admin, otherwise redirect to home
      if (user?.role === 'admin') {
        return <AdminPanel onBack={() => setCurrentView('home')} onUserUpdate={refetchUser} onSettingsSaved={fetchSettingsOnly} />;
      } else {
        // If somehow currentView is 'admin' but user is not admin, redirect to home
        setCurrentView('home');
        toast.error('Acesso negado ao painel administrativo.');
        return null; // Or a loading state, but redirecting is better
      }
    }
    if (currentView === 'auth') {
      return <UserAuth onBack={() => setCurrentView('home')} onGoToMenu={() => setCurrentView('home')} onAdminAccess={handleAdminAccess} />;
    }
    if (currentView === 'tracking' && currentOrder) {
      return <OrderTracking order={currentOrder} onBack={() => setCurrentView('home')} />;
    }
    return (
      <HomePage
        key={user?.id || 'guest'} // Adicionando key para forçar remontagem no login/logout
        selectedCity={selectedCity}
        user={user}
        cart={cart}
        onAddToCart={addToCart}
        onRemoveFromCart={removeFromCart}
        onUpdateCartItem={updateCartItem}
        onLogin={handleLogin} // Usando a função definida
        onOrderCreated={(order) => {
          setCart([]);
          setCurrentOrder(order);
          setCurrentView('tracking'); // <--- Adicionado esta linha para mudar a view
          setIsMercadoPagoReturnFlow(false); // Clear Mercado Pago flag on order creation
          localStorage.removeItem('isMercadoPagoReturnFlow');
          setIsPixReturnFlow(false); // Clear PIX flag on order creation
          localStorage.removeItem('isPixReturnFlow');
        }}
        onBackToLocationSelect={() => setCurrentView('location')}
        onProfileClick={handleProfileClick} // Passando a função definida
        logoUrl={logoUrl}
        heroImageUrl={heroImageUrl}
        isStoreOpen={isStoreOpen}
        canPlaceOrder={canPlaceOrder} // Passando o novo estado
        pendingCouponNotificationUserId={pendingCouponNotificationUserId}
        setPendingCouponNotificationUserId={setPendingCouponNotificationUserId}
        setShowUserCouponNotification={setShowUserCouponNotification}
        // Passando as novas props
        heroTitleText={heroTitleText}
        heroTitleFontSize={heroTitleFontSize}
        heroTitleFontColor={heroTitleFontColor}
        heroTitleBorderColor={heroTitleBorderColor}
        heroSubtitleText={heroSubtitleText}
        heroSubtitleFontSize={heroSubtitleFontSize}
        heroSubtitleFontColor={heroSubtitleFontColor}
        heroSubtitleBorderColor={heroSubtitleBorderColor}
        heroTextBackgroundEnabled={heroTextBackgroundEnabled} // Nova prop
        showPreOrderModal={showPreOrderModal} // Nova prop
        setShowPreOrderModal={setShowPreOrderModal} // Nova prop
        showPreOrderBanner={showPreOrderBanner} // Nova prop
        isMercadoPagoReturnFlow={isMercadoPagoReturnFlow} // Passando a nova prop
        isPixReturnFlow={isPixReturnFlow} // Passando a nova prop
        setIsPixReturnFlow={setIsPixReturnFlow} // Passando a nova prop
        menuMobileColumns={menuMobileColumns} // Nova prop para controlar colunas no mobile
        onTriggerValentine={handleTriggerValentine}
        isValentineThemeActive={isValentineThemeActive}
      />
    );
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {renderContent()}
        {showProfile && user && (
          <UserProfile
            user={user}
            onClose={() => setShowProfile(false)}
            onLogout={handleLogout}
            onViewOrder={handleViewOrder}
            onUserUpdate={refetchUser}
            onAdminAccess={handleAdminAccess} // Passando a função de acesso ao painel
          />
        )}
        <Toaster />
        <audio id="login-sound" src="/assets/login-sound.mp3" preload="auto" />
        {showUserCouponNotification && (
          <UserCouponNotification onClose={() => setShowUserCouponNotification(false)} />
        )}
        <CookieBanner />
        {/* Overlay do Tema Dia dos Namorados — Apenas no cardápio e quando ativado por clique */}
        {isValentineThemeActive && currentView === 'home' && valentineTriggerKey > 0 && (
          <ValentineTheme key={valentineTriggerKey} />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;