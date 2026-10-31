import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 같은 와이파이의 iPad에서 http://<PC주소>:5173 으로 접속할 수 있게 한다.
    host: true,
    // /api 요청은 Spring Boot(8080)로 넘긴다. 브라우저 입장에서는 같은 주소라 CORS 설정이 필요 없다.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
