import path from 'path';
import { copyFileSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'copy-static-web-app-config',
          closeBundle() {
            copyFileSync('staticwebapp.config.json', 'dist/staticwebapp.config.json');
          }
        }
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
