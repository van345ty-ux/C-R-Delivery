import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { supabase } from '../integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { User, Coupon } from '../types';

const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  console.log('useAuth: fetchUserProfile: Attempting to fetch profile for user ID:', supabaseUser.id);
  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', supabaseUser.id)
    .single();

  if (error && error.code === 'PGRST116') {
    console.log('useAuth: fetchUserProfile: Profile not found, attempting to create it.');
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
      console.error('useAuth: fetchUserProfile: Error creating profile on-the-fly:', insertError);
      return null;
    }
    console.log('useAuth: fetchUserProfile: Profile created successfully.');
    data = newProfile;
  } else if (error) {
    console.error('useAuth: fetchUserProfile: Error fetching profile:', error);
    return null;
  }
  
  if (data) {
    console.log('useAuth: fetchUserProfile: Profile data retrieved:', data);
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
  console.log('useAuth: fetchUserProfile: No profile data found or created, returning null.');
  return null;
};

export const useAuth = (onLogoutCallback?: () => void) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingCouponNotificationUserId, setPendingCouponNotificationUserId] = useState<string | null>(null);
  const [showUserCouponNotification, setShowUserCouponNotification] = useState(false);

  // Use useRef to keep a stable reference to the latest onLogoutCallback
  const onLogoutCallbackRef = useRef(onLogoutCallback);
  useEffect(() => {
    onLogoutCallbackRef.current = onLogoutCallback;
  }, [onLogoutCallback]);

  const checkAndShowCouponNotification = useCallback(async (userId: string) => {
    console.log('useAuth: checkAndShowCouponNotification called for userId:', userId);
    
    const { data: couponsData, error: couponsError } = await supabase
      .from('coupons')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('active', true)
      .eq('is_pending_admin_approval', false);

    if (couponsError) {
      console.error('useAuth: Error fetching coupons for notification:', couponsError);
      setPendingCouponNotificationUserId(null);
      return;
    }

    const today = new Date();
    const hasAvailableCoupons = (couponsData || []).filter((coupon: Coupon) => {
      const validFrom = new Date(coupon.valid_from);
      const validTo = new Date(coupon.valid_to);
      validTo.setHours(23, 59, 59, 999);

      const isCurrentlyValid = today >= validFrom && today <= validTo;
      const hasUsagesLeft = coupon.usage_limit === null || coupon.usage_count < coupon.usage_limit;

      if ((coupon.type === 'birthday' || coupon.type === 'loyalty') && !coupon.user_id) {
        return false; 
      }
      return isCurrentlyValid && hasUsagesLeft;
    }).length > 0;
    console.log('useAuth: hasAvailableCoupons:', hasAvailableCoupons);

    if (hasAvailableCoupons) {
      setPendingCouponNotificationUserId(userId);
      console.log('useAuth: Setting pendingCouponNotificationUserId to:', userId);
    } else {
      setPendingCouponNotificationUserId(null);
      console.log('useAuth: No available coupons, clearing pendingCouponNotificationUserId');
    }
  }, []); // This should be stable

  // This is the core handler for auth state changes
  const authStateChangeHandler = useCallback(async (event: string, sessionFromEvent: Session | null) => {
    console.log(`useAuth: authStateChangeHandler: Event received: ${event}, sessionFromEvent: ${sessionFromEvent ? 'active' : 'null'}`);
    setAuthLoading(true);
    console.log('useAuth: authLoading set to true (start of authStateChangeHandler)');
    
    try {
      if (event === 'SIGNED_OUT') {
        console.log('useAuth: authStateChangeHandler: SIGNED_OUT event detected. Clearing all user-related states.');
        setSession(null);
        setUser(null);
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
        if (onLogoutCallbackRef.current) { // Use the ref here
          try {
            onLogoutCallbackRef.current();
          } catch (cbError) {
            console.error('useAuth: authStateChangeHandler: Error in onLogoutCallbackRef.current:', cbError);
          }
        }
        toast.success('Você foi desconectado.');
        return;
      }

      const { data: { session: latestSession }, error: sessionError } = await supabase.auth.getSession();
      console.log(`useAuth: authStateChangeHandler: Latest session from getSession() after event: ${latestSession ? 'active' : 'null'}`);

      if (sessionError) {
        console.error('useAuth: authStateChangeHandler: Erro ao buscar a sessão mais recente em onAuthStateChange:', sessionError);
        setSession(null);
        setUser(null);
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
        if (onLogoutCallbackRef.current) {
          try {
            onLogoutCallbackRef.current();
          } catch (cbError) {
            console.error('useAuth: authStateChangeHandler: Error in onLogoutCallbackRef.current (sessionError path):', cbError);
          }
        }
        toast.error('Erro na sessão. Por favor, faça login novamente.');
        return;
      }

      setSession(latestSession);

      if (latestSession?.user) {
        console.log('useAuth: authStateChangeHandler: User is active. Fetching profile.');
        const profile = await fetchUserProfile(latestSession.user);
        setUser(profile);

        if (profile) {
          console.log('useAuth: authStateChangeHandler: Profile fetched/created successfully.');
          if (event === 'SIGNED_IN' && profile.role === 'customer') {
            const userName = latestSession.user.user_metadata.full_name || latestSession.user.email;
            if (userName) {
              const { error } = await supabase.from('login_notifications').insert({
                user_id: latestSession.user.id,
                user_name: userName,
              });
              if (error) {
                console.error('useAuth: authStateChangeHandler: Error creating login notification:', error);
              } else {
                console.log('useAuth: authStateChangeHandler: Login notification created.');
              }
            }
            checkAndShowCouponNotification(latestSession.user.id);
          }
        } else {
          console.log('useAuth: authStateChangeHandler: No profile data found or created, returning null.');
          setSession(null); // Clear session if profile fails
          setUser(null);
          setPendingCouponNotificationUserId(null);
          setShowUserCouponNotification(false);
          if (onLogoutCallbackRef.current) {
            try {
              onLogoutCallbackRef.current();
            } catch (cbError) {
              console.error('useAuth: authStateChangeHandler: Error in onLogoutCallbackRef.current (profile failure path):', cbError);
            }
          }
          toast.error('Não foi possível carregar seu perfil. Por favor, tente fazer login novamente.');
        }
      } else {
        console.log('useAuth: authStateChangeHandler: No active user session found (after getSession). Clearing user-related states.');
        setUser(null);
        setPendingCouponNotificationUserId(null);
        setShowUserCouponNotification(false);
      }
    } catch (error) {
      console.error('useAuth: authStateChangeHandler: Erro inesperado durante o processamento de autenticação:', error);
      toast.error('Ocorreu um erro durante a autenticação: ' + (error as Error).message);
    } finally {
      setAuthLoading(false);
      console.log('useAuth: authLoading set to false (end of authStateChangeHandler)');
    }
  }, [checkAndShowCouponNotification]); // onLogoutCallback is now accessed via ref, so it's not a dependency here

  useEffect(() => {
    setAuthLoading(true);
    console.log('useAuth: authLoading set to true (start of useEffect)');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(authStateChangeHandler); // Use the stable handler
    console.log('useAuth: Auth state change listener set up.');

    return () => {
      console.log('useAuth: Auth subscription unsubscribed.');
      subscription.unsubscribe();
    };
  }, [authStateChangeHandler]); // This dependency should now be stable

  const refetchUser = useCallback(async () => {
    console.log('useAuth: refetchUser: Called.');
    if (session?.user) {
      const profile = await fetchUserProfile(session.user);
      setUser(profile);
    }
  }, [session]);

  const logout = useCallback(async () => {
    console.log('useAuth: logout: Called.');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('useAuth: logout: Error during signOut, performing manual client-side cleanup:', error);
      setSession(null);
      setUser(null);
      setPendingCouponNotificationUserId(null);
      setShowUserCouponNotification(false);
      if (onLogoutCallbackRef.current) { // Use the ref here
        try {
          onLogoutCallbackRef.current();
        } catch (cbError) {
          console.error('useAuth: logout: Error in onLogoutCallbackRef.current (signOut error path):', cbError);
        }
      }
      toast.success('Você foi desconectado.');
    } else {
      console.log('useAuth: logout: signOut initiated successfully. State cleanup will be handled by onAuthStateChange.');
    }
  }, []); // No dependencies needed here, as onLogoutCallback is accessed via ref
  
  return {
    session,
    user,
    authLoading,
    refetchUser,
    logout,
    pendingCouponNotificationUserId,
    setPendingCouponNotificationUserId,
    showUserCouponNotification,
    setShowUserCouponNotification,
  };
};