import { FlatList, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

// Section 6.3 initial notification set.
const alerts = [
  "Doha Steel Traders receivable is 18 days overdue",
  "Cement 50kg is below reorder level (18 / 50)",
  "Rayyan Auto Parts is approaching its credit limit",
  "Tally connector last synced 8 minutes ago",
  "New sign-in from Chrome — Windows desktop",
];

export default function AlertsScreen() {
  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={alerts}
      keyExtractor={(item) => item}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.text}>{item}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderLeftColor: colors.navy,
    borderLeftWidth: 4,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  text: { fontSize: 12, color: colors.text },
});
