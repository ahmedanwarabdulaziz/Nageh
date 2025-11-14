/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0F0F0F',
          gold: '#C9A548',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'system-ui'],
        body: ['var(--font-body)', 'system-ui'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};



