/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./leetcode/index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-to-r": "linear-gradient(90deg, #38b2ac, #68d391)",
        "gradient-hover": "linear-gradient(90deg, #68d391, #38b2ac)",
      },
      backgroundClip: {
        text: "text",
      },
      textFillColor: {
        transparent: "transparent",
      },
      colors: {
        "teal-500": "#38b2ac",
        "green-500": "#68d391",
        "gray-500": "#a0aec0",
        "pg-background": "#E9F8EA",
        "pg-green": "#739786",
        "pg-green-dark": "#384442",
      },
    },
  },
  variants: {
    extend: {
      backgroundImage: ["hover"],
      transform: ["hover"],
      scale: ["hover"],
    },
  },
  plugins: [],
};
