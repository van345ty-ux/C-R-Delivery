import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-red-600 text-white py-6 px-4 sm:px-6 lg:px-8 mt-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
        <p className="text-sm mb-2 sm:mb-0">
          Copyright © 2025 - C&R Sushi, Todos os direitos reservados.
        </p>
        <div className="text-xs text-right">
          <a href="#" className="hover:underline mr-2">Política de privacidade</a>
          <span>e</span>
          <a href="#" className="hover:underline ml-2">Termos de uso</a>
        </div>
      </div>
    </footer>
  );
};