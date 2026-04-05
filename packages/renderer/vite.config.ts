
import { defineConfig, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import pkg from '../../package.json'

// https://vitejs.dev/config/

export default defineConfig({
  define: {
    // ... andere definierte Werte
    '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': false, // oder true, je nach Bedarf
    '__VUE_PROD_DEVTOOLS__': false
  },
  mode: process.env.NODE_ENV,
  root: __dirname,
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag === 'webview'
        }
      }
    }),
  ],
  base: './',
 
  build: {
    sourcemap: true,
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    minify: true,
    chunkSizeWarningLimit:5000,
  },
  css: {
    // Silence Bootstrap/Vite Sass deprecations until upstream migrates (no node_modules patches).
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: [
          'color-functions',
          'import',
          'global-builtin',
          'if-function',
          'legacy-js-api',
        ],
      },
    },
    postcss: {
      plugins: [
        {
          postcssPlugin: 'internal:charset-removal',
          AtRule: {
            charset: (atRule) => {
              if (atRule.name === 'charset') {
                atRule.remove();
              }
            }
          }
        },
        // New plugin to remove source map URL
        {
          postcssPlugin: 'remove-source-map-url',
          Once(css) {
            css.walkComments(comment => {
              if (comment.text.includes('sourceMappingURL')) {
                comment.remove();
              }
            });
          }
        }
      ]
    }
  },
  server: {
    port: pkg.env.PORT,
  },
})
