import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), svgr()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: command === 'serve' ? '/' : '/save-timmy/'
}));
