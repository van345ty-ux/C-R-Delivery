import React, { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfUse } from './TermsOfUse';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    // Only show the banner if the user hasn't accepted yet
    const hasAccepted = localStorage.getItem('cookieConsent');
    if (!hasAccepted) {
      // Small delay so it animates in nicely
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsVisible(false);
  };

  if (!isVisible && !showPrivacy && !showTerms) return null;

  return (
    <>
      {isVisible && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 p-4 transform transition-transform duration-500 ease-out translate-y-0"
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            borderTop: '1px solid var(--border-primary)', 
            boxShadow: '0 -4px 15px rgba(0,0,0,0.2)' 
          }}
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex items-start md:items-center gap-3">
              <div className="hidden md:flex p-2 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
                <Cookie className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-sm flex-1 text-center md:text-left leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                <p>
                  Utilizamos cookies e armazenamento local para aprimorar sua experiência e garantir o bom funcionamento da plataforma.
                  Ao continuar, você concorda com nossos{' '}
                  <button onClick={() => setShowTerms(true)} className="font-semibold underline underline-offset-2 hover:text-red-500 transition-colors">Termos de Uso</button> e{' '}
                  <button onClick={() => setShowPrivacy(true)} className="font-semibold underline underline-offset-2 hover:text-red-500 transition-colors">Políticas de Privacidade</button>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-center md:justify-end">
              <button
                onClick={handleAccept}
                className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-300 hover:opacity-90 active:scale-95 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' }}
              >
                Entendi e Aceito
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-2.5 rounded-xl transition-colors hover:bg-black/5"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Fechar aviso"
                title="Fechar (voltará a aparecer depois)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsOfUse onClose={() => setShowTerms(false)} />}
    </>
  );
};
