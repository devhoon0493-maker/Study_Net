import { TYPE_SIZE, TYPE_WEIGHT } from "../constants/designTokens";
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: TYPE_SIZE.subheading,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: TYPE_SIZE.subheading,
    lineHeight: 24,
    fontWeight: TYPE_WEIGHT.semibold,
  },
  title: {
    fontSize: TYPE_SIZE.display,
    fontWeight: TYPE_WEIGHT.bold,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: TYPE_SIZE.titleLarge,
    fontWeight: TYPE_WEIGHT.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: TYPE_SIZE.subheading,
    color: '#0a7ea4',
  },
});
