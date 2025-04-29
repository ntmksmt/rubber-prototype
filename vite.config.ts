import { defineConfig } from 'vite';
import { resolve } from 'path';
import autoprefixer from 'autoprefixer';
import glsl from 'vite-plugin-glsl';

// @ts-ignore
export default defineConfig(() => ({
  root: resolve(__dirname, 'src'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'docs'),
    emptyOutDir: true,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/scripts/main.js',
        assetFileNames: (assetFile) => {
          if(assetFile.name !== undefined) {
            if(/\.css$/.test(assetFile.name)) {
              return 'assets/styles/style.css';
            } else if(/\.(gif|jpeg|jpg|png|svg|webp)$/.test(assetFile.name)) {
              return 'assets/images/[name][extname]';
            } else if(/\.(eot|otf|ttf|woff|woff2)$/.test(assetFile.name)) {
              return 'assets/fonts/[name][extname]';
            } else if(/\.(glb|gltf)$/.test(assetFile.name)) {
              return 'assets/models/[name][extname]';
            }
          }
        }
      }
    }
  },
  css: {
    postcss: {
      plugins: [autoprefixer]
    }
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  plugins: [glsl({ compress: true })],
  server: {
    host: true,
    port: 50000,
    open: true
  },
  preview: {
    port: 50001,
    open: true
  }
}));
