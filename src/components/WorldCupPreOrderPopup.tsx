import React from 'react';
import { X, Calendar, Clock, Sparkles, AlertCircle } from 'lucide-react';

interface WorldCupPreOrderPopupProps {
  onClose: () => void;
  settings?: {
    title: string;
    subtitle: string;
    warningTitle: string;
    warningDescription: string;
    description: string;
    footer: string;
    buttonText: string;
  };
}

export const WorldCupPreOrderPopup: React.FC<WorldCupPreOrderPopupProps> = ({ onClose, settings }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[999999] animate-fade-in">
      {/* Estilos e animações locais de futebol e pulsação */}
      <style>{`
        @keyframes pulse-gentle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes float-slower {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-10px) rotate(5deg); opacity: 0.8; }
          100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
        }
        .cup-pulse {
          animation: pulse-gentle 2.5s infinite ease-in-out;
        }
        .cup-float-1 {
          animation: float-slower 6s infinite ease-in-out;
        }
        .cup-float-2 {
          animation: float-slower 8s infinite ease-in-out 1s;
        }
      `}</style>

      <div className="bg-white dark:bg-zinc-950 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(22,163,74,0.3)] relative scale-100 animate-scale-in border border-green-200 dark:border-green-950">
        
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white hover:text-yellow-200 p-2 rounded-full transition-all duration-300 z-20 cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header da Copa */}
        <div className="bg-gradient-to-r from-green-600 via-green-700 to-yellow-500 p-8 text-center relative overflow-hidden text-white select-none">
          {/* Bolas e taças flutuando no fundo do header */}
          <div className="absolute top-2 left-6 text-2xl cup-float-1 pointer-events-none">⚽</div>
          <div className="absolute bottom-4 right-8 text-3xl cup-float-2 pointer-events-none">🏆</div>
          <div className="absolute top-6 right-4 text-xl cup-float-1 pointer-events-none">🇧🇷</div>
          <div className="absolute bottom-2 left-10 text-2xl cup-float-2 pointer-events-none">✨</div>

          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-full mb-3 cup-pulse border border-white/20">
            <span className="text-3xl">⚽</span>
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] leading-tight">
            {settings?.title || '🇧🇷 Atendimento Especial'}
          </h2>
          <h3 className="text-lg md:text-xl font-bold text-yellow-100 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
            {settings?.subtitle || 'Copa do Mundo 2026 🏆'}
          </h3>
        </div>

        {/* Corpo do Pop-up */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Alerta de Pedido Agendado */}
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-xl p-4 flex items-start gap-3 text-left shadow-sm">
            <AlertCircle className="w-6 h-6 text-green-700 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-green-800 dark:text-green-300 text-sm md:text-base">
                {settings?.warningTitle || 'Atenção: este é um pedido agendado!'}
              </h4>
              <p className="text-xs md:text-sm text-green-700 dark:text-green-400 mt-1 leading-snug">
                {settings?.warningDescription || 'Os atendimentos e entregas da C&R Sushi para esta promoção especial acontecerão exclusivamente na sexta-feira a partir das 18h.'}
              </p>
            </div>
          </div>

          {/* Texto de Explicação */}
          <p className="text-zinc-700 dark:text-zinc-300 text-sm md:text-base leading-relaxed text-center font-medium">
            {settings?.description || 'Ao realizar sua compra, você guarantees sua reserva antecipada para receber seu sushi na sexta-feira e torcer pelo Brasil rumo ao Hexa com muito sabor!'}
          </p>

          {/* Lista com Checkmarks da Copa */}
          <div className="space-y-3 bg-green-50/30 dark:bg-zinc-900/40 p-4 rounded-xl border border-green-100/50 dark:border-zinc-800/80">
            <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-950/50 rounded-full text-green-700 dark:text-green-400 font-bold text-sm shrink-0">✓</span>
              <span className="text-xs md:text-sm font-semibold">Pedido realizado hoje/amanhã</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-950/50 rounded-full text-green-700 dark:text-green-400 font-bold text-sm shrink-0">✓</span>
              <span className="text-xs md:text-sm font-semibold">Entrega agendada para o dia configurado</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-950/50 rounded-full text-green-700 dark:text-green-400 font-bold text-sm shrink-0">✓</span>
              <span className="text-xs md:text-sm font-semibold text-green-600 dark:text-green-400">Vagas limitadas para produção</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold italic tracking-wide">
              {settings?.footer || 'Programe-se e garanta o seu sushi para o jogo! ⚽🇧🇷'}
            </p>
          </div>

          {/* Botão de Confirmação */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-extrabold text-base md:text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-5 h-5 fill-white" />
            {settings?.buttonText || 'Garantir Minha Reserva! ⚽'}
          </button>

        </div>
      </div>
    </div>
  );
};
