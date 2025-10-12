import { useState, useEffect, useCallback } from 'react';
import { LocationSelect } from './components/LocationSelect';
import { HomePage } from './components/HomePage';
import { AdminPanel } from './components/AdminPanel';
import { UserAuth } from './components/UserAuth';
import { OrderTracking } from './components/OrderTracking';
import { UserProfile } from './components/UserProfile';
import { UserCouponNotification } from './components/UserCouponNotification';
import { Toaster } from 'react-hot-toast';
import { supabase } from './integrations/supabase/client';

// Importar tipos do arquivo centralizado
import { Order, City } from './types';

// Importar hooks
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useCart } from './hooks/useCart';
import { useStoreStatus } from './hooks/useStoreStatus';
import { useMercadoPagoReturnFlow } from './hooks/useMercadoPagoReturnFlow';

function App() {
  // Sempre iniciar na tela de seleção de cidade
  const [currentView, setCurrentView] = useState<'location' | 'home' | 'admin' | 'auth' | 'tracking'>('location');
  // Sempre iniciar sem uma cidade selecionada
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  // Hooks
  const { clearMercadoPagoFlags, ...mercadoPagoFlow } = useMercadoPagoReturnFlow();
  const { cart, addToCart, removeFromCart, updateCartItem, clearCart } = useCart();
  
  const onLogoutAppCallback = useCallback(() => {
    clearCart(); 
    setSelectedCity('');
    setCurrentView('location');
    clearMercadoPagoFlags();
  }, [clearCart, clearMercadoPagoFlags]);

  const { user, authLoading, refetchUser, logout, pendingCouponNotificationUserId, setPendingCouponNotificationUserId, showUserCouponNotification, setShowUserCouponNotification } = useAuth(onLogoutAppCallback);
  const { cities, appSettings, operatingHours, initialAppDataLoading, fetchInitialAppData } = useAppData();
  const { isStoreOpen, canPlaceOrder, showPreOrderModal, setShowPreOrderModal, showPreOrderBanner, updateStoreStatus } = useStoreStatus(operatingHours);

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

  // Listener para refrescar a sessão e a página quando a aba se torna visível
  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;

    console.log('App: Tab became visible. Refreshing app data and auth session in background.');
    await fetchInitialAppData(true); // Chama a atualização em segundo plano
    await supabase.auth.getSession();
    
    const mpReturnFlow = JSON.parse(localStorage.getItem('isMercadoPagoReturnFlow') || 'false');
    if (mpReturnFlow !== mercadoPagoFlow.isMercadoPagoReturnFlow) {
      mercadoPagoFlow.setIsMercadoPagoReturnFlow(mpReturnFlow);
    }
  }, [fetchInitialAppData, mercadoPagoFlow]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  // Redireciona para a home se o usuário estiver logado e a view atual for auth
  useEffect(() => {
    if (user && currentView === 'auth') {
      setCurrentView('home');
    }
  }, [user, currentView]);

  // Efeito para lidar com o retorno do Mercado Pago/Pix
  useEffect(() => {
    if (!initialAppDataLoading && !authLoading && mercadoPagoFlow.isMercadoPagoReturnFlow) {
      if (currentView !== 'home') {
        setCurrentView('home');
      }
      if (!selectedCity && cities.length > 0) {
        const firstActiveCity = cities.find(city => city.active);
        if (firstActiveCity) {
          setSelectedCity(firstActiveCity.name);
          updateStoreStatus();
        }
      }
    }
  }, [initialAppDataLoading, authLoading, mercadoPagoFlow.isMercadoPagoReturnFlow, currentView, selectedCity, cities, updateStoreStatus]);


  const handleCitySelect = useCallback((cityName: string) => {
    const city = cities.find(c => c.name === cityName);
    if (city?.active) {
      setSelectedCity(cityName);
      updateStoreStatus();
      setCurrentView('home');
    }
  }, [cities, updateStoreStatus]);

  const handleAdminAccess = useCallback(() => {
    if (!user) {
      setCurrentView('auth');
    } else if (user.role === 'admin') {
      setShowProfile(false);
      setCurrentView('admin');
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    setShowProfile(false);
    logout();
  }, [logout]);

  const handleViewOrder = useCallback((order: Order) => {
    setCurrentOrder(order);
    setShowProfile(false);
    setCurrentView('tracking');
    clearMercadoPagoFlags();
  }, [clearMercadoPagoFlags]);

  const handleLogin = useCallback(() => {
    setCurrentView('auth');
  }, []);

  const isLoading = initialAppDataLoading || authLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  const logoUrl = appSettings.app_logo_url || 'public/assets/logo.png';
  const heroImageUrl = appSettings.hero_image_url || 'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
  const heroTitleText = appSettings.hero_title_text || '';
  const heroTitleFontSize = appSettings.hero_title_font_size || '48px';
  const heroTitleFontColor = appSettings.hero_title_font_color || '#ffffff';
  const heroTitleBorderColor = appSettings.hero_title_border_color || '#000000';
  const heroSubtitleText = appSettings.hero_subtitle_text || '';
  const heroSubtitleFontSize = appSettings.hero_subtitle_font_size || '20px';
  const heroSubtitleFontColor = appSettings.hero_subtitle_font_color || '#ffffff';
  const heroSubtitleBorderColor = appSettings.hero_subtitle_border_color || '#000000';

  const renderContent = () => {
    if (currentView === 'location') {
      return <LocationSelect cities={cities} onCitySelect={handleCitySelect} logoUrl={logoUrl} />;
    }
    if (currentView === 'admin') {
      if (user?.role === 'admin') {
        return <AdminPanel key={currentView + (user?.id || '')} onBack={() => setCurrentView('home')} onUserUpdate={refetchUser} />;
      } else {
        setCurrentView('home');
        return null;
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
        key={user?.id || 'guest'}
        selectedCity={selectedCity}
        user={user}
        cart={cart}
        onAddToCart={addToCart}
        onRemoveFromCart={removeFromCart}
        onUpdateCartItem={updateCartItem}
        onLogin={handleLogin} 
        onOrderCreated={(order) => {
          clearCart();
          setCurrentOrder(order);
          setCurrentView('tracking');
          clearMercadoPagoFlags();
        }}
        onBackToLocationSelect={() => setCurrentView('location')}
        onProfileClick={() => setShowProfile(true)}
        logoUrl={logoUrl}
        heroImageUrl={heroImageUrl} 
        isStoreOpen={isStoreOpen}
        canPlaceOrder={canPlaceOrder}
        pendingCouponNotificationUserId={pendingCouponNotificationUserId}
        setPendingCouponNotificationUserId={setPendingCouponNotificationUserId}
        setShowUserCouponNotification={setShowUserCouponNotification}
        heroTitleText={heroTitleText}
        heroTitleFontSize={heroTitleFontSize}
        heroTitleFontColor={heroTitleFontColor}
        heroTitleBorderColor={heroTitleBorderColor}
        heroSubtitleText={heroSubtitleText}
        heroSubtitleFontSize={heroSubtitleFontSize}
        heroSubtitleFontColor={heroSubtitleFontColor}
        heroSubtitleBorderColor={heroSubtitleBorderColor}
        showPreOrderModal={showPreOrderModal}
        setShowPreOrderModal={setShowPreOrderModal}
        showPreOrderBanner={showPreOrderBanner}
        isMercadoPagoReturnFlow={mercadoPagoFlow.isMercadoPagoReturnFlow}
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
          onUserUpdate={refetchUser}
          onAdminAccess={handleAdminAccess}
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