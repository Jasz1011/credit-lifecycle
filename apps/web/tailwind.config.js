/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102A43',
        slatebank: '#334E68',
        mist: '#F3F6F8',
        line: '#D9E2EC',
        tealbank: '#087E72',
        tealdeep: '#065F57',
        amberbank: '#B7791F',
        danger: '#B42318'
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace']
      },
      boxShadow: {
        panel: '0 12px 32px rgba(16, 42, 67, 0.07)'
      }
    }
  },
  plugins: []
};

