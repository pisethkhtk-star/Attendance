import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

export default function App() {
  // Routes: 'loading' | 'login' | 'dashboard' | 'scanner'
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Login credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // API URL Config (Allows changing on Login screen for LAN testing)
  const [apiUrl, setApiUrl] = useState('http://192.168.88.165:5050/api');

  // Scanner status
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { success: boolean, message: string }

  // Load saved token & API URL on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        const storedUser = await SecureStore.getItemAsync('userData');
        const storedApiUrl = await SecureStore.getItemAsync('apiUrl');

        if (storedApiUrl) {
          setApiUrl(storedApiUrl);
        }

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setCurrentScreen('dashboard');
        } else {
          setCurrentScreen('login');
        }
      } catch (err) {
        console.error('Error loading session:', err);
        setCurrentScreen('login');
      }
    };
    loadSession();
  }, []);

  // Request GPS permission on load
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'ការអនុញ្ញាតទីតាំង (GPS Permission)',
          'កម្មវិធីនេះត្រូវការសិទ្ធិប្រើប្រាស់ទីតាំង GPS ដើម្បីធ្វើការផ្ទៀងផ្ទាត់ Geofencing។'
        );
      }
    })();
  }, []);

  // Login execution
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('បញ្ចូលព័ត៌មាន', 'សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់របស់អ្នក។');
      return;
    }

    setCurrentScreen('loading');
    try {
      // Save API URL configuration
      await SecureStore.setItemAsync('apiUrl', apiUrl);

      const res = await axios.post(`${apiUrl}/auth/login`, {
        email: email.trim(),
        password
      });

      if (res.data && res.data.token) {
        const userToken = res.data.token;
        const userData = JSON.stringify(res.data.user);

        // Store session securely
        await SecureStore.setItemAsync('userToken', userToken);
        await SecureStore.setItemAsync('userData', userData);

        setToken(userToken);
        setUser(res.data.user);
        setCurrentScreen('dashboard');
      } else {
        Alert.alert('បរាជ័យ', 'គណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវឡើយ។');
        setCurrentScreen('login');
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'មិនអាចតភ្ជាប់ទៅកាន់ API Server ឡើយ។ សូមពិនិត្យ IP Address របស់បង។';
      Alert.alert('កំហុសនៃការភ្ជាប់ (Connection Error)', msg);
      setCurrentScreen('login');
    }
  };

  // Logout execution
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      setToken(null);
      setUser(null);
      setCurrentScreen('login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Fill quick login credentials
  const fillQuickCredentials = (qEmail, qPassword) => {
    setEmail(qEmail);
    setPassword(qPassword);
  };

  // QR Code scanned handler
  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setScanLoading(true);
    setScanResult(null);

    try {
      // 1. Fetch current GPS location coordinates
      let locationRes = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = locationRes.coords;

      // 2. Send QR scan check-in payload to backend
      const response = await axios.post(
        `${apiUrl}/qrcode/scan`,
        {
          qrToken: data,
          deviceInfo: 'Expo Mobile App',
          location: 'Mobile Geofence App',
          latitude,
          longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.success) {
        setScanResult({
          success: true,
          message: response.data.message || 'ចុះវត្តមានបានជោគជ័យ!'
        });
      } else {
        setScanResult({
          success: false,
          message: response.data.message || 'មិនអាចចុះវត្តមានបានឡើយ។'
        });
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.message || 'មានបញ្ហាពេលផ្ញើវត្តមានទៅកាន់ Server។';
      setScanResult({
        success: false,
        message: errMsg
      });
    } finally {
      setScanLoading(false);
    }
  };

  const handleOpenScanner = async () => {
    if (!cameraPermission || !cameraPermission.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert('ត្រូវការកាមេរ៉ា', 'សូមបើកសិទ្ធិកាមេរ៉ាដើម្បីស្កេន QR Code។');
        return;
      }
    }
    setScanned(false);
    setScanResult(null);
    setCurrentScreen('scanner');
  };

  // Render screens
  if (currentScreen === 'loading') {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingScreenText}>កំពុងដំណើរការ...</Text>
      </View>
    );
  }

  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.bgGlow1} />
        <View style={styles.bgGlow2} />
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>🕐</Text>
            </View>
            <Text style={styles.brandTitle}>Kiosk Mobile</Text>
            <Text style={styles.brandSubtitle}>ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិក</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeader}>ចូលប្រើប្រាស់គណនី</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>អ៊ីមែល / Email</Text>
              <TextInput
                style={styles.input}
                placeholder="example@attendance.com"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>លេខសម្ងាត់ / Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API Server URL (សម្រាប់ LAN Wifi)</Text>
              <TextInput
                style={styles.input}
                placeholder="http://192.168.1.105:5050/api"
                placeholderTextColor="#64748b"
                value={apiUrl}
                onChangeText={setApiUrl}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>ចូលគណនី (Login)</Text>
            </TouchableOpacity>

            {/* Quick accounts selection for testing (matching website) */}
            <View style={styles.quickSection}>
              <Text style={styles.quickHeader}>សាកល្បងគណនីគំរូ / Quick Accounts</Text>
              <View style={styles.quickGrid}>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => fillQuickCredentials('admin@attendance.com', 'admin123')}
                >
                  <Text style={styles.quickRoleText}>Admin</Text>
                  <Text style={styles.quickEmailText} numberOfLines={1}>admin@attendance.com</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => fillQuickCredentials('hr@attendance.com', 'hr123')}
                >
                  <Text style={styles.quickRoleText}>HR</Text>
                  <Text style={styles.quickEmailText} numberOfLines={1}>hr@attendance.com</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => fillQuickCredentials('manager@attendance.com', 'manager123')}
                >
                  <Text style={styles.quickRoleText}>Manager</Text>
                  <Text style={styles.quickEmailText} numberOfLines={1}>manager@attendance.com</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => fillQuickCredentials('rath@attendance.com', 'emp123')}
                >
                  <Text style={styles.quickRoleText}>Employee</Text>
                  <Text style={styles.quickEmailText} numberOfLines={1}>rath@attendance.com</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'dashboard') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.welcomeText}>សួស្ដី, (Hello)</Text>
            <Text style={styles.nameText}>{user?.nameKh || user?.nameEn}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dashboardBody}>
          <View style={styles.profileCard}>
            <Text style={styles.profileHeader}>ព័ត៌មានគណនី</Text>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>អត្តលេខបុគ្គលិក:</Text>
              <Text style={styles.profileValue}>{user?.staffId}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>តួនាទី:</Text>
              <Text style={styles.profileValue}>{user?.role}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>សាខាចុះវត្តមាន:</Text>
              <Text style={styles.profileValue}>{user?.branch || 'មិនទាន់កំណត់'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>ម៉ោងការងារ:</Text>
              <Text style={styles.profileValue}>
                {user?.shift1Start} - {user?.shift2End}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.scanActionBtn} onPress={handleOpenScanner}>
            <Text style={styles.scanActionEmoji}>📷</Text>
            <Text style={styles.scanActionTitle}>ស្កេន QR Code ចុះវត្តមាន</Text>
            <Text style={styles.scanActionDesc}>Scan Check-in / Check-out QR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'scanner') {
    return (
      <View style={styles.scannerScreen}>
        <StatusBar barStyle="light-content" />
        {scanLoading ? (
          <View style={styles.scanFeedbackOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.scanFeedbackText}>កំពុងផ្ទៀងផ្ទាត់ទីតាំង GPS និងវត្តមាន...</Text>
          </View>
        ) : scanResult ? (
          <View style={styles.scanFeedbackOverlay}>
            <View style={[styles.resultCircle, scanResult.success ? styles.resultSuccess : styles.resultFailed]}>
              <Text style={styles.resultEmoji}>{scanResult.success ? '🎉' : '❌'}</Text>
            </View>
            <Text style={styles.resultTitle}>{scanResult.success ? 'ជោគជ័យ' : 'បរាជ័យ'}</Text>
            <Text style={styles.resultMessage}>{scanResult.message}</Text>
            <TouchableOpacity
              style={styles.resultActionBtn}
              onPress={() => setCurrentScreen('dashboard')}
            >
              <Text style={styles.resultActionText}>ត្រឡប់ទៅកាន់ Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scannerLayout}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />

            {/* Scanner HUD Overlay */}
            <View style={styles.hudOverlay}>
              <View style={styles.scanTargetBox} />
              <Text style={styles.hudText}>សូមតម្រង់កាមេរ៉ាទៅលើ QR Code របស់ Kiosk</Text>
            </View>

            <TouchableOpacity
              style={styles.closeScannerBtn}
              onPress={() => setCurrentScreen('dashboard')}
            >
              <Text style={styles.closeScannerBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  bgGlow1: {
    position: 'absolute',
    top: '5%',
    left: '-25%',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#4f46e5',
    opacity: 0.08,
  },
  bgGlow2: {
    position: 'absolute',
    bottom: '5%',
    right: '-25%',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#7c3aed',
    opacity: 0.06,
  },
  scrollContainer: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  loadingScreenText: {
    color: '#94a3b8',
    marginTop: 15,
    fontSize: 14,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  quickSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 20,
  },
  quickHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickBtn: {
    width: '48%',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  quickRoleText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  quickEmailText: {
    color: '#94a3b8',
    fontSize: 10,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  welcomeText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  dashboardBody: {
    padding: 24,
    flex: 1,
    justifyContent: 'space-between',
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  profileHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#818cf8',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  profileLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  profileValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scanActionBtn: {
    backgroundColor: '#312e81',
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 24,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 20,
  },
  scanActionEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  scanActionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scanActionDesc: {
    fontSize: 12,
    color: '#818cf8',
    marginTop: 4,
  },
  scannerScreen: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scanFeedbackOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  scanFeedbackText: {
    color: '#fff',
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
  resultCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resultSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  resultFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  resultEmoji: {
    fontSize: 48,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  resultActionBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  resultActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scannerLayout: {
    flex: 1,
    position: 'relative',
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  scanTargetBox: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: '#818cf8',
    borderRadius: 24,
    backgroundColor: 'transparent',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  hudText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  closeScannerBtn: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeScannerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
