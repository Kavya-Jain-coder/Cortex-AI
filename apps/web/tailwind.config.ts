import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Direct golden token for one-off use
        golden: {
          DEFAULT: "hsl(45 100% 55%)",
          light:   "hsl(45 100% 70%)",
          dark:    "hsl(38 100% 45%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "boom-correct": {
          "0%":   { transform: "scale(1)" },
          "30%":  { transform: "scale(1.08)" },
          "50%":  { transform: "scale(0.96)" },
          "70%":  { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)" },
        },
        "shake-wrong": {
          "0%, 100%": { transform: "translateX(0)" },
          "15%":      { transform: "translateX(-6px)" },
          "30%":      { transform: "translateX(5px)" },
          "45%":      { transform: "translateX(-4px)" },
          "60%":      { transform: "translateX(3px)" },
          "75%":      { transform: "translateX(-2px)" },
        },
        "confetti-burst": {
          "0%":   { transform: "scale(0) rotate(0deg)", opacity: "1" },
          "50%":  { transform: "scale(1.2) rotate(180deg)", opacity: "0.8" },
          "100%": { transform: "scale(1.5) rotate(360deg)", opacity: "0" },
        },
        "score-pop": {
          "0%":   { transform: "scale(0) translateY(0)", opacity: "0" },
          "50%":  { transform: "scale(1.3) translateY(-12px)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(-20px)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.2s ease-out",
        "boom-correct":   "boom-correct 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "shake-wrong":    "shake-wrong 0.5s ease-out",
        "confetti-burst": "confetti-burst 0.7s ease-out forwards",
        "score-pop":      "score-pop 0.8s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
