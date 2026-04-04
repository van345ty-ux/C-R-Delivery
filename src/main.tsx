import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Forçar desregistro de qualquer Service Worker antigo (Zombie PWA)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Main: Service Worker desregistrado para forçar atualização.');
    }
  });
}

// Limpar cache do navegador (Cache Storage) para garantir novos assets
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
