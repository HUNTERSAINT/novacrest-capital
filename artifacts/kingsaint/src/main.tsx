import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(<App />);
