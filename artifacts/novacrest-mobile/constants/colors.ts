/**
 * NovaCrest website design tokens (artifacts/kingsaint/src/index.css).
 * HSL values are converted to their website-equivalent hex colors.
 * The native app intentionally uses this dark theme on every device,
 * regardless of Android/iOS system appearance.
 */
const palette = {
  text: '#ebe8e0',             // foreground: 45 20% 90%
  tint: '#D9A520',             // primary: 43 74% 49%
  background: '#09090b',       // background: 240 10% 4%
  foreground: '#ebe8e0',
  card: '#0e0e11',             // card: 240 10% 6%
  cardForeground: '#ebe8e0',
  primary: '#D9A520',
  primaryForeground: '#09090b',
  secondary: '#1c1c22',        // secondary/muted: 240 10% 12%
  secondaryForeground: '#ebe8e0',
  muted: '#1c1c22',
  mutedForeground: '#a39e8f',  // muted foreground: 45 10% 60%
  accent: '#D9A520',
  accentForeground: '#09090b',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  border: '#2e2a1f',           // border/input: 43 20% 15%
  input: '#2e2a1f',
  success: '#22c55e',
  successForeground: '#ffffff',
  warning: '#f59e0b',
  warningForeground: '#09090b',
};

const colors = {
  light: palette,
  dark: palette,
  radius: 0,
};

export default colors;
