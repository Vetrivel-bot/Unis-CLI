import React, { useState } from "react";
import { View, TextInput, Button } from "react-native";
import { NativeModules } from "react-native";

const { VpnModule } = NativeModules;

export default function ConfigScreen() {
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [address, setAddress] = useState("10.0.0.2/32");
  const [dns, setDns] = useState("1.1.1.1");

  const startVpn = () => {
    const config = `
      [Interface]
      PrivateKey = ${privateKey}
      Address = ${address}
      DNS = ${dns}

      [Peer]
      PublicKey = ${publicKey}
      Endpoint = ${endpoint}
      AllowedIPs = 0.0.0.0/0, ::/0
    `;
    VpnModule.startVpn(config);
  };

  return (
    <View>
      <TextInput placeholder="Private Key" value={privateKey} onChangeText={setPrivateKey} />
      <TextInput placeholder="Server Public Key" value={publicKey} onChangeText={setPublicKey} />
      <TextInput placeholder="Endpoint (host:port)" value={endpoint} onChangeText={setEndpoint} />
      <TextInput placeholder="Address" value={address} onChangeText={setAddress} />
      <TextInput placeholder="DNS" value={dns} onChangeText={setDns} />
      <Button title="Start VPN" onPress={startVpn} />
    </View>
  );
}
