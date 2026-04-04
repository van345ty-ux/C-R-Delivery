import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const APP_VERSION = '2026-04-04-1322'; // Versão atual baseada no horário

// Forçar desregistro de qualquer Service Worker antigo (Zombie PWA)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Main: Service Worker desregistrado.');
    }
  });
}

// Lógica de Atualização Inteligente (Force-Refresh)
if (typeof window !== 'undefined') {
  const savedVersion = localStorage.getItem('app_version');
  const urlParams = new URLSearchParams(window.location.search);
  const versionParam = urlParams.get('v');

  if (savedVersion !== APP_VERSION) {
    // Nova versão detectada! Força recarga bypassando o cache
    console.log(`Main: Versão ${APP_VERSION} detectada. Forçando atualização...`);
    localStorage.setItem('app_version', APP_VERSION);
    
    // Limpar Cache Storage para garantir novos assets
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) caches.delete(name);
      });
    }

    // Recarrega com um parâmetro ?v= para forçar a Vercel/Browser a baixar o novo index.html
    const newUrl = window.location.origin + window.location.pathname + '?v=' + APP_VERSION;
    window.location.replace(newUrl);
  } else if (versionParam) {
    // Se as versões batem e tem parâmetro de update na URL, limpa ele
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    console.log('Main: App atualizado com sucesso e URL limpa.');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
