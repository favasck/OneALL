import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

// Business Pulse — Section 6.2: every metric shows company, date range,
// currency and last-update time. Placeholder values; wire to
// GET /companies/:id/reports/pulse once that endpoint exists.
const kpis = [
  { label: "Today's sales", value: "QAR 12,450" },
  { label: "Cash & bank", value: "QAR 84,200" },
  { label: "Receivables", value: "QAR 156,300" },
  { label: "Payables", value: "QAR 42,100" },
];

export default function PulseScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.subtitle}>Al Waha Trading Co. · Doha · updated 3 min ago</Text>
      <View style={styles.syncBanner}>
        <Text style={styles.syncText}>Tally synced 8 min ago</Text>
      </View>
      {kpis.map((k) => (
        <View style={styles.kpiCard} key={k.label}>
          <Text style={styles.kpiLabel}>{k.label}</Text>
          <Text style={styles.kpiValue}>{k.value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  subtitle: { color: colors.muted, fontSize: 12, marginBottom: 10 },
  syncBanner: {
    backgroundColor: "#E6F4EA",
    borderColor: "#BFE3CA",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  syncText: { color: colors.green, fontSize: 12 },
  kpiCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  kpiLabel: { color: colors.muted, fontSize: 11, textTransform: "uppercase" },
  kpiValue: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
});
