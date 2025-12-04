/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // VoltX-inspired color palette
        background: "#0a0a0a",
        foreground: "#ffffff",
        card: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          foreground: "#ffffff",
        },
        primary: {
          DEFAULT: "#14f4c9",
          foreground: "#0a0a0a",
          50: "#ecfdf8",
          100: "#d1faf0",
          200: "#a7f3e1",
          300: "#6ee7cd",
          400: "#34d4b4",
          500: "#14f4c9",
          600: "#0a9a7e",
          700: "#0c7b66",
          800: "#0e6153",
          900: "#105046",
        },
        secondary: {
          DEFAULT: "#1a1a2e",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#1a1a1a",
          foreground: "#a1a1aa",
        },
        accent: {
          DEFAULT: "#14f4c9",
          foreground: "#0a0a0a",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: "rgba(20, 244, 201, 0.2)",
        input: "rgba(255, 255, 255, 0.1)",
        ring: "#14f4c9",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(20, 244, 201, 0.3)",
        "glow-lg": "0 0 40px rgba(20, 244, 201, 0.4)",
        "glow-sm": "0 0 10px rgba(20, 244, 201, 0.2)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glow-gradient":
          "radial-gradient(ellipse at center, rgba(20, 244, 201, 0.15) 0%, transparent 70%)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px rgba(20, 244, 201, 0.3)",
          },
          "50%": {
            boxShadow: "0 0 40px rgba(20, 244, 201, 0.5)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

