import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

// Chave no sessionStorage - aparece apenas uma vez por sessão da aba
const SESSION_KEY = 'update_prompt_shown';

export const UpdatePrompt = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Só mostra se ainda não foi exibido nesta sessão da aba
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (!alreadyShown) {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    window.location.reload();
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop escuro por cima do popup de Páscoa */}
      <div
        className="fixed inset-0 z-[599]"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={handleDismiss}
      />

      {/* Card centralizado por cima de tudo */}
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
        <div
          className="w-full max-w-xs animate-slide-up"
        >
          <div
            className="rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {/* Barra superior colorida */}
            <div
              className="h-1.5 w-full"
              style={{ background: 'linear-gradient(90deg, #e63946, #f4a261, #e63946)' }}
            />

            <div className="p-6 text-center">
              {/* Ícone */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(230,57,70,0.2)', border: '2px solid rgba(230,57,70,0.5)' }}
              >
                <RefreshCw className="w-7 h-7 text-red-400" />
              </div>

              <p className="text-white font-bold text-base mb-1">
                Nova versão disponível!
              </p>
              <p className="text-gray-400 text-sm mb-5">
                Toque no botão abaixo para carregar o cardápio mais atualizado com todas as novidades.
              </p>

              {/* Botão principal */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mb-2"
                style={{
                  background: loading
                    ? 'rgba(230,57,70,0.5)'
                    : 'linear-gradient(135deg, #e63946, #c1121f)',
                  color: 'white',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(230,57,70,0.5)',
                }}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Atualizando...' : '🔄 Atualizar o cardápio'}
              </button>

              <button
                onClick={handleDismiss}
                className="text-gray-500 text-xs hover:text-gray-300 transition-colors py-1"
              >
                Estou na versão atual, fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </>
  );
};
