import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  NativeModules, 
  NativeEventEmitter, 
  StyleSheet, 
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Dimensions
} from 'react-native';

const { VpnModule } = NativeModules;
const vpnEventEmitter = new NativeEventEmitter(VpnModule);
const { width, height } = Dimensions.get('window');

export default function VpnScreen() {
  const [config, setConfig] = useState('');
  const [vpnStatus, setVpnStatus] = useState('Disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [connectionTime, setConnectionTime] = useState(null);
  const [configHistory, setConfigHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Comprehensive WireGuard config template
  const defaultConfig = `[Interface]
PrivateKey = YOUR_CLIENT_PRIVATE_KEY_HERE
Address = 10.0.0.2/32
DNS = 1.1.1.1, 8.8.8.8
# Optional: ListenPort = 51820
# Optional: MTU = 1420

[Peer]
PublicKey = YOUR_SERVER_PUBLIC_KEY_HERE
AllowedIPs = 0.0.0.0/0
Endpoint = your-server.com:51820
# Optional: PersistentKeepalive = 25
# Optional: PresharedKey = YOUR_PRESHARED_KEY_HERE`;

  useEffect(() => {
    // Load default config
    setConfig(defaultConfig);
    
    // Load config history from storage (you can implement AsyncStorage later)
    const loadConfigHistory = async () => {
      try {
        // Simulate loading from storage
        const savedConfigs = []; // await AsyncStorage.getItem('vpn_configs')
        setConfigHistory(savedConfigs);
      } catch (error) {
        console.error('Failed to load config history:', error);
      }
    };
    
    loadConfigHistory();

    // Set up event listeners
    const subscriptions = [
      vpnEventEmitter.addListener('VPN_STATE', (event) => {
        console.log('VPN State Event:', event);
        handleVpnStateChange(event);
      }),
      vpnEventEmitter.addListener('VPN_STATUS', (status) => {
        console.log('VPN Status Event:', status);
        handleVpnStatusChange(status);
      }),
      vpnEventEmitter.addListener('VPN_ERROR', (error) => {
        console.error('VPN Error Event:', error);
        handleVpnError(error);
      })
    ];

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, []);


  const handleVpnStateChange = (state) => {
  console.log('VPN State Received:', state);
  
  // Map various state messages to UI states
  const stateMap = {
    'CONNECTING': 'Connecting...',
    'CONNECTED': 'Connected',
    'UP': 'Connected', 
    'DOWN': 'Disconnected',
    'DISCONNECTED': 'Disconnected',
    'TOGGLE': 'Reconnecting...'
  };
  
  const displayState = stateMap[state] || state;
  setVpnStatus(displayState);
  
  if (state === 'UP' || state === 'CONNECTED') {
    setIsLoading(false);
    setConnectionTime(new Date());
  } else if (state === 'DOWN' || state === 'DISCONNECTED') {
    setIsLoading(false);
    setConnectionTime(null);
  } else if (state.includes('ERROR')) {
    setIsLoading(false);
    Alert.alert('Connection Error', state);
  }
};

const handleVpnStatusChange = (status) => {
  console.log('VPN Status Received:', status);
  
  // Handle status messages from VpnModule
  if (status === 'STARTED') {
    setVpnStatus('Connecting...');
  } else if (status === 'PERMISSION_REQUESTED') {
    setIsLoading(false);
    setPermissionRequested(true);
    setShowPermissionGuide(true);
    setVpnStatus('Permission Required');
  } else if (status === 'STOPPED') {
    setIsLoading(false);
    setVpnStatus('Disconnected');
    setConnectionTime(null);
  }
};

const handleVpnError = (error) => {
    setIsLoading(false);
    console.error('VPN Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    Alert.alert('❌ VPN Error', errorMessage);
    setVpnStatus('Error: ' + errorMessage);
  };

  const validateConfig = (configText) => {
    if (!configText.trim()) {
      return { isValid: false, error: 'Configuration cannot be empty' };
    }
    
    // Basic WireGuard config validation
    const lines = configText.split('\n');
    const hasInterface = lines.some(line => line.trim().startsWith('[Interface]'));
    const hasPeer = lines.some(line => line.trim().startsWith('[Peer]'));
    
    if (!hasInterface) {
      return { isValid: false, error: 'Missing [Interface] section' };
    }
    
    if (!hasPeer) {
      return { isValid: false, error: 'Missing [Peer] section' };
    }
    
    return { isValid: true, error: null };
  };

  const startVpn = async () => {
    const validation = validateConfig(config);
    if (!validation.isValid) {
      Alert.alert('Invalid Configuration', validation.error);
      return;
    }

    try {
      setIsLoading(true);
      setVpnStatus('Initializing...');
      
      // Save to history
      if (!configHistory.includes(config)) {
        const newHistory = [config, ...configHistory.slice(0, 4)];
        setConfigHistory(newHistory);
        // Save to AsyncStorage if needed
        // await AsyncStorage.setItem('vpn_configs', JSON.stringify(newHistory));
      }
      
      await VpnModule.startVpn(config);
    } catch (error) {
      console.error('Failed to start VPN:', error);
      Alert.alert('Error', 'Failed to start VPN service');
      setIsLoading(false);
      setVpnStatus('Connection Failed');
    }
  };

  const stopVpn = async () => {
    try {
      setIsLoading(true);
      setVpnStatus('Disconnecting...');
      await VpnModule.stopVpn();
    } catch (error) {
      console.error('Failed to stop VPN:', error);
      Alert.alert('Error', 'Failed to stop VPN service');
      setIsLoading(false);
    }
  };

  const checkPermission = async () => {
    try {
      const hasPermission = await VpnModule.checkVpnPermission();
      Alert.alert(
        'VPN Permission Status', 
        hasPermission 
          ? '✅ VPN permission is granted. You can connect to VPN.' 
          : '❌ VPN permission is not granted. You need to allow VPN access when prompted.'
      );
    } catch (error) {
      console.error('Permission check failed:', error);
      Alert.alert('Error', 'Failed to check VPN permission status');
    }
  };

  const loadConfigTemplate = () => {
    setConfig(defaultConfig);
  };

  const clearConfig = () => {
    setConfig('');
  };

  const parseConfigInfo = (configText) => {
    try {
      const interfaceMatch = configText.match(/Address\s*=\s*([^\s\r\n]+)/);
      const endpointMatch = configText.match(/Endpoint\s*=\s*([^\r\n]+)/);
      const privateKeyMatch = configText.match(/PrivateKey\s*=\s*([^\r\n]+)/);
      
      return {
        address: interfaceMatch ? interfaceMatch[1] : 'Not specified',
        endpoint: endpointMatch ? endpointMatch[1] : 'Not specified',
        hasPrivateKey: !!privateKeyMatch
      };
    } catch (error) {
      return { address: 'Unknown', endpoint: 'Unknown', hasPrivateKey: false };
    }
  };

  const configInfo = parseConfigInfo(config);

  const getStatusColor = () => {
    if (vpnStatus === 'UP' || vpnStatus === 'STARTED') return '#4CAF50';
    if (vpnStatus === 'DOWN' || vpnStatus === 'Disconnected') return '#F44336';
    if (vpnStatus.includes('Connecting') || vpnStatus.includes('Waiting')) return '#FF9800';
    if (vpnStatus.includes('Error')) return '#F44336';
    return '#666';
  };

  const getConnectionDuration = () => {
    if (!connectionTime) return null;
    const now = new Date();
    const diffMs = now - connectionTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🔒 WireGuard VPN</Text>
          <Text style={styles.subtitle}>Secure Your Connection</Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Connection Status</Text>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          </View>
          <Text style={styles.statusValue}>{vpnStatus}</Text>
          {connectionTime && (
            <Text style={styles.connectionTime}>
              Connected for: {getConnectionDuration()}
            </Text>
          )}
        </View>

        {/* Config Info Preview */}
        {config.trim() && (
          <View style={styles.configInfoCard}>
            <Text style={styles.configInfoTitle}>Configuration Preview</Text>
            <View style={styles.configInfoRow}>
              <Text style={styles.configInfoLabel}>Address:</Text>
              <Text style={styles.configInfoValue}>{configInfo.address}</Text>
            </View>
            <View style={styles.configInfoRow}>
              <Text style={styles.configInfoLabel}>Endpoint:</Text>
              <Text style={styles.configInfoValue}>{configInfo.endpoint}</Text>
            </View>
            <View style={styles.configInfoRow}>
              <Text style={styles.configInfoLabel}>Private Key:</Text>
              <Text style={[styles.configInfoValue, !configInfo.hasPrivateKey && styles.warning]}>
                {configInfo.hasPrivateKey ? '✓ Present' : '✗ Missing'}
              </Text>
            </View>
          </View>
        )}

        {/* Configuration Input */}
        <View style={styles.configSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>WireGuard Configuration</Text>
            <View style={styles.configActions}>
              <TouchableOpacity onPress={loadConfigTemplate} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>Template</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearConfig} style={[styles.smallButton, styles.clearButton]}>
                <Text style={styles.smallButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TextInput
            style={styles.configInput}
            placeholder="Paste your complete WireGuard configuration here..."
            placeholderTextColor="#999"
            value={config}
            onChangeText={setConfig}
            multiline
            textAlignVertical="top"
            editable={!isLoading}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.connectButton, isLoading && styles.buttonDisabled]}
            onPress={startVpn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>🚀 Connect VPN</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.disconnectButton]}
            onPress={stopVpn}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>⏹️ Disconnect VPN</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.permissionButton]}
            onPress={checkPermission}
          >
            <Text style={styles.buttonText}>🔐 Check Permission</Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>💡 Need Help?</Text>
          <Text style={styles.helpText}>
            • First time? Tap "Connect VPN" and allow the system permission{'\n'}
            • Make sure your config includes [Interface] and [Peer] sections{'\n'}
            • Replace the template values with your actual server details
          </Text>
        </View>

        {/* Permission Requested Banner */}
        {permissionRequested && (
          <TouchableOpacity 
            style={styles.permissionBanner}
            onPress={() => setShowPermissionGuide(true)}
          >
            <Text style={styles.permissionBannerText}>
              ⚠️ VPN Permission Required - Tap for instructions
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Permission Guide Modal */}
      <Modal
        visible={showPermissionGuide}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPermissionGuide(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔐 VPN Permission Required</Text>
            
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>System dialog will appear shortly</Text>
            </View>
            
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>✅ Check "I trust this application"</Text>
            </View>
            
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Tap "OK" to grant permission</Text>
            </View>
            
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>VPN will connect automatically</Text>
            </View>
            
            <Text style={styles.modalNote}>
              This is a one-time security requirement by Android. 
              Your connection data is encrypted and secure.
            </Text>

            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowPermissionGuide(false)}
            >
              <Text style={styles.modalButtonText}>Understood 👍</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    minHeight: height
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
    paddingTop: 10
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500'
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e'
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5
  },
  connectionTime: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic'
  },
  configInfoCard: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db'
  },
  configInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2980b9',
    marginBottom: 10
  },
  configInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  configInfoLabel: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500'
  },
  configInfoValue: {
    fontSize: 12,
    color: '#34495e',
    fontWeight: '600'
  },
  warning: {
    color: '#e74c3c'
  },
  configSection: {
    marginBottom: 25
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50'
  },
  configActions: {
    flexDirection: 'row'
  },
  smallButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8
  },
  clearButton: {
    backgroundColor: '#e74c3c'
  },
  smallButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  configInput: {
    borderWidth: 2,
    borderColor: '#dfe6e9',
    padding: 15,
    height: 200,
    textAlignVertical: 'top',
    backgroundColor: 'white',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  actionButtons: {
    marginBottom: 20
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  connectButton: {
    backgroundColor: '#27ae60'
  },
  disconnectButton: {
    backgroundColor: '#e74c3c'
  },
  permissionButton: {
    backgroundColor: '#3498db'
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  helpSection: {
    backgroundColor: '#fff9e6',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12'
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e67e22',
    marginBottom: 8
  },
  helpText: {
    fontSize: 12,
    color: '#7f8c8d',
    lineHeight: 16
  },
  permissionBanner: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginTop: 15
  },
  permissionBannerText: {
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    width: width * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50'
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  stepNumber: {
    backgroundColor: '#3498db',
    color: 'white',
    fontWeight: 'bold',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12
  },
  stepText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1
  },
  modalNote: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    fontStyle: 'italic',
    lineHeight: 16
  },
  modalButton: {
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});