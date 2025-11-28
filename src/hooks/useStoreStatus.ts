import { useState, useEffect, useCallback } from 'react';
import { OperatingHour } from '../types';

export const useStoreStatus = (operatingHours: OperatingHour[]) => {
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [canPlaceOrder, setCanPlaceOrder] = useState(false);
  const [showPreOrderModal, setShowPreOrderModal] = useState(false);
  const [showPreOrderBanner, setShowPreOrderBanner] = useState(false);

  const updateStoreStatus = useCallback(() => {
    console.log('useStoreStatus: updateStoreStatus called.');
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const todayHours = operatingHours.find(h => h.day_of_week === currentDay);

    let storeCurrentlyOpen = false;
    let canPreOrderLocal = false;
    let showPreOrderModalOnLoad = false;
    let showPreOrderBannerOnLoad = false;

    if (todayHours && todayHours.is_open) {
      storeCurrentlyOpen = currentTime >= todayHours.open_time && currentTime < todayHours.close_time;
      canPreOrderLocal = !storeCurrentlyOpen && currentTime >= '07:00' && currentTime <= '17:00';

      const todayDateString = now.toISOString().split('T')[0];
      const lastSeenPreOrderModalDate = localStorage.getItem('preOrderModalLastSeenDate');
      const hasSeenPreOrderModalToday = lastSeenPreOrderModalDate === todayDateString;

      if (canPreOrderLocal && !hasSeenPreOrderModalToday) {
        showPreOrderModalOnLoad = true;
        localStorage.setItem('preOrderModalLastSeenDate', todayDateString);
      }

      if (canPreOrderLocal) {
        showPreOrderBannerOnLoad = true;
      }
    } else {
      storeCurrentlyOpen = false;
      canPreOrderLocal = false;
      showPreOrderModalOnLoad = false;
      showPreOrderBannerOnLoad = false;
    }

    setIsStoreOpen(storeCurrentlyOpen);
    setCanPlaceOrder(storeCurrentlyOpen || canPreOrderLocal);
    setShowPreOrderModal(showPreOrderModalOnLoad);
    setShowPreOrderBanner(showPreOrderBannerOnLoad);

    console.log('useStoreStatus: Calculated storeCurrentlyOpen:', storeCurrentlyOpen);
    console.log('useStoreStatus: Calculated canPreOrderLocal:', canPreOrderLocal);
    console.log('useStoreStatus: Final canPlaceOrder:', storeCurrentlyOpen || canPreOrderLocal);
  }, [operatingHours]);

  useEffect(() => {
    if (operatingHours.length > 0) {
      updateStoreStatus();
    }
  }, [operatingHours, updateStoreStatus]);

  return {
    isStoreOpen,
    canPlaceOrder,
    showPreOrderModal,
    setShowPreOrderModal,
    showPreOrderBanner,
    updateStoreStatus, // Expose update function for external triggers
  };
};