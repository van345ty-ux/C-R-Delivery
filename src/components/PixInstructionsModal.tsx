import React from 'react';
import { Copy, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface PixInstructionsModalProps {
  onClose: () => void;
  pixKey: string;
}

export const PixInstructionsModal: React.FC<PixInstructionsModalProps> = ({ onClose, pixKey }) => {
  const copyPixKey = () => {
    if (pixKey) {
      navigator.clipboard.writeText(pixKey);
      toast.success('Chave Pix copiada!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center animate-scale-in">
        <Info className="w-12 h-12 mx-auto text-blue-600 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Instruções para Pagamento PIX</h3>
        <p className="text-gray-600 mb-4">
          Copie a chave pix logo abaixo, pague exatamente o valor do seu pedido e volte para finalizar o pedido no carrinho.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <p className="font-semibold text-left mb-2">Siga estes passos:</p>
          <ol className="text-sm text-gray-700 text-left list-decimal list-inside space-y-1">
            <li>Copie a chave pix e vá até o seu banco pagar o pedido.</li>
            <li>Volte e clique em "Entendi" para o botão "Finalizar Pedido" aparecer e você finalizar o pedido já pago para a C&R Sushi poder preparar 😋.</li>
          </ol>
        </div>

        <div className="bg-blue-50 border border-dashed border-blue-300 text-blue-800 p-3 rounded-lg text-sm flex items-center justify-between mt-2 mb-4">
          <span className="font-mono font-semibold">{pixKey}</span>
          <button onClick={copyPixKey} className="ml-2 p-1 rounded-md hover:bg-blue-100">
            <Copy className="w-4 h-4" />
          </button>
        </div>

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