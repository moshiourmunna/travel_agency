/** Musafir design tokens: the Tailwind 3.4 preset shared by frontend/ (Next.js) and backend/ (admin).
 *  Copied 1:1 from the approved mockup (tooling/tailwind.config.js); do not change values without updating docs/design-system.md. */
module.exports = {
  darkMode: 'class',
  theme: {
    container: { center: true, padding: { DEFAULT: '1rem', sm: '1.25rem', lg: '2rem' }, screens: { '2xl': '1320px' } },
    extend: {
      screens: { xs: '400px', '3xl': '1800px' },
      colors: {
        brand: { 50:'#EEFBF8',100:'#D3F4EE',200:'#A8E8DD',300:'#6FD5C6',400:'#38BBA9',500:'#14A497',600:'#0D867D',700:'#0D6B65',800:'#0F5652',900:'#0F4744',950:'#052B29' },
        accent:{ 50:'#FFF8EB',100:'#FEEBC8',200:'#FDD68C',300:'#FBBD55',400:'#F6A33B',500:'#EE8418',600:'#D2650F',700:'#AE4910',800:'#8D3914',900:'#743014' },
        gold:  { 50:'#FBF7EA',100:'#F5ECCB',200:'#EEDCA0',300:'#E8D08A',400:'#D9B95E',500:'#C9A13F',600:'#A9822C',700:'#866624' },
        ink:   { 50:'#F4F6F9',100:'#E7ECF2',200:'#CBD5E1',300:'#94A3B8',400:'#64748B',500:'#475569',600:'#334155',700:'#1E293B',800:'#122033',850:'#0E1A2A',900:'#0B1B2B',950:'#07131F' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Musafir Taka"', '"Hind Siliguri"', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        bn: ['"Hind Siliguri"', '"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11,27,43,.04), 0 8px 24px -8px rgba(11,27,43,.10)',
        lift: '0 2px 4px rgba(11,27,43,.05), 0 18px 40px -12px rgba(11,27,43,.22)',
        glow: '0 0 0 4px rgba(20,164,151,.18)',
      },
      borderRadius: { xl2: '1.25rem', '4xl': '2rem' },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'none' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        pulseDot: { '0%,100%': { transform: 'scale(1)', opacity: 1 }, '50%': { transform: 'scale(1.6)', opacity: .4 } },
      },
      animation: { fadeUp: 'fadeUp .5s ease both', marquee: 'marquee 40s linear infinite', pulseDot: 'pulseDot 2s ease-in-out infinite' },
    },
  },
  plugins: [],
};
