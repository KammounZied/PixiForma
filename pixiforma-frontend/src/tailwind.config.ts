import type { Config } from 'tailwindcss'
import colors from './theme/colors'
import spacings from './theme/spacings'
import typography from './theme/typography'
import ui from './theme/ui'
import zIndex from './theme/zIndex'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: colors,
      spacing: spacings,
      fontFamily: {
        sans: ['Lato', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Lato', 'monospace'],
      },
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      borderRadius: ui.radius,
      maxWidth: ui.maxWidths,
      screens: ui.breakPoints,
      zIndex: zIndex,
    },
  },
  plugins: [],
}
export default config
