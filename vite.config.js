import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  plugins: [
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag', '**/*.vs', '**/*.fs']
    })
  ],
  server: {
    host: true, // Allow mobile access via local IP
    port: 5173
  }
})
