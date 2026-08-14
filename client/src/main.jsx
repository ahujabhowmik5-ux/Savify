import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/variables.css';
import './styles/global.css';
import './styles/animations.css';
// Unregister any active service workers to prevent cached blank screens
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

// import './styles/widget.css';
// import { initGoogleAnalytics, registerServiceWorker } from './utils/analytics';

// // Initialize analytics and SW
// initGoogleAnalytics();
// registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
