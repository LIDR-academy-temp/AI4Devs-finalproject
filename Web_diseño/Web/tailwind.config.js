/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./wwwroot/**/*.html",
    "./Views/**/*.cshtml",
    "./Views/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#043b44', hover: '#032830', light: '#e6f3f5' },
        secondary: { DEFAULT: '#4192a3', hover: '#357a89', light: '#e8f4f7' },
        accent: { DEFAULT: '#f84a36', hover: '#e03e2b', light: '#fef2f0' },
        surface: '#ffffff',
        background: '#f8fafb',
        'text-primary': '#1a2e32',
        'text-secondary': '#5a7278',
        'text-muted': '#8fa3a8',
        border: '#e2eaec',
        'border-light': '#f0f4f5',
      },
      fontFamily: { inter: ['Inter', 'sans-serif'] },
      borderRadius: { 'sm': '6px', 'md': '8px', 'lg': '12px', 'xl': '16px' },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'md': '0 4px 6px -1px rgba(0,0,0,0.1)',
        'lg': '0 10px 15px -3px rgba(0,0,0,0.1)',
        'sidebar': '4px 0 24px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}