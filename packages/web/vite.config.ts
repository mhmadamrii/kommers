import path from 'node:path';

import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: { port: 3000 },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
  resolve: {
    // This enables built-in support for path aliases defined in tsconfig.json
    tsconfigPaths: true,
  },
});
