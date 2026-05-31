/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Primary brand teal (kept from the original spec)
        brand: {
          DEFAULT: '#0F6E56',
          600: '#0d5c49',
          700: '#0b4d3d',
        },
        // Deep forest scale used for the sidebar / dark surfaces
        forest: {
          50: '#eef4f1',
          100: '#d6e5dd',
          400: '#2f6f5b',
          600: '#11503e',
          700: '#0e4030',
          800: '#0a3325',
          900: '#07261c',
          950: '#041712',
        },
        // Champagne gold accent
        gold: {
          light: '#E4CE9E',
          DEFAULT: '#C9A86A',
          dark: '#A88945',
        },
        ivory: '#FAF8F3',
        sand: '#F1ECE1',
        ink: '#1F2A24',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.05)',
        soft: '0 6px 20px rgba(8,43,34,0.06)',
        lift: '0 14px 40px rgba(8,43,34,0.12)',
        gold: '0 8px 24px rgba(201,168,106,0.28)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      backgroundImage: {
        'forest-gradient': 'linear-gradient(170deg, #0a3325 0%, #07261c 55%, #041712 100%)',
        'gold-sheen': 'linear-gradient(135deg, #E4CE9E 0%, #C9A86A 50%, #A88945 100%)',
      },
      letterSpacing: {
        widest2: '0.22em',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
