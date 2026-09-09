/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1363DF',
          blueDark: '#0D4BAF',
          blueTint: '#EAF1FD',
          orange: '#FF8B26',
          orangeDark: '#E06F0A',
          orangeTint: '#FFF1E2',
          ink: '#101828',
          slate: '#475467',
          line: '#E4E7EC',
          bg: '#F7F8FA',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        script: ['Caveat', 'ui-serif', 'cursive'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)',
        panel: '0 4px 24px rgba(16, 24, 40, 0.08)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
};
