import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { transform } from 'esbuild';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'fix-expo-jsx',
        async transform(code, id) {
          // Detecta arquivos .js que contém JSX (comum em pacotes Expo compilados para mobile)
          if (id.includes('node_modules') && id.endsWith('.js')) {
            if (code.includes('(<') || code.includes('<NativeLinearGradient')) {
              const { code: transformedCode } = await transform(code, {
                loader: 'jsx',
                format: 'esm',
                target: 'esnext',
              });
              return {
                code: transformedCode,
                map: null,
              };
            }
          }
          return null;
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.EXPO_PUBLIC_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.EXPO_PUBLIC_GEMINI_API_KEY': JSON.stringify(env.EXPO_PUBLIC_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.EXPO_PUBLIC_MIKWEB_TOKEN': JSON.stringify(env.EXPO_PUBLIC_MIKWEB_TOKEN || env.MIKWEB_TOKEN),
      'process.env.EXPO_PUBLIC_EFI_CLIENT_ID': JSON.stringify(env.EXPO_PUBLIC_EFI_CLIENT_ID || env.EFI_CLIENT_ID),
      'process.env.EXPO_PUBLIC_EFI_CLIENT_SECRET': JSON.stringify(env.EXPO_PUBLIC_EFI_CLIENT_SECRET || env.EFI_CLIENT_SECRET),
      'global': 'window',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react-native': 'react-native-web',
        'lucide-react-native': 'lucide-react',
      },
      extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx', '.json', '.jsx'],
    },
    optimizeDeps: {
      include: ['expo-linear-gradient', 'lucide-react'],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
        resolveExtensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx'],
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    }
  };
});
