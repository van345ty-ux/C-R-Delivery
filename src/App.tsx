import { useState, useEffect, useCallback } from 'react';
import { LocationSelect } from './components/LocationSelect';
import { HomePage } from './components/HomePage';
import { AdminPanel } from './components/AdminPanel';
import { UserAuth } from './components/UserAuth';
import { OrderTracking } from './components/OrderTracking';
import { UserProfile } from './components/UserProfile';
import { UserCouponNotification } from './components/UserCouponNotification';
import { supabase } from './integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import { User, Coupon, Product, CartItem, Order, City, OperatingHour } from './types'; // Importando tipos de types.ts
import { SnowEffect } from './components/SnowEffect';
import { ChristmasLights } from './components/FestiveDecorations';

const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  console.log('fetchUserProfile: Attempting to fetch profile for user ID:', supabaseUser.id);
  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', supabaseUser.id)
    .single();

  if (error && error.code === 'PGRST116') {
    console.log('fetchUserProfile: Profile not found, attempting to create it.');
    // Profile not found, create it
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: supabaseUser.id,
        full_name: supabaseUser.user_metadata.full_name,
        phone: supabaseUser.user_metadata.phone,
        birth_date: supabaseUser.user_metadata.birth_date,
        role: 'customer',
      })
      .select()
      .single();

    if (insertError) {
      console.error('fetchUserProfile: Error creating profile on-the-fly:', insertError);
      return null; // Retorna null se a criação do perfil falhar
    }
    console.log('fetchUserProfile: Profile created successfully.');
    data = newProfile;
  } else if (error) {
    console.error('fetchUserProfile: Error fetching profile:', error);
    return null;
  }

  if (data) {
    console.log('fetchUserProfile: Profile data retrieved:', data);
    return {
      id: data.id,
      name: data.full_name,
      email: supabaseUser.email!,
      phone: data.phone,
      birthDate: data.birth_date,
      purchaseCount: data.purchase_count || 0,
      role: data.role || 'customer',
    };
  }
  console.log('fetchUserProfile: No profile data found or created, returning null.');
  return null;
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
  const [showProfile, setShowProfile] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [appSettings, setAppSettings] = useState<{ [key: string]: string }>({});
  const [initialAppDataLoading, setInitialAppDataLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
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

  // O aplicativo só para de carregar quando os dados iniciais E a autenticação estiverem prontos
  const isLoading = initialAppDataLoading || authLoading;
  console.log('App: isLoading:', isLoading, 'initialAppDataLoading:', initialAppDataLoading, 'authLoading:', authLoading);

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

  // EFEITO REFORÇADO: Atualiza o timestamp de último acesso e força o recarregamento se necessário
  useEffect(() => {
    // Atualiza o timestamp sempre que o app estiver ativo e não carregando
    if (typeof window !== 'undefined' && !isLoading) {
      localStorage.setItem(LAST_ACCESS_KEY, Date.now().toString());
      console.log('App: Updated last access timestamp.');
    }

    // Lógica para forçar o recarregamento
    // Lógica para forçar o recarregamento sempre que a aba ficar visível
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App: Tab became visible. Forcing reload.');
        window.location.reload();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('App: Page restored from BFCache/Suspension. Forcing reload.');
        window.location.reload();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isLoading]); // Depende de isLoading para garantir que só rode após o carregamento inicial

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

  const checkAndShowCouponNotification = useCallback(async (userId: string) => {
    console.log('checkAndShowCouponNotification called for userId:', userId);

    const { data: couponsData, error: couponsError } = await supabase
      .from('coupons')
      .select('*') // Select all fields to perform full validity check
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('active', true)
      .eq('is_pending_admin_approval', false);

    if (couponsError) {
      console.error('Error fetching coupons for notification:', couponsError);
      setPendingCouponNotificationUserId(null); // Clear if error
      return;
    }

    const today = new Date();
    const hasAvailableCoupons = (couponsData || []).filter((coupon: Coupon) => {
      const validFrom = new Date(coupon.valid_from);
      const validTo = new Date(coupon.valid_to);
      validTo.setHours(23, 59, 59, 999); // Considerar o dia inteiro

      const isCurrentlyValid = today >= validFrom && today <= validTo;
      // Fix: Check if usage_limit is defined before comparing
      const hasUsagesLeft = coupon.usage_limit === null || coupon.usage_limit === undefined || coupon.usage_count < coupon.usage_limit;

      // Validação adicional: cupons de aniversário e fidelidade DEVEM ser específicos do usuário
      if ((coupon.type === 'birthday' || coupon.type === 'loyalty') && !coupon.user_id) {
        return false;
      }
      return isCurrentlyValid && hasUsagesLeft;
    }).length > 0;
    console.log('hasAvailableCoupons:', hasAvailableCoupons);

    if (hasAvailableCoupons) {
      setPendingCouponNotificationUserId(userId); // Define o estado pendente
      console.log('Setting pendingCouponNotificationUserId to:', userId);
    } else {
      setPendingCouponNotificationUserId(null); // Clear if no coupons are available
      console.log('No available coupons, clearing pendingCouponNotificationUserId');
    }
  }, []);

  // Effect for initial app data fetching (settings, cities, hours)
  useEffect(() => {
    const fetchInitialAppData = async () => {
      console.log('fetchInitialAppData: Starting initial app data fetch.');
      setInitialAppDataLoading(true); // Inicia o carregamento de dados iniciais
      try {
        const settingsPromise = supabase.from('settings').select('key, value');
        const citiesPromise = supabase.from('cities').select('*').order('name', { ascending: true });
        const hoursPromise = supabase.from('operating_hours').select('*');

        const [settingsResult, citiesResult, hoursResult] = await Promise.all([settingsPromise, citiesPromise, hoursPromise]);

        if (settingsResult.error) {
          toast.error('Erro ao carregar configurações: ' + settingsResult.error.message);
          console.error('fetchInitialAppData: Settings error:', settingsResult.error);
        } else if (settingsResult.data) {
          const settingsMap = settingsResult.data.reduce((acc: { [key: string]: string }, { key, value }: { key: string, value: string }) => {
            acc[key] = value;
            return acc;
          }, {} as { [key: string]: string });
          setAppSettings(settingsMap);
          console.log('fetchInitialAppData: Settings loaded.');
        }

        if (citiesResult.error) {
          toast.error('Erro ao carregar cidades: ' + citiesResult.error.message);
          console.error('fetchInitialAppData: Cities error:', citiesResult.error);
        } else {
          setCities(citiesResult.data || []);
          console.log('fetchInitialAppData: Cities loaded.');
        }

        if (hoursResult.error) {
          toast.error('Erro ao verificar horário de funcionamento: ' + hoursResult.error.message);
          console.error('fetchInitialAppData: Operating hours error:', hoursResult.error);
        } else if (hoursResult.data) {
          const fetchedOperatingHours: OperatingHour[] = hoursResult.data;
          setOperatingHours(fetchedOperatingHours); // Store operating hours in state

          const now = new Date();
          const currentDay = now.getDay();
          const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

          console.log('--- Time and Operating Hours Debug ---');
          console.log('Current Date/Time:', now.toLocaleString());
          console.log('Current Day of Week (0=Sunday, 6=Saturday):', currentDay);
          console.log('Current Time (HH:MM):', currentTime);
          console.log('Fetched Operating Hours:', fetchedOperatingHours);

          const todayHours = fetchedOperatingHours.find(h => h.day_of_week === currentDay);
          console.log('Today\'s Operating Hours:', todayHours);

          let storeCurrentlyOpen = false;
          let canPreOrder = false;
          let showPreOrderModalOnLoad = false;
          let showPreOrderBannerOnLoad = false;

          if (todayHours && todayHours.is_open) {
            storeCurrentlyOpen = currentTime >= todayHours.open_time && currentTime < todayHours.close_time;

            // Logic for pre-order: store is open today, but not currently open, and it's between 07:00 and 17:00
            canPreOrder = !storeCurrentlyOpen && currentTime >= '07:00' && currentTime <= '17:00'; // MODIFIED HERE

            // Show pre-order modal if conditions met and not yet seen today
            const todayDateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const lastSeenPreOrderModalDate = localStorage.getItem('preOrderModalLastSeenDate');
            const hasSeenPreOrderModalToday = lastSeenPreOrderModalDate === todayDateString;

            if (canPreOrder && !hasSeenPreOrderModalToday) {
              showPreOrderModalOnLoad = true;
              localStorage.setItem('preOrderModalLastSeenDate', todayDateString); // Mark as seen for today
            }

            // Show pre-order banner if conditions met
            if (canPreOrder) {
              showPreOrderBannerOnLoad = true;
            }

          } else {
            // Store is closed all day
            storeCurrentlyOpen = false;
            canPreOrder = false;
            showPreOrderModalOnLoad = false;
            showPreOrderBannerOnLoad = false;
          }

          setIsStoreOpen(storeCurrentlyOpen);
          setCanPlaceOrder(storeCurrentlyOpen || canPreOrder); // Pode fazer pedido se aberto ou em pré-pedido
          setShowPreOrderModal(showPreOrderModalOnLoad);
          setShowPreOrderBanner(showPreOrderBannerOnLoad);

          console.log('Calculated storeCurrentlyOpen:', storeCurrentlyOpen);
          console.log('Calculated canPreOrder:', canPreOrder);
          console.log('Final canPlaceOrder:', storeCurrentlyOpen || canPreOrder);
          console.log('--- End Time and Operating Hours Debug ---');

        }
      } catch (error: any) { // Explicitly type error as any to access message
        console.error("fetchInitialAppData: Critical error during initial app data fetching:", error);
        toast.error("Falha crítica ao carregar dados iniciais do aplicativo: " + (error.message || "Erro desconhecido"));
      } finally {
        setInitialAppDataLoading(false); // Finaliza o carregamento de dados iniciais
        console.log('fetchInitialAppData: Initial app data fetch finished.');
      }
    };

    fetchInitialAppData();
  }, []); // Empty dependency array means this runs once on mount

  // Effect for Supabase Auth Session and User Profile
  useEffect(() => {
    let authSubscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'];

    const handleAuthChange = async (event: string, sessionFromEvent: Session | null) => {
      console.log(`handleAuthChange: Event received: ${event}, sessionFromEvent: ${sessionFromEvent ? 'active' : 'null'}`);

      if (event === 'SIGNED_OUT') {
        console.log('handleAuthChange: SIGNED_OUT event detected. Clearing all user-related states.');
        setSession(null);
        setUser(null);
        setCart([]);
        setSelectedCity('');
        setCurrentView('location'); // Reset to location on logout
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
        setAuthLoading(false);
        setIsMercadoPagoReturnFlow(false); // Clear Mercado Pago flag on logout
        localStorage.removeItem('isMercadoPagoReturnFlow');
        setIsPixReturnFlow(false); // Clear PIX flag on logout
        localStorage.removeItem('isPixReturnFlow');
        toast.success('Você foi desconectado.');
        return; // IMPORTANT: Exit immediately after handling SIGNED_OUT
      }

      // For other events (SIGNED_IN, USER_UPDATED, etc.), get the latest session
      const { data: { session: latestSession }, error: sessionError } = await supabase.auth.getSession();
      console.log(`handleAuthChange: Latest session from getSession() after event: ${latestSession ? 'active' : 'null'}`);

      if (sessionError) {
        console.error('handleAuthChange: Erro ao buscar a sessão mais recente em onAuthStateChange:', sessionError);
        // Trata qualquer erro de sessão como um sinal para limpar o estado do usuário
        setSession(null);
        setUser(null);
        setCart([]);
        setSelectedCity('');
        setCurrentView('location'); // Reset to location on session error
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
        setAuthLoading(false);
        setIsMercadoPagoReturnFlow(false); // Clear Mercado Pago flag on session error
        localStorage.removeItem('isMercadoPagoReturnFlow');
        setIsPixReturnFlow(false); // Clear PIX flag on session error
        localStorage.removeItem('isPixReturnFlow');
        toast.error('Erro na sessão. Por favor, faça login novamente.');
        return;
      }

      setSession(latestSession);

      if (latestSession?.user) {
        console.log('handleAuthChange: User is active. Fetching profile.');
        const profile = await fetchUserProfile(latestSession.user);
        setUser(profile);

        if (profile) {
          console.log('handleAuthChange: Profile fetched/created successfully.');
          if (event === 'SIGNED_IN' && profile.role === 'customer') {
            const userName = latestSession.user.user_metadata.full_name || latestSession.user.email;
            if (userName) {
              const { error } = await supabase.from('login_notifications').insert({
                user_id: latestSession.user.id,
                user_name: userName,
              });
              if (error) {
                console.error('handleAuthChange: Error creating login notification:', error);
              } else {
                console.log('handleAuthChange: Login notification created.');
              }
            }
            checkAndShowCouponNotification(latestSession.user.id);
          }
        } else {
          console.log('handleAuthChange: Profile could not be fetched/created, treating as no valid user.');
          setSession(null);
          setUser(null);
          setCart([]);
          setSelectedCity('');
          setCurrentView('location'); // Reset to location if profile fails
          setPendingCouponNotificationUserId(null);
          setShowUserCouponNotification(false);
          setIsMercadoPagoReturnFlow(false); // Clear Mercado Pago flag if profile fails
          localStorage.removeItem('isMercadoPagoReturnFlow');
          setIsPixReturnFlow(false); // Clear PIX flag if profile fails
          localStorage.removeItem('isPixReturnFlow');
          toast.error('Não foi possível carregar seu perfil. Por favor, tente fazer login novamente.');
        }
      } else { // No user in latestSession, and not a SIGNED_OUT event (already handled above)
        console.log('handleAuthChange: No active user session found (after getSession). Clearing user-related states.');
        setUser(null);
        // Do not clear cart or city on session expiration, allow guest checkout
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
        setIsMercadoPagoReturnFlow(false); // Clear Mercado Pago flag if no user session
        localStorage.removeItem('isMercadoPagoReturnFlow');
        setIsPixReturnFlow(false); // Clear PIX flag if no user session
        localStorage.removeItem('isPixReturnFlow');
      }
      setAuthLoading(false);
      console.log('handleAuthChange: Auth change processing finished.');
    };

    // Busca a sessão inicial e então configura o listener
    const initializeAuth = async () => {
      console.log('initializeAuth: Starting initial auth check.');
      setAuthLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        await handleAuthChange('INITIAL_LOAD', initialSession); // Processa a sessão inicial
      } catch (error) {
        console.error('initializeAuth: Erro ao buscar a sessão inicial:', error);
        // Mesmo que haja um erro, precisamos parar o carregamento
        setAuthLoading(false);
      }

      // Configura o listener em tempo real para mudanças subsequentes
      authSubscription = supabase.auth.onAuthStateChange(handleAuthChange).data.subscription;
      console.log('initializeAuth: Auth state change listener set up.');
    };

    initializeAuth();

    return () => {
      if (authSubscription) {
        console.log('Auth subscription unsubscribed.');
        authSubscription.unsubscribe();
      }
    };
  }, [checkAndShowCouponNotification]); // Dependência de checkAndShowCouponNotification

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

  // Novas props para o título e subtítulo do hero
  const heroTitleText = appSettings.hero_title_text || '';
  const heroTitleFontSize = appSettings.hero_title_font_size || '48px';
  const heroTitleFontColor = appSettings.hero_title_font_color || '#ffffff';
  const heroTitleBorderColor = appSettings.hero_title_border_color || '#000000';

  const heroSubtitleText = appSettings.hero_subtitle_text || '';
  const heroSubtitleFontSize = appSettings.hero_subtitle_font_size || '20px';
  const heroSubtitleFontColor = appSettings.hero_subtitle_font_color || '#ffffff';
  const heroSubtitleBorderColor = appSettings.hero_subtitle_border_color || '#000000';
  const isFestiveMode = appSettings.is_festive_mode_enabled === 'true';

  const renderContent = () => {
    if (currentView === 'location') {
      return <LocationSelect cities={cities} onCitySelect={handleCitySelect} logoUrl={logoUrl} />;
    }
    if (currentView === 'admin') {
      // Only render AdminPanel if user is an admin, otherwise redirect to home
      if (user?.role === 'admin') {
        return <AdminPanel key={currentView + (user?.id || '')} onBack={() => setCurrentView('home')} onUserUpdate={refetchUser} />;
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
        showPreOrderModal={showPreOrderModal} // Nova prop
        setShowPreOrderModal={setShowPreOrderModal} // Nova prop
        showPreOrderBanner={showPreOrderBanner} // Nova prop
        isMercadoPagoReturnFlow={isMercadoPagoReturnFlow} // Passando a nova prop
        isPixReturnFlow={isPixReturnFlow} // Passando a nova prop
        setIsPixReturnFlow={setIsPixReturnFlow} // Passando a nova prop
        isFestiveMode={isFestiveMode} // Passando modo festivo
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isFestiveMode && (
        <>
          <SnowEffect />
          <ChristmasLights />
        </>
      )}
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
    </div>
  );
}

export default App;