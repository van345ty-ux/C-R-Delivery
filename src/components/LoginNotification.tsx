import React from 'react';

interface LoginNotificationProps {
  userName: string;
  onClose: () => void;
}

export const LoginNotification: React.FC<LoginNotificationProps> = ({ userName, onClose }) => {
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
      <div
        className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-semibold animate-login-notification"
        onAnimationEnd={onClose}
      >
        {userName} acabou de entrar!
      </div>
    </div>
  );
};