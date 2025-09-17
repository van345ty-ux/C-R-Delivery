import React, { useEffect } from 'react';
import { Gift } from 'lucide-react';

interface UserCouponNotificationProps {
  onClose: () => void;
}

export const UserCouponNotification: React.FC<UserCouponNotificationProps> = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Chama onClose após 3 segundos

    return () => clearTimeout(timer); // Limpa o temporizador se o componente for desmontado
  }, [onClose]);

  return (
   <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
  <div
    className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg text-center animate-coupon-notification-display flex flex-col items-center"
  >
    <Gift className="w-8 h-8 mb-2" />
    <span className="text-2xl font-bold">Parabéns</span>
    <span className="text-base">tem cupom disponível para você!</span>
  </div>
</div>

  );
};