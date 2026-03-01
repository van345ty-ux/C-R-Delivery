import React from 'react';
import { CheckCircle } from 'lucide-react';

interface PixReturnConfirmationModalProps {
  onClose: () => void;
}

export const PixReturnConfirmationModal: React.FC<PixReturnConfirmationModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center animate-scale-in">
        <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Pagamento Pix Realizado?</h3>
        <p className="text-gray-600 mb-4">
          Agora clique em "Finalizar Pedido" se já <span className="font-bold">pagou</span> para a C&R Sushi preparar seu pedido!
        </p>
        <button
          onClick={onClose}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          Entendi
        </button>
      </div>
    </div>
  );
};