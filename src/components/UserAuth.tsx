import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, Calendar, Lock, Settings } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

interface UserAuthProps {
  onBack: () => void;
  onGoToMenu: () => void;
  onAdminAccess: () => void;
}

export const UserAuth: React.FC<UserAuthProps> = ({ onBack, onGoToMenu, onAdminAccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (isRecovering) {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email);
      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage(`Link de recuperação enviado para ${formData.email}`);
        setIsRecovering(false);
      }
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        setError(error.message);
      }
      // On successful login, the onAuthStateChange in App.tsx will handle the redirect and notification.
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            phone: formData.phone,
            birth_date: formData.birthDate,
          }
        }
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        // If session is null, it means email confirmation is required.
        if (!data.session) {
          setSuccessMessage('Cadastro realizado! Verifique seu e-mail para confirmar sua conta e poder fazer o login.');
          setIsLogin(true); // Switch to login view
          setFormData({ name: '', email: '', phone: '', birthDate: '', password: '' }); // Clear form
        }
        // If session is not null, user is logged in, and onAuthStateChange will handle redirect and notification.
      }
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSwitchMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSuccessMessage(null);
    setFormData({ name: '', email: '', phone: '', birthDate: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <button 
          onClick={onAdminAccess} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          title="Acesso Administrativo"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="flex items-center mb-6">
          <button onClick={onBack} className="mr-4">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {isRecovering ? 'Recuperar Senha' : isLogin ? 'Entrar' : 'Cadastrar'}
          </h1>
          <button onClick={onGoToMenu} className="text-sm text-gray-500 hover:text-red-600 transition-colors">Ir para cardápio →</button>
        </div>

        {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</p>}
        {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm">{successMessage}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRecovering ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          ) : (
            <>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Celular
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="(73) 99999-9999"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Nascimento
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : isRecovering ? 'Enviar Link' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {!isRecovering && (
            <>
              <button
                onClick={handleSwitchMode}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
              </button>
              
              {isLogin && (
                <button
                  onClick={() => { setIsRecovering(true); setError(null); }}
                  className="block w-full text-gray-600 hover:text-gray-700 text-sm"
                >
                  Esqueci minha senha
                </button>
              )}
            </>
          )}

          {isRecovering && (
            <button
              onClick={() => { setIsRecovering(false); setError(null); }}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Voltar ao login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};