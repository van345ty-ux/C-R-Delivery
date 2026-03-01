import { useState, useEffect } from 'react';

export const useMercadoPagoReturnFlow = () => {
  const [isMercadoPagoReturnFlow, setIsMercadoPagoReturnFlow] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('isMercadoPagoReturnFlow') || 'false');
    }
    return false;
  });

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'isMercadoPagoReturnFlow') {
        setIsMercadoPagoReturnFlow(JSON.parse(event.newValue || 'false'));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const clearMercadoPagoFlags = () => {
    console.log('useMercadoPagoReturnFlow: Clearing Mercado Pago flags.');
    localStorage.removeItem('isMercadoPagoReturnFlow');
    localStorage.removeItem('externalPaymentMethod');
    localStorage.removeItem('pixPaymentInitiated');
    localStorage.removeItem('hasAcknowledgedPixReturnConfirmation');
    localStorage.removeItem('hasSeenMercadoPagoWarning');
    localStorage.removeItem('hasSeenPixInstructions');
    setIsMercadoPagoReturnFlow(false);
  };

  return {
    isMercadoPagoReturnFlow,
    setIsMercadoPagoReturnFlow,
    clearMercadoPagoFlags,
  };
};