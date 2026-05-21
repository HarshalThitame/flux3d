module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        flux: {
          900: '#2e1065',
          800: '#3b0764',
          700: '#4c1d95',
          600: '#6d28d9',
          500: '#7c3aed',
          400: '#8b5cf6',
          300: '#a78bfa',
          200: '#ddd6fe',
          100: '#ede9fe',
          50: '#f5f3ff',
        },
      },
      backgroundImage: {
        'flux-gradient': 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)',
        'flux-gradient-hover': 'linear-gradient(135deg, #3b0764 0%, #4c1d95 50%, #6d28d9 100%)',
        'flux-gradient-soft': 'linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%)',
        'flux-gradient-dark': 'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)',
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
}
