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
          DEFAULT: '#FFFFFF', 
          dark: '#F5F5F5' 
        },
        ink: { 
          DEFAULT: '#1C2123', 
          muted: '#8C979A', 
          faint: '#B0B8BA' 
        },
        accent: { 
          DEFAULT: '#A7C924', 
          light: '#EAF0D1' 
        },
        gold: '#E4EB26',
        forest: '#2A6678',
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
