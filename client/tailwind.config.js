/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.js',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};


