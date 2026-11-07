/** @type {import('tailwindcss').Config} */
// Dark product theme (design direction "D").
//
// Semantic tokens (canvas, panel, ink, muted, accent, ...) are what new code
// should use. The gray, primary and pale status scales below are remapped for
// a dark background so existing pages that use classes like text-gray-900,
// bg-gray-50, bg-primary-600 or bg-yellow-50 render correctly without edits:
// gray is inverted (900 = lightest ink, 50 = darkest canvas), primary is the
// violet accent, and the 50–200 status tints are dark washes with light text
// at 700–900. bg-white is mapped to the panel colour in index.css.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0B0D12',
        panel: '#11141B',
        'panel-2': '#171B24',
        field: '#0E1016',
        line: '#262B38',
        ink: '#F5F7FA',
        muted: '#9EA6B8',
        soft: '#808899',
        accent: {
          DEFAULT: '#6D5DF6',
          hover: '#7C6DFF',
          soft: 'rgba(135, 120, 255, 0.16)',
          text: '#B8AFFF',
        },
        gray: {
          50: '#0B0D12',
          100: '#171B24',
          200: '#262B38',
          300: '#323848',
          400: '#6B7385',
          500: '#808899',
          600: '#9EA6B8',
          700: '#BFC6D4',
          800: '#DCE1EA',
          900: '#F5F7FA',
        },
        primary: {
          50: '#1C1A33',
          100: '#24204A',
          200: '#332D6B',
          300: '#5B50C9',
          400: '#978AFF',
          500: '#8778FF',
          600: '#6D5DF6',
          700: '#7C6DFF',
          800: '#B8AFFF',
          900: '#D9D4FF',
        },
        secondary: {
          50: '#0F2418',
          100: '#133020',
          200: '#1E4630',
          300: '#2F6B48',
          400: '#34D399',
          500: '#10B981',
          600: '#10B981',
          700: '#34D399',
          800: '#86EFAC',
          900: '#BBF7D0',
        },
        blue: { 50: '#121A30', 100: '#18223F', 200: '#22305A', 700: '#A9C1FF', 800: '#BFD3FF', 900: '#DCE7FF' },
        purple: { 50: '#1C1633', 100: '#221A3B', 200: '#33275A', 700: '#CDB9FF', 800: '#D8C8FF', 900: '#EBE2FF' },
        green: { 50: '#0F2418', 100: '#133020', 200: '#1E4630', 700: '#86EFAC', 800: '#86EFAC', 900: '#BBF7D0' },
        yellow: { 50: '#2A2210', 100: '#332914', 200: '#4A3B14', 700: '#F5D78A', 800: '#F5D78A', 900: '#FBE9B7' },
        orange: { 50: '#2B1A10', 100: '#352014', 200: '#4D2E18', 700: '#FDBA8C', 800: '#FDBA8C', 900: '#FED7AA' },
        red: { 50: '#2A1416', 100: '#33181B', 200: '#4D2226', 700: '#FCA5A5', 800: '#FCA5A5', 900: '#FECACA' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
}
