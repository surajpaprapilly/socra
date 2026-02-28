/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0D0C0A",
        amber: "#C8963E",
        sage: "#7A9E7E",
        borderDark: "#2A2825",
        textDefault: "#E8E6E3",
        textMuted: "#A3A09A"
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        mono: ['"DM Mono"', "monospace"],
        serif: ['"Lora"', "serif"]
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
