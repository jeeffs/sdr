import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Desativa o comportamento padrão de copiar pasta public/ como assets estáticos
  // (já que public/ É o nosso diretório de saída)
  publicDir: false,
  build: {
    // Modo biblioteca: gera um único arquivo IIFE
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'SDR',
      fileName: () => 'sdr-bundle.js',
      formats: ['iife']
    },
    outDir: 'public',
    // CRÍTICO: não apagar os arquivos existentes em public/
    emptyOutDir: false,
    // Remove console.log e console.warn do bundle em produção
    // console.error é mantido (erros reais continuam visíveis)
    minify: 'terser',
    terserOptions: {
      compress: {
        pure_funcs: ['console.log', 'console.warn'],
        drop_debugger: true,
        passes: 1
      },
      mangle: false,       // mantém nomes legíveis
      format: {
        beautify: true,    // mantém código formatado
        comments: 'all'    // mantém comentários
      }
    },
    rollupOptions: {
      output: {
        // Bibliotecas CDN já carregadas no HTML — não incluir no bundle
        // Leaflet está em window.L, Firebase em window.firebase
        inlineDynamicImports: true
      }
    }
  }
})
