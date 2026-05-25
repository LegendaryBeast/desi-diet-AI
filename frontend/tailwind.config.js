/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: { 
          DEFAULT: '#F5F0E8', 
          dark: '#EDE6D6' 
        },
        ink: { 
          DEFAULT: '#1A1714', 
          muted: '#5C574F', 
          faint: '#9E9890' 
        },
        accent: { 
          DEFAULT: '#C8472A', 
          light: '#E8956E' 
        },
        gold: '#B8933E',
        forest: '#2C5530',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Space Grotesk', 'sans-serif'],
        bn: ['Noto Sans Bengali', 'Hind Siliguri', 'sans-serif'],
      },
      animation: {
        'marquee': 'marquee 30s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%': { transform: 'translateY(-18px) rotate(2deg)' },
          '66%': { transform: 'translateY(-8px) rotate(-1deg)' },
        }
      }
    },
  },
  plugins: [],
}
