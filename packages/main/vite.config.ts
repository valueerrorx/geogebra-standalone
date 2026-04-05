import { builtinModules } from 'module'
import { defineConfig } from 'vite'
import pkg from '../../package.json'

export default defineConfig({
  define: {
    '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': false, // oder true, je nach Bedarf
    '__VUE_PROD_DEVTOOLS__': false
  },
  root: __dirname,
  build: {
    ssr: true, // SSR bundle keeps process.env at runtime (default client build stubs it as {} and breaks Electron).
    outDir: '../../dist/main',
    emptyOutDir: true,
    lib: {
      entry: 'main.ts',
      formats: ['cjs'],
      fileName: () => '[name].cjs',
    },
    minify: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: '[name].cjs',
      },
      external: [
        'electron',
        ...builtinModules,
        ...Object.keys(pkg.dependencies || {}),
      ],
    },
  },
})
