import { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "./src/theme";
import PulseScreen from "./src/screens/PulseScreen";
import CustomersScreen from "./src/screens/CustomersScreen";
import AlertsScreen from "./src/screens/AlertsScreen";

// Appendix A mobile screen inventory: Login; Business Pulse; company
// switch; customers; customer detail; invoices; stock search; reports;
// alerts; share; profile/session. This scaffold wires Pulse, Customers and
// Alerts as real screens; the rest follow the same pattern.
type Tab = "pulse" | "customers" | "alerts";

const TABS: { key: Tab; label: string }[] = [
  { key: "pulse", label: "Pulse" },
  { key: "customers", label: "Customers" },
  { key: "alerts", label: "Alerts" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("pulse");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={styles.header}>
        <Text style={styles.title}>OneAll</Text>
        <Text style={styles.subtitle}>{TABS.find((t) => t.key === tab)?.label}</Text>
      </View>

      <View style={styles.body}>
        {tab === "pulse" && <PulseScreen />}
        {tab === "customers" && <CustomersScreen />}
        {tab === "alerts" && <AlertsScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={styles.tabButton} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.navy, padding: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  body: { flex: 1 },
  tabBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#fff" },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabLabel: { fontSize: 11, color: colors.muted },
  tabLabelActive: { color: colors.navy, fontWeight: "700" },
});
