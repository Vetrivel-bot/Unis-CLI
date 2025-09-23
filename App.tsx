import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, Button, View, StyleSheet, NativeModules } from "react-native";

const { SecureStorage } = NativeModules;

export default function App() {
  const [key, setKey] = useState("myKey");
  const [value, setValue] = useState("mySecret");
  const [output, setOutput] = useState<string | null>("");

  const run = async (fn: () => Promise<any>, successMessage?: string) => {
    try {
      const r = await fn();
      setOutput(successMessage ?? JSON.stringify(r));
    } catch (e: any) {
      setOutput("Error: " + (e?.message ?? JSON.stringify(e)));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🔐 Secure Storage Test</Text>
      <TextInput placeholder="Key" value={key} onChangeText={setKey} style={styles.input} />
      <TextInput placeholder="Value" value={value} onChangeText={setValue} style={styles.input} />
      <View style={styles.buttonRow}>
        <Button title="Save" onPress={() => run(() => SecureStorage.save(key, value), "Saved")} />
        {/* The successMessage was removed here to allow the result to be shown */}
        <Button title="Get" onPress={() => run(() => SecureStorage.get(key))} />
      </View>
      <View style={styles.buttonRow}>
        <Button title="Remove" onPress={() => run(() => SecureStorage.remove(key), "Removed")} />
        <Button title="Clear" onPress={() => run(() => SecureStorage.clear(), "Cleared")} />
      </View>
      <View style={styles.buttonRow}>
        <Button title="Save (with biometric)" onPress={() => run(() => SecureStorage.saveWithAuth(key, value), "Saved (auth)")} />
        {/* The successMessage was also removed here */}
        <Button title="Get (with biometric)" onPress={() => run(() => SecureStorage.getWithAuth(key))} />
      </View>
      <View style={styles.buttonRow}>
        <Button title="Rotate Key" onPress={() => run(() => SecureStorage.rotateMasterKey(), "Rotated")} />
        <Button title="Migrate StrongBox" onPress={() => run(() => SecureStorage.migrateToStrongBoxIfAvailable(), "Migrated")} />
      </View>

      <Text style={styles.output}>Output: {String(output)}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginVertical: 5, borderRadius: 8 },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 10 },
  output: { marginTop: 20, fontSize: 16, textAlign: "center" },
});
