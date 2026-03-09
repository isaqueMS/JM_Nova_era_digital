
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRegistry, Platform } from 'react-native';
import App from './App';

/**
 * Inicializador Universal JM DIGITAL
 * Garante que o app rode no navegador (Vite/GitHub Pages) 
 * e também no app mobile nativo (Expo/Metro).
 */
const startApp = () => {
  if (Platform.OS === 'web') {
    // Ambiente Browser: Usa o padrão moderno do React 18
    const rootElement = document.getElementById('root');
    if (rootElement) {
      const root = createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    }
  } else {
    // Ambiente Nativo: Registra no AppRegistry
    AppRegistry.registerComponent('main', () => App);
  }
};

startApp();
