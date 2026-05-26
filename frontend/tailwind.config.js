/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a3a6b',
          light:   '#1e4d8c',
          dark:    '#102548',
        },
        accent: {
          DEFAULT: '#f26522',
          light:   '#f47d3a',
          dark:    '#d4531a',
        },
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
}
