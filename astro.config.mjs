// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://felixzhou05.github.io',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});