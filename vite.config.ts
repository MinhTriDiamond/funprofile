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
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Web3 libs - separate chunk, only loaded on Wallet page
          if (id.includes('wagmi') || id.includes('viem') || id.includes('rainbowkit') || id.includes('@walletconnect')) {
            return 'vendor-web3';
          }
          // Core React - load first
          if (id.includes('react-dom') || (id.includes('node_modules/react') && !id.includes('react-'))) {
            return 'vendor-react';
          }
          if (id.includes('react-router-dom')) {
            return 'vendor-router';
          }
          // Data layer
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          // UI libraries
          if (id.includes('@radix-ui/react-dialog') || 
              id.includes('@radix-ui/react-dropdown-menu') ||
              id.includes('@radix-ui/react-popover') ||
              id.includes('@radix-ui/react-tooltip') ||
              id.includes('@radix-ui/react-avatar')) {
            return 'vendor-ui-core';
          }
          if (id.includes('@radix-ui/react-checkbox') ||
              id.includes('@radix-ui/react-label') ||
              id.includes('@radix-ui/react-select') ||
              id.includes('@radix-ui/react-tabs')) {
            return 'vendor-ui-forms';
          }
          // Charts - loaded when needed
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          // Utils
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor-utils';
          }
        },
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
      // Include web3 libs for stable lazy-loading (prevents dynamic import failures)
      'wagmi',
      'viem', 
      '@rainbow-me/rainbowkit',
    ],
    exclude: [
      // Exclude large charts lib - load on demand
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
