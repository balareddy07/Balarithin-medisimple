/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:          '#34C759',
        'primary-dark':   '#248A3D',
        'primary-light':  '#E8F8ED',
        'primary-mid':    '#D1F2DB',
        apple: {
          blue:     '#007AFF',
          'blue-light': '#EBF4FF',
          indigo:   '#5856D6',
          purple:   '#AF52DE',
          pink:     '#FF2D55',
          red:      '#FF3B30',
          orange:   '#FF9500',
          yellow:   '#FFCC00',
          teal:     '#30B0C7',
          green:    '#34C759',
        },
        sys: {
          bg:       '#F2F2F7',
          bg2:      '#FFFFFF',
          fill:     'rgba(120,120,128,0.12)',
          fill2:    'rgba(120,120,128,0.16)',
          label:    '#000000',
          label2:   '#3C3C43CC',
          label3:   '#3C3C4399',
          label4:   '#3C3C432E',
          sep:      '#C6C6C8',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"',
          '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif',
        ],
      },
      borderRadius: {
        ios:    '12px',
        'ios-lg': '16px',
        'ios-xl': '20px',
        'ios-2xl':'28px',
        'ios-3xl':'36px',
      },
      boxShadow: {
        card:     '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.05)',
        'card-md':'0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        'card-lg':'0 4px 16px rgba(0,0,0,0.10), 0 16px 40px rgba(0,0,0,0.08)',
        btn:      '0 2px 10px rgba(52,199,89,0.38)',
        'btn-blue':'0 2px 10px rgba(0,122,255,0.38)',
        float:    '0 8px 32px rgba(0,0,0,0.14)',
      },
      keyframes: {
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        springPop: {
          '0%':    { transform: 'scale(0.94)' },
          '55%':   { transform: 'scale(1.03)' },
          '100%':  { transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseDot: {
          '0%,100%': { opacity: '0.35', transform: 'scale(0.65)' },
          '50%':     { opacity: '1',    transform: 'scale(1)' },
        },
        floatUp: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'slide-up':   'slideUp 0.38s cubic-bezier(0.34,1.56,0.64,1) both',
        'fade-in':    'fadeIn 0.28s ease-out both',
        'scale-in':   'scaleIn 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
        'spring-pop': 'springPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        'shimmer':    'shimmer 1.6s ease-in-out infinite',
        'pulse-dot':  'pulseDot 1.4s ease-in-out infinite',
        'float-up':   'floatUp 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
