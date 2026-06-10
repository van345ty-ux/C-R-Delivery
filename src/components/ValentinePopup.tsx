import React from 'react';
import { X, Heart, Calendar, Clock, Sparkles, AlertCircle } from 'lucide-react';

interface ValentinePopupProps {
  onClose: () => void;
}

export const ValentinePopup: React.FC<ValentinePopupProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[999999] animate-fade-in">
      {/* Estilos e animações locais de coraçõezinhos e pulsação */}
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
        .romantic-pulse {
          animation: pulse-gentle 2.5s infinite ease-in-out;
        }
        .romantic-float-1 {
          animation: float-slower 6s infinite ease-in-out;
        }
        .romantic-float-2 {
          animation: float-slower 8s infinite ease-in-out 1s;
        }
      `}</style>

      <div className="bg-white dark:bg-zinc-950 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(233,30,140,0.3)] relative scale-100 animate-scale-in border border-pink-200 dark:border-rose-950">
        
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white hover:text-pink-200 p-2 rounded-full transition-all duration-300 z-20 cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Romântico */}
        <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-red-600 p-8 text-center relative overflow-hidden text-white select-none">
          {/* Corações decorativos flutuando no fundo do header */}
          <div className="absolute top-2 left-6 text-pink-300/30 text-3xl romantic-float-1 pointer-events-none">❤️</div>
          <div className="absolute bottom-4 right-8 text-rose-300/20 text-4xl romantic-float-2 pointer-events-none">💖</div>
          <div className="absolute top-6 right-4 text-red-300/30 text-2xl romantic-float-1 pointer-events-none">💕</div>
          <div className="absolute bottom-2 left-10 text-pink-200/20 text-3xl romantic-float-2 pointer-events-none">🌹</div>

          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-full mb-3 romantic-pulse border border-white/20">
            <Heart className="w-8 h-8 text-white fill-white" />
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-wide uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] leading-tight">
            ❤️ Atendimento Especial
          </h2>
          <h3 className="text-lg md:text-xl font-bold text-pink-100 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
            Dia dos Namorados 🍣
          </h3>
        </div>

        {/* Corpo do Pop-up */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Alerta de Pedido Agendado */}
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 flex items-start gap-3 text-left shadow-sm">
            <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-rose-800 dark:text-rose-300 text-sm md:text-base">
                Atenção: este é um pedido agendado!
              </h4>
              <p className="text-xs md:text-sm text-rose-700 dark:text-rose-400 mt-1 leading-snug">
                Os atendimentos e entregas da C&R Sushi para esta promoção especial acontecerão exclusivamente na <strong>sexta-feira</strong>.
              </p>
            </div>
          </div>

          {/* Texto de Explicação */}
          <p className="text-zinc-700 dark:text-zinc-300 text-sm md:text-base leading-relaxed text-center font-medium">
            Ao realizar sua compra, você garante sua reserva antecipada para receber seu sushi na sexta-feira e celebrar o Dia dos Namorados com muito sabor.
          </p>

          {/* Lista com Checkmarks Românticos */}
          <div className="space-y-3 bg-pink-50/30 dark:bg-zinc-900/40 p-4 rounded-xl border border-pink-100/50 dark:border-zinc-800/80">
            <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center justify-center w-6 h-6 bg-pink-100 dark:bg-rose-950/50 rounded-full text-rose-600 dark:text-rose-400 font-bold text-sm shrink-0">✓</span>
              <span className="text-xs md:text-sm font-semibold">Pedido realizado hoje</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center justify-center w-6 h-6 bg-pink-100 dark:bg-rose-950/50 rounded-full text-rose-600 dark:text-rose-400 font-bold text-sm shrink-0">✓</span>
              <span className="text-xs md:text-sm font-semibold">Entrega agendada para sexta-feira</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center justify-center w-6 h-6 bg-pink-100 dark:bg-rose-950/50 rounded-full text-rose-600 dark:text-rose-400 font-bold text-sm shrink-0">✓</span>
              <span className="text-xs md:text-sm font-semibold text-rose-600 dark:text-rose-400">Vagas limitadas para produção</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold italic tracking-wide">
              Programe-se e faça sua reserva agora! ✨
            </p>
          </div>

          {/* Botão de Confirmação */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold text-base md:text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-5 h-5 fill-white" />
            Garantir Minha Reserva! 🌹
          </button>

        </div>
      </div>
    </div>
  );
};
