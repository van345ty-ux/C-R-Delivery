import React from 'react';
import { X, Calendar, ShoppingCart, AlertCircle } from 'lucide-react';

interface EasterPopupProps {
  onClose: () => void;
  onGoToMenu: () => void;
}

export const EasterPopup: React.FC<EasterPopupProps> = ({ onClose, onGoToMenu }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative scale-100 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors z-10"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="bg-red-600 p-8 text-center relative overflow-hidden">
          {/* Decoração sutil */}
          <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-red-500 rounded-full opacity-50"></div>
          <div className="absolute bottom-0 left-0 transform -translate-x-1/2 translate-y-1/2 w-24 h-24 bg-red-500 rounded-full opacity-50"></div>

          <h2 className="text-3xl font-extrabold text-white mb-2 relative z-10 flex justify-center items-center gap-2">
            🐰 Especial de Páscoa!
          </h2>
          <p className="text-red-100 text-lg relative z-10 font-medium">A C&R Sushi entrou no clima!</p>
        </div>

        <div className="p-6 text-center space-y-6">
          <div>
            <p className="text-gray-700 text-lg leading-snug">
              <strong>Somente esta semana</strong> preparamos os sensacionais e exclusivos <span className="text-red-600 font-bold text-xl">Ovos de Sushi</span>!
            </p>
            <p className="text-gray-600 mt-3 text-sm">
              Não perca tempo, a produção é <span className="font-bold underline">super limitada</span> e eles vão desaparecer do cardápio rápido. Garanta logo o seu antes que seja tarde! ⏳
            </p>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 text-left shadow-sm">
            <AlarmClockIcon className="w-7 h-7 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-800 text-md">Entregas Especiais: Fim de Semana</h4>
              <p className="text-sm text-red-700 mt-1">
                Para garantir máxima qualidade e frescor, estes Ovos de Sushi serão entregues <strong>exclusivamente neste Sábado e Domingo</strong>. Programe sua Páscoa!
              </p>
            </div>
          </div>

          <button
            onClick={onGoToMenu}
            className="w-full bg-red-600 text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 hover:scale-[1.02] transition-all shadow-lg hover:shadow-red-500/30"
          >
            <ShoppingCart className="w-6 h-6" />
            Quero meu Ovo de Sushi!
          </button>
        </div>
      </div>
    </div>
  );
};

function AlarmClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M5 3 2 6" />
      <path d="m22 6-3-3" />
      <path d="M6.38 18.7 4 21" />
      <path d="M17.64 18.67 20 21" />
    </svg>
  )
}
