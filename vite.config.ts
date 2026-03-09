import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.EXPO_PUBLIC_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.EXPO_PUBLIC_GEMINI_API_KEY': JSON.stringify(env.EXPO_PUBLIC_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.EXPO_PUBLIC_MIKWEB_TOKEN': JSON.stringify(env.EXPO_PUBLIC_MIKWEB_TOKEN || env.MIKWEB_TOKEN),
      'process.env.EXPO_PUBLIC_EFI_CLIENT_ID': JSON.stringify(env.EXPO_PUBLIC_EFI_CLIENT_ID || env.EFI_CLIENT_ID),
      'process.env.EXPO_PUBLIC_EFI_CLIENT_SECRET': JSON.stringify(env.EXPO_PUBLIC_EFI_CLIENT_SECRET || env.EFI_CLIENT_SECRET)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react-native': 'react-native-web',
      }
    }
  };
});
