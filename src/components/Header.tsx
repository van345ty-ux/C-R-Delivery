import React, { useState, useEffect } from 'react';
import { MapPin, User as UserIcon, ShoppingCart, ArrowLeft, Star } from 'lucide-react';
import { User as UserType } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const { allowThemeToggle } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  console.log('Header: Rendering with user prop:', user ? user.name : 'null');
  return (
    <header 
      className={`glass-effect sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'shadow-xl' : ''
      }`}
      style={{ 
        borderBottom: '1px solid var(--border-primary)',
        boxShadow: isScrolled ? 'var(--shadow-xl)' : 'var(--shadow-md)'
      }}
    >
      <div className="max-w-7xl mx-auto pl-0 pr-2 sm:pr-4 lg:pr-6">
        <div 
          className={`flex items-center justify-between gap-1 transition-all duration-300 ${
            isScrolled ? 'h-16' : 'h-20'
          }`}
        >
          {/* Logo */}
          <div className="flex items-center overflow-visible mr-auto -ml-2 sm:-ml-0">
            <button 
              onClick={onBackToLocationSelect}
              className={`mr-1 p-1 rounded-full hover:bg-opacity-10 transition-all duration-300 flex-shrink-0 ${
                isScrolled ? 'scale-90' : ''
              }`}
              style={{ color: 'var(--text-secondary)' }}
              title="Voltar para seleção de cidade"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img 
              src={logoUrl} 
              alt="C&R Sushi Logo" 
              className={`mr-1 rounded-full shadow-md transition-all duration-300 flex-shrink-0 ${
                isScrolled ? 'h-10 w-10' : 'h-12 w-12'
              }`}
            />
            <div className="overflow-visible">
              <h1 
                className={`font-bold gradient-text whitespace-nowrap transition-all duration-300 ${
                  isScrolled ? 'text-2xl' : 'text-3xl'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                C&R SUSHI
              </h1>
              <div 
                className={`flex items-center text-xs transition-all duration-300 ${
                  isScrolled ? 'hidden' : 'flex'
                }`}
              >
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                <span className="truncate font-bold" style={{ color: '#0A0A0A' }}>{selectedCity}</span>
              </div>
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto pl-4">
            {/* Theme Toggle - Only show if allowed by admin */}
            {allowThemeToggle && <ThemeToggle />}
            
            {user ? (
              <button
                onClick={onProfileClick}
                className={`flex items-center space-x-2 text-left rounded-xl transition-all duration-300 hover:scale-105 ${
                  isScrolled ? 'p-2' : 'p-3'
                }`}
                style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  border: '2px solid var(--border-primary)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)'
                }}
              >
                <div className="text-sm">
                  <p className="font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  <div 
                    className={`flex items-center transition-all duration-300 ${
                      isScrolled ? 'hidden' : 'flex'
                    }`}
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {Array.from({ length: user.purchaseCount % 10 }, (_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                    <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>
                      {user.purchaseCount % 10}/10
                    </span>
                  </div>
                  <p 
                    className={`text-xs mt-px transition-all duration-300 ${
                      isScrolled ? 'hidden' : 'block'
                    }`}
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Meu Perfil
                  </p>
                </div>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105"
                style={{ 
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Entrar
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className="relative p-3 rounded-xl transition-all duration-300 hover:scale-110"
              style={{ 
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'var(--text-inverse)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span 
                  className="absolute -top-2 -right-2 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-scale-in"
                  style={{ 
                    backgroundColor: 'var(--accent-hover)',
                    color: 'var(--text-inverse)',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
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