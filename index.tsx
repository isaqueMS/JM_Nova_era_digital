
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRegistry, Platform } from 'react-native';
import App from './App';


/**
 * Inicializador Universal JM DIGITAL
 * Garante que o app rode no navegador (Vite/GitHub Pages) 
 * e também no app mobile nativo (Expo/Metro).
 */
const startApp = () => {
  console.log("[JM DIGITAL] Inicializando Aplicação Web...");
  console.log("[JM DIGITAL] Platform.OS:", Platform.OS);

  if (Platform.OS === 'web' || typeof document !== 'undefined') {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      console.log("[JM DIGITAL] Elemento #root encontrado, montando React...");
      // @ts-ignore - Compatibilidade React 19/Vite
      const createRootFunc = ReactDOM.createRoot || (ReactDOM as any).default?.createRoot;
      if (createRootFunc) {
        const root = createRootFunc(rootElement);
        root.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
      } else {
        console.error("[JM DIGITAL] Erro: ReactDOM.createRoot não encontrado.");
      }
    } else {
      console.error("[JM DIGITAL] Erro fatal: Elemento #root não encontrado no DOM.");
    }
  } else {

    // Ambiente Nativo (Expo Go / Mobile)
    AppRegistry.registerComponent('main', () => App);
  }
};

startApp();

