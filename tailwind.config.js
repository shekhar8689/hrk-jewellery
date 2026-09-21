/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fdf8f5',
          100: '#f9ede3',
          200: '#f2d5be',
          300: '#e8b48e',
          400: '#d98a58',
          500: '#c4662c',
          600: '#a35020',
          700: '#7f3c17',
          800: '#5c2b0f',
          900: '#391b09',
        },
        navy: {
          500: '#1B2B4B',
          600: '#142240',
          700: '#0e1830',
          800: '#080f20',
          900: '#040810',
        },
        cream: '#F8F5F1',
        ivory: '#EFE8DF',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
