import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a1a1a', // Charcoal/Black
          light: '#333333',
        },
        accent: {
          DEFAULT: '#dc2626', // Red
          light: '#ef4444',
          dark: '#b91c1c',
        },
      },
    },
  },
  plugins: [],
}
export default config
