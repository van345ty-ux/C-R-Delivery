import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageEnlargeModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageEnlargeModal: React.FC<ImageEnlargeModalProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Fecha após 3 segundos

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white bg-gray-800 bg-opacity-50 rounded-full p-1 hover:bg-opacity-75 transition-colors z-10"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
        <img
          src={imageUrl}
          alt="Imagem ampliada"
          className="max-w-full max-h-full object-contain"
          style={{ transform: 'scale(0.8)' }} // 70% maior
        />
      </div>
    </div>
  );
};