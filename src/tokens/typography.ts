import {Platform} from 'react-native';

const primarySans = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
}) as string;

export const typography = {
  // Kept as `serif` for compatibility with existing screen styles.
  serif: primarySans,
} as const;
