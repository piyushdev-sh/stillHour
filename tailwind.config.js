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
        cream: {
          50: '#F5EFEB',  // Calming warm beige app background
          100: '#EFE8DD', // Soft parchment card surface (no harsh white)
          200: '#E6DECF', // Subdued inner containers & inputs
          300: '#D8CEBC', // Warm delicate borders
          400: '#C7BAA5',
          500: '#AA9A83',
        },
        espresso: {
          950: '#1E1815',
          900: '#28211E', // Rich dark roast text
          800: '#38302C',
          700: '#4C423E',
          600: '#685D57', // Secondary muted text
          500: '#8B7E77',
          400: '#B0A39C',
          300: '#D2C8C2',
          200: '#E8E2DE',
        },
        lilac: {
          50: '#F5F1F7',
          100: '#EBE3F0',
          200: '#DDD0E6',
          300: '#C5B2D4',
          400: '#A990BD',
          500: '#8C739E', // Muted serene lilac
          600: '#775D89',
          700: '#614972',
          800: '#4B365A',
        },
        sage: {
          50: '#F2F6F2',
          100: '#E2ECE2',
          200: '#C9DBC9',
          300: '#A8C2A8',
          400: '#85A585',
          500: '#678867',
          600: '#506E50',
        },
        charcoal: {
          950: '#161312', // Deep warm dark mode background
          900: '#1C1816',
          850: '#241F1D', // Dark card surface
          800: '#2E2825',
          750: '#3B3430', // Dark borders
          700: '#4A423D',
          600: '#685E58',
        },
        lavender: {
          100: '#ECE4F2',
          200: '#DDD0E8',
          300: '#C8B6D8',
          400: '#B59EC8',
          500: '#9F84B5',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        serif: ['"Fraunces"', 'serif'],
        display: ['"Fraunces"', 'serif'],
      }
    },
  },
  plugins: [],
}
