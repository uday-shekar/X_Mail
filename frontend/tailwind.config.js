module.exports = {
  // Ensure Tailwind scans all your component files
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // 1. Merge existing and new animation utilities
      animation: {
        // Existing
        "fade-in": "fadeIn 0.8s ease-in-out",
        "fade-in-down": "fadeInDown 0.8s ease-in-out",
        "fade-in-up": "fadeInUp 0.8s ease-in-out",
        "slide-in-left": "slideInLeft 0.5s ease-out",
        "slide-in-up": "slideInUp 0.5s ease-out",
        
        // New custom animations for the Login component
        "shake": "shake 0.5s ease-in-out 1",
        "pulse-slow": "pulseSlow 8s infinite ease-in-out", // Renamed keyframe to 'pulseSlow' for consistency
      },
      
      // 2. Merge existing and new keyframes
      keyframes: {
        // Existing keyframes
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        fadeInDown: {
          "0%": { opacity: 0, transform: "translateY(-20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)", opacity: 0 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        slideInUp: {
          "0%": { transform: "translateY(30px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },

        // New keyframes for the Login component
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
        pulseSlow: { // Keyframe definition matches 'pulse-slow' animation name
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
};