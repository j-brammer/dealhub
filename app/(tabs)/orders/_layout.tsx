import { Stack } from 'expo-router';

import { NativeStackBackButton } from '@/components/NativeStackBackButton';

export default function OrdersStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Orders',
        headerLeft: (props) => <NativeStackBackButton {...props} />,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Order details' }} />
    </Stack>
  );
}
