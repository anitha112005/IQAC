/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Sora", "sans-serif"],
        body: ["Manrope", "sans-serif"]
      },
      colors: {
        brand: {
          ink: "#112A46",
          ocean: "#0D6EFD",
          mint: "#66D1C1",
          flame: "#FF6B35",
          sand: "#F8F1E9"
        }
      }
    }
  },
  plugins: []
};
