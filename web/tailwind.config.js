/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B0F19',
          800: '#111827',
          700: '#1F2937',
          600: '#374151',
        },
        gold: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        purple: {
          500: '#A855F7',
          600: '#9333EA',
        }
      }
    },
  },
  plugins: [],
}
