import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Ensure this import is present
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()], // Ensure 'react()' is used in the plugins array
  base: './', // This is important for relative paths when deploying to subdirectories
});