import { FlatList, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

// Section 4.2 customer master, filtered to the assigned-salesperson record
// scope for Salesperson role (Section 3.3). Static list here; wire to
// GET /companies/:id/customers via the same @oneall/shared-typed client
// pattern used in apps/web/src/api/client.ts.
const customers = [
  { id: "1", name: "Doha Steel Traders", balance: "QAR 24,500", note: "18 days overdue" },
  { id: "2", name: "Rayyan Auto Parts", balance: "QAR 9,800", note: "6 days overdue" },
  { id: "3", name: "Al Sadd Restaurant Supplies", balance: "QAR 0", note: "Current" },
];

export default function CustomersScreen() {
  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={customers}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.name}>{item.balance}</Text>
          </View>
          <Text style={styles.note}>{item.note}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontWeight: "700", fontSize: 13, color: colors.text },
  note: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
