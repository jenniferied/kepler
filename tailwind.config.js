/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./testing/**/*.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#4ade80',
      },
      fontFamily: {
        'mono': ['"IBM Plex Mono"', 'monospace'],
        'pixel': ['"Press Start 2P"', 'cursive'],
      },
    },
  },
  plugins: [],
}
