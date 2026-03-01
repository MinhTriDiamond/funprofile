import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: mode === 'production' ? (id) => {
          if (id.includes('wagmi') || id.includes('viem') || id.includes('rainbowkit') || id.includes('@walletconnect')) {
            return 'vendor-web3';
          }
          if (id.includes('react-dom') || (id.includes('node_modules/react') && !id.includes('react-'))) {
            return 'vendor-react';
          }
          if (id.includes('react-router-dom')) {
            return 'vendor-router';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('@radix-ui')) {
            return 'vendor-ui';
          }
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor-utils';
          }
        } : undefined,
      },
    },
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 300,
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'eventemitter3',
    ],
    exclude: [
      // Exclude large libs - load on demand only when needed
      'recharts',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  // Performance hints
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
}));
