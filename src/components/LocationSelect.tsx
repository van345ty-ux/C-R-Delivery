import React, { useState } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { City } from '../App';

interface LocationSelectProps {
  cities: City[];
  onCitySelect: (cityName: string) => void;
  logoUrl: string;
}

export const LocationSelect: React.FC<LocationSelectProps> = ({ cities, onCitySelect, logoUrl }) => {
  const [showAlert, setShowAlert] = useState<string | null>(null);

  const handleCityClick = (city: City) => {
    if (!city.active) {
      setShowAlert(city.name);
      setTimeout(() => setShowAlert(null), 3000);
      return;
    }
    onCitySelect(city.name);
  };

  // Sort cities to show active ones first
  const sortedCities = [...cities].sort((a, b) => Number(b.active) - Number(a.active));

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <img src={logoUrl} alt="C&R Sushi Logo" className="w-24 h-24 mx-auto mb-4 rounded-full" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">C&R SUSHI</h1>
          <p className="text-gray-600 text-sm">Sabores autênticos do Japão</p>
        </div>

        {/* City Selection */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Selecione a sua cidade:
          </h2>
          
          <div className="space-y-4">
            {sortedCities.length > 0 ? (
              sortedCities.map((city) => (
                <button
                  key={city.name}
                  onClick={() => handleCityClick(city)}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                    city.active
                      ? 'border-red-500 bg-red-50 hover:bg-red-100 text-red-700'
                      : 'border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span className="font-medium">{city.name}</span>
                    {!city.active && (
                      <AlertTriangle className="w-4 h-4 ml-2 text-orange-500" />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-600 bg-gray-100 rounded-lg">
                <p className="mb-2">Nenhuma cidade disponível no momento.</p>
                <p className="text-sm">Por favor, adicione cidades no painel administrativo.</p>
              </div>
            )}
          </div>
        </div>

        {/* Alert Modal */}
        {showAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 text-center animate-fade-in">
              <div className="text-orange-500 mb-4">
                <AlertTriangle className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Atenção</h3>
              <p className="text-gray-600 mb-2">
                Não estamos atendendo nessa localidade no momento
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Obrigado pela compreensão
              </p>
              <p className="text-red-600 font-semibold">C&R-SUSHI</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};