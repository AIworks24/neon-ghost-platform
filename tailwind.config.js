/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neon Ghost Brand Colors
        neon: {
          pink: '#FF10F0',
          purple: '#B537F2',
          blue: '#00F0FF',
          green: '#39FF14',
        },
        dark: {
          900: '#0A0A0A',
          800: '#141414',
          700: '#1E1E1E',
          600: '#2A2A2A',
        }
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(135deg, #FF10F0 0%, #B537F2 50%, #00F0FF 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0A0A0A 0%, #1E1E1E 100%)',
      },
      boxShadow: {
        'neon-pink': '0 0 20px rgba(255, 16, 240, 0.5)',
        'neon-blue': '0 0 20px rgba(0, 240, 255, 0.5)',
        'neon-purple': '0 0 20px rgba(181, 55, 242, 0.5)',
      }
    },
  },
  plugins: [],
}