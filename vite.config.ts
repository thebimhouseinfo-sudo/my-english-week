import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: '/my-english-week/',

    plugins: [
      react(),
      tailwindcss(),
      basicSsl(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      https: true as any,
      host: true,

      hmr: process.env.DISABLE_HMR !== 'true',

      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {},
    },
  };
});
