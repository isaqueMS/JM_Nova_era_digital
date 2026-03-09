import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { transform } from 'esbuild';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Detecção automática de ambiente GitHub Pages
  const isProd = mode === 'production';
  const base = isProd ? '/JM_Nova_era_digital/' : './';

  return {
    base,
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'fix-expo-jsx',
        enforce: 'pre',
        async transform(code: string, id: string) {
          if (id.includes('node_modules') && id.endsWith('.js')) {
            if (code.includes('(<') || code.includes('<NativeLinearGradient') || code.includes('<Path')) {
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


    define: {},




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

