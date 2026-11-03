/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F52BA', // Electric Royal Blue
          hover: '#1A56DB',
        },
        sidebar: {
          DEFAULT: '#0B132B', // Deep Slate Navy
          hover: '#1C2541',
        },
        canvas: {
          DEFAULT: '#F8FAFC', // Off-White
          alt: '#F1F5F9', // Soft Ice Gray
        },
        surface: {
          DEFAULT: '#FFFFFF', // Pure White
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
