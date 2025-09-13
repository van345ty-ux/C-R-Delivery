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

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  purchaseCount: number;
  role: 'customer' | 'admin';
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: 'birthday' | 'loyalty' | 'promotion';
  valid_from: string;
  valid_to: string;
  active: boolean;
  usage_limit?: number;
  usage_count: number;
  user_id?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  badge_text?: string | null;
  image: string;
  description: string;
  category: string;
  available: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  observations?: string;
}

export interface Order {
  id: string;
  orderNumber: number; // Nova propriedade para o número sequencial do pedido
  items: CartItem[];
  total: number;
  deliveryFee: number;
  deliveryType: 'delivery' | 'pickup';
  paymentMethod: 'pix' | 'card' | 'cash';
  address?: string;
  status: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  couponUsed?: string;
}

export interface City {
  id: string;
  name: string;
  active: boolean;
}

export interface OperatingHour {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export interface Highlight {
  id: string;
  name: string;
  price: number;
  image_url: string;
  border_color: string;
  order_index: number;
  shadow_size: number;
}

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


function App() {
  const [currentView, setCurrentView] = useState<'location' | 'home' | 'admin' | 'auth' | 'tracking'>('location');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [appSettings, setAppSettings] = useState<{ [key: string]: string }>({});
  const [initialAppDataLoading, setInitialAppDataLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [showUserCouponNotification, setShowUserCouponNotification] = useState(false);
  const [pendingCouponNotificationUserId, setPendingCouponNotificationUserId] = useState<string | null>(null);

  // Debugging logs for App state
  useEffect(() => {
    console.log('App State - pendingCouponNotificationUserId:', pendingCouponNotificationUserId);
    console.log('App State - showUserCouponNotification:', showUserCouponNotification);
    console.log('App State - user:', user ? user.name : 'null');
    console.log('App State - session:', session ? 'active' : 'null');
    console.log('App State - currentView:', currentView);
  }, [pendingCouponNotificationUserId, showUserCouponNotification, user, session, currentView]);

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
      const hasUsagesLeft = coupon.usage_limit === null || coupon.usage_count < coupon.usage_limit;

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
          toast.error('Erro ao carregar configurações.');
          console.error('fetchInitialAppData: Settings error:', settingsResult.error);
        } else if (settingsResult.data) {
          const settingsMap = settingsResult.data.reduce((acc, { key, value }) => {
            acc[key] = value;
            return acc;
          }, {} as { [key: string]: string });
          setAppSettings(settingsMap);
          console.log('fetchInitialAppData: Settings loaded.');
        }

        if (citiesResult.error) {
          toast.error('Erro ao carregar cidades.');
          console.error('fetchInitialAppData: Cities error:', citiesResult.error);
        } else {
          setCities(citiesResult.data || []);
          console.log('fetchInitialAppData: Cities loaded.');
        }

        if (hoursResult.error) {
          toast.error('Erro ao verificar horário de funcionamento.');
          console.error('fetchInitialAppData: Operating hours error:', hoursResult.error);
        } else if (hoursResult.data) {
          const operatingHours: OperatingHour[] = hoursResult.data;
          const now = new Date();
          const currentDay = now.getDay();
          const currentTime = now.toTimeString().slice(0, 5);

          const todayHours = operatingHours.find(h => h.day_of_week === currentDay);

          if (todayHours && todayHours.is_open && todayHours.open_time && todayHours.close_time) {
            setIsStoreOpen(currentTime >= todayHours.open_time && currentTime < todayHours.close_time);
            console.log(`fetchInitialAppData: Store open status: ${currentTime >= todayHours.open_time && currentTime < todayHours.close_time}`);
          } else {
            setIsStoreOpen(false);
            console.log('fetchInitialAppData: Store is closed.');
          }
        }
      } catch (error) {
        console.error("fetchInitialAppData: Critical error during initial app data fetching:", error);
        toast.error("Falha crítica ao carregar dados iniciais do aplicativo.");
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
        setCurrentView('location');
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
        setAuthLoading(false);
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
        setCurrentView('location');
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
        setAuthLoading(false);
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
          setCurrentView('location');
          setPendingCouponNotificationUserId(null);
          setShowUserCouponNotification(false);
          toast.error('Não foi possível carregar seu perfil. Por favor, tente fazer login novamente.');
        }
      } else { // No user in latestSession, and not a SIGNED_OUT event (already handled above)
        console.log('handleAuthChange: No active user session found (after getSession). Clearing user-related states.');
        setUser(null);
        setCart([]);
        setSelectedCity('');
        setCurrentView('location');
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
        // No toast here, as it's not an explicit logout, but an implicit session invalidation.
        // If it was an explicit signOut, the toast was already shown by the SIGNED_OUT branch.
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

    // Listener para refrescar a sessão quando a aba se torna visível
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('App: Tab became visible. Refreshing Supabase session.');
        // Isso irá disparar onAuthStateChange se a sessão tiver mudado
        await supabase.auth.getSession(); 
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (authSubscription) {
        console.log('Auth subscription unsubscribed.');
        authSubscription.unsubscribe();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      setCurrentView('home');
    }
  };

  const handleAdminAccess = () => {
    console.log('handleAdminAccess: Called. User:', user ? user.name : 'null');
    if (!user) {
      setCurrentView('auth');
      toast('Faça login para acessar o painel administrativo.');
    } else if (user.role === 'admin') {
      setCurrentView('admin');
    } else {
      toast.error('Você não tem permissão para acessar o painel administrativo.');
    }
  };

  const handleLogout = async () => {
    console.log('handleLogout: Called.');
    setShowProfile(false); // Fecha o modal de perfil imediatamente

    try {
      const { error } = await supabase.auth.signOut();
      console.log('handleLogout: supabase.auth.signOut() promise resolved.'); // Adicionado log aqui

      if (error) {
        console.error('handleLogout: Error during signOut:', error);
        toast.error('Erro ao sair: ' + error.message);
      } else {
        // O toast de sucesso e a limpeza de estado serão tratados pelo handleAuthChange
        console.log('handleLogout: signOut initiated. State cleanup will be handled by onAuthStateChange.');
      }
    } catch (e) {
      console.error('handleLogout: Unexpected error during signOut:', e);
      toast.error('Ocorreu um erro inesperado ao sair.');
    }
  };

  const addToCart = (product: Product, quantity: number = 1, observations?: string) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity, observations }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity, observations }]);
    }
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
  };

  // O aplicativo só para de carregar quando os dados iniciais E a autenticação estiverem prontos
  const isLoading = initialAppDataLoading || authLoading;
  console.log('App: isLoading:', isLoading, 'initialAppDataLoading:', initialAppDataLoading, 'authLoading:', authLoading);

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
  const heroTitleText = appSettings.hero_title_text || 'C&R Sushi';
  const heroTitleFontSize = appSettings.hero_title_font_size || '48px';
  const heroTitleFontColor = appSettings.hero_title_font_color || '#ffffff';
  const heroTitleBorderColor = appSettings.hero_title_border_color || '#000000';

  const heroSubtitleText = appSettings.hero_subtitle_text || 'A Experiência Japonesa Autêntica na Sua Casa';
  const heroSubtitleFontSize = appSettings.hero_subtitle_font_size || '20px';
  const heroSubtitleFontColor = appSettings.hero_subtitle_font_color || '#ffffff';
  const heroSubtitleBorderColor = appSettings.hero_subtitle_border_color || '#000000';

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
      return <UserAuth onBack={() => setCurrentView('home')} onGoToMenu={() => setCurrentView('home')} />;
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
        onLogin={() => setCurrentView('auth')}
        onAdminAccess={handleAdminAccess}
        onOrderCreated={(order) => {
          setCart([]);
          setCurrentOrder(order);
        }}
        onBackToLocationSelect={() => setCurrentView('location')}
        onProfileClick={() => setShowProfile(true)}
        logoUrl={logoUrl}
        heroImageUrl={heroImageUrl} 
        isStoreOpen={isStoreOpen}
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
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderContent()}
      {showProfile && user && (
        <UserProfile 
          user={user}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
          onViewOrder={handleViewOrder}
          onUserUpdate={refetchUser} // Passando a função refetchUser aqui
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