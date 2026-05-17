import { Stack } from 'expo-router';

import { NativeStackBackButton } from '@/components/NativeStackBackButton';

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="product/[id]"
        options={{
          headerShown: true,
          title: 'Product',
          headerBackTitle: 'Back',
          headerLeft: (props) => <NativeStackBackButton {...props} />,
        }}
      />
    </Stack>
  );
}
