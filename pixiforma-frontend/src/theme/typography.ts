const typography = {
  fontFamily: {
    sans: "'DM Sans', Helvetica, Arial, -apple-system, sans-serif",
    mono: "'DM Mono', monospace",
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  fontSize: {
    // Headings
    h1Desktop: { fontSize: '40px', lineHeight: 'auto', weight: '600' },
    h1App: { fontSize: '24px', lineHeight: '110%', weight: '600' },
    h2: { fontSize: '20px', lineHeight: 'auto', weight: '600' },
    h3: { fontSize: '20px', lineHeight: '110%', weight: '500' },

    // Subtitles
    subtitle: { fontSize: '19px', lineHeight: '110%', weight: '600' },

    // Body text (Sans)
    bodyLargeMedium: { fontSize: '16px', lineHeight: 'auto', weight: '500' },
    bodyMediumBold: { fontSize: '14px', lineHeight: '110%', weight: '700' },
    bodyMedium: { fontSize: '14px', lineHeight: '110%', weight: '500' },
    bodyRegular: { fontSize: '14px', lineHeight: '110%', weight: '400' },
    bodySmallMedium: { fontSize: '12px', lineHeight: '100%', weight: '500' },
    bodySmallRegular: { fontSize: '12px', lineHeight: '100%', weight: '400' },

    // Buttons and inputs
    button: { fontSize: '14px', lineHeight: 'auto', weight: '500' },
    input: { fontSize: '14px', lineHeight: 'auto', weight: '400' },

    // Mono font styles - flatten these
    monoSubtitle: { fontSize: '16px', lineHeight: '100%', weight: '500' },
    monoCaptionMedium: { fontSize: '14px', lineHeight: 'auto', weight: '500' },
    monoBodyMedium: { fontSize: '14px', lineHeight: '110%', weight: '400' },
    monoBodySmall: { fontSize: '12px', lineHeight: 'auto', weight: '400' },
    monoCaptionSmall: { fontSize: '12px', lineHeight: 'auto', weight: '400' },
  },
}

export default typography