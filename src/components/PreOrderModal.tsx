import React from 'react';
import { X } from 'lucide-react';

interface PreOrderModalProps {
  onClose: () => void;
}

export const PreOrderModal: React.FC<PreOrderModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-red-600 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-scale-in relative overflow-hidden">
        {/* Oriental details - simple white shapes */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-white opacity-10 rounded-br-full"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white opacity-10 rounded-tl-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white opacity-5 rounded-full"></div>

        <div className="flex items-center justify-between p-4 border-b border-red-700 relative z-10">
          <h2 className="text-xl font-bold text-white">Atenção C&R Sushi!</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 text-white text-center flex-grow flex flex-col justify-center relative z-10">
          <p className="text-3xl font-extrabold mb-4">Seja o primeiro no atendimento😉</p>
          <p className="text-lg leading-relaxed">
            Agora na C&R Sushi você poderá antecipar seu pedido antes do horário de atendimento,
            mas atenção! Para pagamentos nos pix e cartão no ato do agendamento é necessário o pagamento normalmente,
            com isso ficará validado e será garantido o seu pedido antecipado.
          </p>
        </div>

        <div className="p-4 bg-red-700 border-t border-red-800 relative z-10">
          <button
            onClick={onClose}
            className="w-full bg-white text-red-600 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Entendi!
          </button>
        </div>
      </div>
    </div>
  );
};