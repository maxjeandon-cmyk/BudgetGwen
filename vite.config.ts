import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages sert l app sous /BudgetGwen/ : les chemins d assets
  // doivent etre relatifs a cette racine, pas a la racine du domaine.
  base: '/BudgetGwen/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
})
