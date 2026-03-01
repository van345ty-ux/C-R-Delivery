import React from 'react';
import { MapPin, User as UserIcon, ShoppingCart, ArrowLeft, Star } from 'lucide-react';
import { User as UserType } from '../types'; // Importando de types.ts

interface HeaderProps {
  selectedCity: string;
  user: UserType | null;
  cartItemCount: number;
  onLogin: () => void;
  onCartClick: () => void;
  onBackToLocationSelect: () => void;
  onProfileClick: () => void;
  logoUrl: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedCity,
  user,
  cartItemCount,
  onLogin,
  onCartClick,
  onBackToLocationSelect,
  onProfileClick,
  logoUrl,
}) => {
  console.log('Header: Rendering with user prop:', user ? user.name : 'null');
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center">
            <button 
              onClick={onBackToLocationSelect}
              className="mr-2 text-gray-600 hover:text-red-600 transition-colors"
              title="Voltar para seleção de cidade"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img src={logoUrl} alt="C&R Sushi Logo" className="h-10 w-10 mr-2 rounded-full" />
            <div>
              <h1 className="text-xl font-bold text-red-600 whitespace-nowrap">C&R SUSHI</h1>
              <div className="flex items-center text-sm">
                <div className="flex items-center text-gray-500">
                  <MapPin className="w-3 h-3 mr-1 animate-bounce-subtle" />
                  <span>{selectedCity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <button
                onClick={onProfileClick}
                className="flex items-center space-x-2 text-left hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <div className="flex items-center text-yellow-500">
                    {Array.from({ length: user.purchaseCount % 10 }, (_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-500 stroke-yellow-500" />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">
                      {user.purchaseCount % 10}/10
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-px">Meu Perfil</p>
                </div>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center text-sm font-medium text-gray-700 hover:text-red-600"
              >
                <UserIcon className="w-4 h-4 mr-1" />
                Entrar
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className="relative bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-500 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};