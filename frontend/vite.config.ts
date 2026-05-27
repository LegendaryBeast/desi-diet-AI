import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = {
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
  bypass: (req: any) => {
    if (req.headers.accept?.includes('text/html')) {
      return req.url; // Don't proxy HTML page requests
    }
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3421,
    proxy: {
      // Proxy all API calls to the FastAPI backend on port 8000
      '/auth': apiProxy,
      '/profile': apiProxy,
      '/health-logs': apiProxy,
      '/meal-plans': apiProxy,
      '/chat': apiProxy,
      '/foods': apiProxy,
      '/reports': apiProxy,
      '/meal-tracking': apiProxy,
      '/medicine-reminders': apiProxy,
      '/meal-builder': apiProxy,
      '/docs-api': { ...apiProxy, rewrite: (path: string) => path.replace(/^\/docs-api/, '/docs') },
    },
  },
})
