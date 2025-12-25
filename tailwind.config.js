/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          850: '#1c1917',
          950: '#0c0a09',
        },
        art: {
          red: '#D93838',    // Matching the red bottle
          yellow: '#F2C029', // Matching the yellow bottle
          blue: '#2B5BA6',   // Matching the blue bottle
          wood: '#8C6A4B',   // Matching the brushes
        }
      },
      animation: {
        'float': 'float 8s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulse-glow 3s infinite', // Ensure custom animation is recognized
      }
    },
  },
  plugins: [],
}