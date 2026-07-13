module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316', // Primary Orange
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        // Flat neutral palette
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#FAFAFA',
          tertiary: '#F5F5F5',
          elevated: '#FFFFFF',
          dark: '#0F172A',
          'dark-secondary': '#1E293B',
        },
        ink: {
          DEFAULT: '#171717',
          secondary: '#404040',
          muted: '#737373',
          light: '#A3A3A3',
          inverse: '#FFFFFF',
        },
        line: {
          DEFAULT: '#E5E5E5',
          light: '#F0F0F0',
          focus: '#F97316',
        },
      },
      fontFamily: {
        sans: ['BeVietnamPro', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        '3xl': ['30px', '38px'],
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-top': 'env(safe-area-inset-top, 0px)',
      },
      borderRadius: {
        flat: '0px',
        soft: '4px',
        smooth: '8px',
      },
      boxShadow: {
        'flat-sm': '0 1px 0 0 rgba(0,0,0,0.05)',
        'flat-md': '0 1px 0 0 rgba(0,0,0,0.08)',
        'flat-lg': '0 1px 0 0 rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
