/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hwc-red': '#EE2F27',
        'hwc-dark': '#292C30',
        'hwc-gray': '#6C6864',
        'hwc-light': '#DDD4CC',
      },
      fontFamily: {
        'sans': ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      gridTemplateColumns: {
        'auto-fit': 'repeat(auto-fit, minmax(250px, 1fr))',
      }
    },
  },
  plugins: [],
}