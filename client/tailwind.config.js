/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",   // ✅ this makes Tailwind scan all React files
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
