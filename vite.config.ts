import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  // Sem isso, o Vite bloqueia qualquer Host header que não seja localhost ou
  // um IP que ele mesmo detectou (proteção contra DNS rebinding) — inclusive
  // o hostname MagicDNS do Tailscale (*.ts.net). Como o servidor só é
  // alcançável dentro do tailnet (a ACL do Tailscale já é o perímetro de
  // segurança real aqui), desligar essa checagem é seguro.
  server: {
    allowedHosts: true,
    // Permite VITE_API_BASE_URL=/api (relativo) também em dev local, onde
    // frontend (5173) e backend (8080) são origens diferentes. Em produção
    // via Tailscale Serve, quem faz esse roteamento é o proprio `tailscale
    // serve --set-path=/api`, então esse proxy nunca entra em ação ali.
    proxy: { '/api': 'http://localhost:8080' },
  },
  preview: { allowedHosts: true },
})
