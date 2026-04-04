import { useState, useEffect } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

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
    <div
      className="fixed inset-0 flex items-end justify-center p-4 z-[500]"
      style={{ pointerEvents: 'none' }}
    >
      {/* Card de atualização — posicionado na parte inferior */}
      <div
        className="w-full max-w-sm mb-4 animate-slide-up"
        style={{ pointerEvents: 'auto' }}
      >
        <div
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {/* Barra superior colorida */}
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, #e63946, #f4a261, #e63946)' }}
          />

          <div className="p-4">
            {/* Cabeçalho */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(230,57,70,0.2)', border: '1px solid rgba(230,57,70,0.4)' }}
              >
                <Sparkles className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">
                  C&R Sushi — Versão Atualizada
                </p>
                <p className="text-gray-400 text-xs">
                  Toque para carregar a versão mais recente
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: loading
                    ? 'rgba(230,57,70,0.5)'
                    : 'linear-gradient(135deg, #e63946, #c1121f)',
                  color: 'white',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(230,57,70,0.4)',
                }}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                />
                {loading ? 'Atualizando...' : '🔄 Atualizar agora'}
              </button>

              <button
                onClick={handleDismiss}
                className="px-3 py-2.5 rounded-xl text-gray-400 text-sm transition-colors hover:text-white hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  );
};
