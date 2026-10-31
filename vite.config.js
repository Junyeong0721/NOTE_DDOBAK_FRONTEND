import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 이 PC는 공인 IP로 인터넷에 직접 연결돼 있어서, 개발 서버는 이 PC 안(localhost)에서만 연다.
    // iPad는 터널을 거쳐 접속한다: Cloudflare 임시 터널(*.trycloudflare.com) 또는 Tailscale 고정 주소(*.ts.net)
    allowedHosts: ['.trycloudflare.com', '.ts.net'],
    // /api 요청은 Spring Boot(8081)로 넘긴다. 브라우저 입장에서는 같은 주소라 CORS 설정이 필요 없다.
    proxy: {
      '/api': 'http://localhost:8081',
    },
  },
})
