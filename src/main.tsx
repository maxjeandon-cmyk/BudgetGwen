import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// PWA : enregistrement du service worker, discrètement, une fois la page
// chargée. C est un confort, pas une poutre : en cas d échec, l app
// fonctionne exactement pareil. (public/sw.js est une pure transparence.)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* pas de service worker, pas de drame */
    });
  });
}
