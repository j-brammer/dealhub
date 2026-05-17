import { HeaderBackButton } from '@react-navigation/elements';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';
import { useNavigation } from 'expo-router';

/**
 * Native iOS 18+ stack back controls use a grouped “pill” background. This uses the JS
 * header back button so only the chevron + label show, matching classic navigation styling.
 */
export function NativeStackBackButton({ tintColor, label, canGoBack, href }: NativeStackHeaderBackProps) {
  const navigation = useNavigation();

  if (canGoBack === false) {
    return null;
  }

  return (
    <HeaderBackButton
      tintColor={tintColor}
      label={label}
      truncatedLabel="Back"
      displayMode="default"
      onPress={() => navigation.goBack()}
      href={href}
    />
  );
}
