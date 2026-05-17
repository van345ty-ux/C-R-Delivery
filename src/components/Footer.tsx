import React, { useState } from 'react';
import { Instagram, Facebook } from 'lucide-react';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfUse } from './TermsOfUse';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      <footer
        className="mt-auto"
        style={{
          background: 'linear-gradient(to bottom, var(--bg-secondary), var(--bg-tertiary))',
          borderTop: '1px solid var(--border-primary)'
        }}
      >
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center">
            {/* Brand Section */}
            <div className="space-y-2 text-center max-w-md">
              <h3
                className="text-xl font-bold gradient-text"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                C&R SUSHI
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                Experiência japonesa autêntica com ingredientes frescos e de qualidade premium.
              </p>
              {/* Social Media */}
              <div className="flex gap-2 justify-center pt-1">
                <a
                  href="#"
                  className="p-2 rounded-full transition-all duration-300 hover:scale-110"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--accent-primary)'
                  }}
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-full transition-all duration-300 hover:scale-110"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--accent-primary)'
                  }}
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className="py-4"
          style={{
            borderTop: '2px solid #DC2626',
            backgroundColor: '#DC2626',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
              <p
                className="text-sm"
                style={{ color: '#FFFFFF' }}
              >
                © {currentYear} C&R Sushi. Todos os direitos reservados. Desenvolvido por Atila Azevedo.
              </p>
              <div className="flex gap-4 text-xs">
                <button
                  onClick={() => setShowPrivacy(true)}
                  className="transition-colors duration-300 hover:opacity-80 underline-offset-2 hover:underline"
                  style={{ color: '#FFFFFF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Política de Privacidade
                </button>
                <span style={{ color: '#FFFFFF' }}>•</span>
                <button
                  onClick={() => setShowTerms(true)}
                  className="transition-colors duration-300 hover:opacity-80 underline-offset-2 hover:underline"
                  style={{ color: '#FFFFFF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Termos de Uso
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modais */}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsOfUse onClose={() => setShowTerms(false)} />}
    </>
  );
};
