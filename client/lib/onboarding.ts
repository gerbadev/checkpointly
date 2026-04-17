import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "hasOnboarded_v1";

export async function getHasOnboarded(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === "1";
}

export async function setHasOnboarded(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, value ? "1" : "0");
}
