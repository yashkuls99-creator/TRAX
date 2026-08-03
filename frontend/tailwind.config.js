/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7f5",
          100: "#dfece5",
          200: "#bcd9cb",
          300: "#8fbfab",
          400: "#5f9e85",
          500: "#3f8168",
          600: "#2f6852",
          700: "#275443",
          800: "#214437",
          900: "#1c392e",
          950: "#0d2018",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f7f7f5",
          muted: "#f0f0ee",
        },
        ink: {
          DEFAULT: "#1f1f1e",
          light: "#6b6b68",
          faint: "#9b9b97",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.06)",
        popover: "0 4px 16px rgba(0,0,0,0.10)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
