import React, { useState } from "react";
import { View } from "react-native";
import { Calendar } from "react-native-calendars";
import { useThemeColors } from "@/state/UserPreferencesContext";

export default function CalendarBox() {
  const [selected, setSelected] = useState("");

  const colors = useThemeColors();

  return (
    <View style={{ padding: 16, backgroundColor: colors.glass, borderRadius: 16, marginTop: 20 }}>

      <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.glassBorder }}>
        <Calendar
          onDayPress={(day: any) => setSelected(day.dateString)}
          markedDates={{
            [selected]: { selected: true, selectedColor: colors.primary }, 
          }}
          theme={{
            backgroundColor: colors.surface,
            calendarBackground: colors.surface,
            dayTextColor: colors.text,
            monthTextColor: colors.text,
            arrowColor: colors.text,
            todayTextColor: colors.primary,
            textDisabledColor: colors.faint,
          }}
        />
      </View>
    </View>
  );
}
