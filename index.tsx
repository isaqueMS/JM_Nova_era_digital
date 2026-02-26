
import React from 'react';
import App from './App';

// Fix: Declare require globally to resolve compilation errors when using dynamic imports
// in a universal entry point that targets both Web (react-dom) and Native (react-native) environments.
declare var require: any;

/**
 * Sistema de inicialização universal JM DIGITAL
 * Protege contra erros de referência global em ambientes sem DOM (Android/iOS)
 */
const init = () => {
  // Verifica se existe o objeto global 'window' e 'document'
  const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';

  if (isWeb) {
    // Ambiente Navegador: Carrega react-dom dinamicamente
    try {
      // Usamos require dinâmico para evitar que o bundler nativo tente processar react-dom
      const ReactDOM = require('react-dom/client');
      const rootElement = window.document.getElementById('root');
      if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
      }
    } catch (e) {
      console.error("Erro na inicialização Web:", e);
    }
  } else {
    // Ambiente Mobile Nativo: Registra o componente via AppRegistry
    try {
      const { AppRegistry } = require('react-native');
      // No Expo, o componente principal deve ser registrado como 'main'
      AppRegistry.registerComponent('main', () => App);
    } catch (e) {
      console.error("Erro na inicialização Native:", e);
    }
  }
};

init();
