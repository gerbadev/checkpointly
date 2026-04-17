import { Stack } from 'expo-router';
export const unstable_settings = {
  initialRouteName: 'index',
};
export default function HabitsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="share/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="create/index" options={{ headerShown: false }} />
    </Stack>
  );
}
