import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { DailyPrizeWheelGate } from '@/components/DailyPrizeWheelGate';
import { AccountProvider } from '@/context/AccountContext';
import { CatalogProvider } from '@/context/CatalogContext';
import { CartProvider } from '@/context/CartContext';
import { OrdersProvider } from '@/context/OrdersContext';
import { ThemePreferenceProvider } from '@/context/ThemePreferenceContext';
import { WalletProvider } from '@/context/WalletContext';
import { StatusBar } from 'expo-status-bar';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Register the native splash before hiding; hide only after prevent resolves.
  // Fast refresh / some transitions can leave no splash VC — catch to avoid red errors.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await SplashScreen.preventAutoHideAsync().catch(() => {});
      if (cancelled || !loaded) return;
      await SplashScreen.hideAsync().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemePreferenceProvider>
      <RootLayoutNav />
    </ThemePreferenceProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <WalletProvider>
        <AccountProvider>
          <OrdersProvider>
            <CatalogProvider>
              <CartProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                </Stack>
                <DailyPrizeWheelGate />
              </CartProvider>
            </CatalogProvider>
          </OrdersProvider>
        </AccountProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
