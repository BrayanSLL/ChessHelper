/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'chess-dark': '#769656',
        'chess-light': '#eeeed2',
        'panel-bg': '#262522',
        'panel-border': '#3d3935',
      },
    },
  },
  plugins: [],
}
