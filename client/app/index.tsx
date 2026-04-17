import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { getToken } from "@/lib/auth";
import { API_URL } from "@/constants/api";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const token = await getToken();
        if (!mounted) return;

        if (!token) {
          router.replace("/login");
          return;
        }

        const res = await fetch(`${API_URL}/profile/identity`, {
            headers: { Authorization: `Bearer ${token}` },
        });


        if (!mounted) return;

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = await res.json();

        const onboardingCompleted = Boolean(data?.onboarding_completed);


        if (!onboardingCompleted) {
          router.replace("/(onboarding)/welcome");
          return;
        }

        router.replace("/(tabs)/habits");
      } catch (err) {
        if (mounted) router.replace("/login");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
