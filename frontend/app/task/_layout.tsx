import { Stack } from 'expo-router';

export default function TaskLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="rate" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
