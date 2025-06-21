import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:9000', // Puerto donde corre Netlify Dev o funciones locales
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/\.netlify\/functions/, ''),
      },
    },
  },
});
