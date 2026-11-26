import colors from '@/constants/colors';

/**
 * NovaCrest uses the same fixed dark palette as its website.
 * Do not switch to a light/native system theme: the product design is dark
 * with gold accents on both Android and iOS.
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
