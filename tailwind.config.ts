import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  // Light only (docs/DECISIONS.md, 2026-10-09). Kept on "class" rather than
  // removed: the default is "media", which would switch on the vendored
  // shadcn dark: variants under an OS dark preference. No element ever
  // carries the class.
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // A mouse or a trackpad: the model grid's rows close up to 28px, and
      // stay 44px under a finger (sheet-first PRD D-S3).
      screens: {
        "pointer-fine": { raw: "(pointer: fine)" },
      },
      fontFamily: {
        // Read from CSS custom properties so the family is defined once, in
        // src/index.css, and never named inside a component.
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        display: ["var(--font-display)"],
        hero: ["var(--font-hero)"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          // Alias of DEFAULT since the accent became navy — the accent now
          // clears AA as text on its own (8.20:1 on the card). See the note
          // in src/index.css.
          text: "hsl(var(--accent-text))",
        },
        // Green, reserved for exactly two jobs: the Green Transition
        // section's identity and success states. Never an accent.
        "section-green": "hsl(var(--section-green))",
        // The editorial accent — one token, five roles (blockquote rail,
        // link-popover focus ring, popover primary buttons, "New" badge,
        // palette THEME swatches). See src/index.css.
        "accent-editorial": "hsl(var(--accent-editorial))",
        "prose-fg": "var(--prose-ink)",
        "prose-muted": "var(--prose-muted-ink)",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          light: "hsl(var(--card-light))",
          "light-foreground": "hsl(var(--card-light-foreground))",
        },
        header: {
          DEFAULT: "hsl(var(--header-bg))",
          foreground: "hsl(var(--header-foreground))",
        },
        "button-dark": {
          DEFAULT: "hsl(var(--button-dark))",
          foreground: "hsl(var(--button-dark-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        link: {
          primary: "hsl(var(--link-primary))",
        },
        nav: {
          active: "hsl(var(--nav-active))",
        },
        // Finance in Action roles (brief v3.1 §6); values in src/index.css.
        fia: {
          sourced: "hsl(var(--fia-sourced))",
          "assumption-bg": "hsl(var(--fia-assumption-bg))",
          "assumption-fg": "hsl(var(--fia-assumption-fg))",
          missing: "hsl(var(--fia-missing))",
          cost: "hsl(var(--fia-cost))",
          unsplit: "hsl(var(--fia-unsplit))",
          precedent: "hsl(var(--fia-precedent))",
          dependent: "hsl(var(--fia-dependent))",
          changed: "hsl(var(--fia-changed))",
          edited: "hsl(var(--fia-edited))",
        },
        // The consolidation working paper (PRD site sweep 2026-10, R4.5); values in src/index.css.
        wb: {
          red: "hsl(var(--wb-red))",
          blue: "hsl(var(--wb-blue))",
          "error-bg": "hsl(var(--wb-error-bg))",
          "error-fg": "hsl(var(--wb-error-fg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate, typography],
} satisfies Config;
