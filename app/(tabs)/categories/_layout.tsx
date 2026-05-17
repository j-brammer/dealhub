import { Stack } from 'expo-router';

import { NativeStackBackButton } from '@/components/NativeStackBackButton';

export default function CategoriesStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          headerBackTitle: 'Categories',
          headerLeft: (props) => <NativeStackBackButton {...props} />,
        }}
      />
    </Stack>
  );
}
