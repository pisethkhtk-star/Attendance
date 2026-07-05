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
  StatusBar,
  Modal,
  Image,
  FlatList
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

export default function App() {
  // Screens: 'loading' | 'login' | 'dashboard' | 'attendance_history' | 'leave_history' | 'scanner'
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Login credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrl] = useState('http://192.168.88.170:5050/api');

  // Scanner states
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Personal QR states
  const [showMyQrModal, setShowMyQrModal] = useState(false);
  const [myQrImage, setMyQrImage] = useState('');
  const [myQrLoading, setMyQrLoading] = useState(false);

  // Dismissable alert banner state
  const [showBirthdayAlert, setShowBirthdayAlert] = useState(true);

  // Attendance History states
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Leave states
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState('Annual Leave');
  const [newLeaveStartDate, setNewLeaveStartDate] = useState('');
  const [newLeaveEndDate, setNewLeaveEndDate] = useState('');
  const [newLeaveDurationType, setNewLeaveDurationType] = useState('Full Day');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Today's attendance checking states
  const [todayRecord, setTodayRecord] = useState(null);
  const [nextAction, setNextAction] = useState('checkin_1'); // 'checkin_1' | 'checkout_1' | 'checkin_2' | 'checkout_2' | 'completed'
  const [isScanUnlocked, setIsScanUnlocked] = useState(false);
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState('');
  const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState(false);
  const [isSimulatingFaceScan, setIsSimulatingFaceScan] = useState(false);
  const [faceScanMessage, setFaceScanMessage] = useState('');

  // Custom rotated vector chevron for header/list items
  const ChevronRight = () => (
    <View style={styles.chevronContainer}>
      <View style={styles.chevronLine} />
    </View>
  );

  const ChevronLeft = () => (
    <View style={styles.chevronLeftContainer}>
      <View style={styles.chevronLeftLine} />
    </View>
  );

  // Helper for 12-hour AM/PM formatting
  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return '-';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;

    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];

    if (isNaN(hours)) return timeStr;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    const formattedHours = String(hours).padStart(2, '0');
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  // Helper for safe formatted date display (eg: 01 Jul 2026)
  const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

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

  const fetchTodayStatus = async () => {
    if (!token || !user) return;
    try {
      const res = await axios.get(`${apiUrl}/attendances/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.length > 0) {
        // Get today's date in Cambodia timezone (Asia/Phnom_Penh)
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Phnom_Penh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        
        const parts = formatter.formatToParts(now);
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const year = parts.find(p => p.type === 'year').value;
        const todayDateStr = `${year}-${month}-${day}`;

        // Find today's record from history logs in a timezone-safe manner
        const todayRec = res.data.find(item => {
          if (!item.attendanceDate) return false;
          const logDate = new Date(item.attendanceDate);
          const logParts = formatter.formatToParts(logDate);
          const lMonth = logParts.find(p => p.type === 'month').value;
          const lDay = logParts.find(p => p.type === 'day').value;
          const lYear = logParts.find(p => p.type === 'year').value;
          const logDateStr = `${lYear}-${lMonth}-${lDay}`;
          return logDateStr === todayDateStr;
        });

        if (todayRec) {
          setTodayRecord(todayRec);
          if (!todayRec.checkin1) {
            setNextAction('checkin_1');
          } else if (!todayRec.checkout1) {
            setNextAction('checkout_1');
          } else if (!todayRec.checkin2) {
            setNextAction('checkin_2');
          } else if (!todayRec.checkout2) {
            setNextAction('checkout_2');
          } else {
            setNextAction('completed');
          }
        } else {
          setTodayRecord(null);
          setNextAction('checkin_1');
        }
      } else {
        setTodayRecord(null);
        setNextAction('checkin_1');
      }
    } catch (err) {
      console.error('Error fetching today status:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTodayStatus();
    }
  }, [token]);

  // Fetch functions
  const fetchAttendanceHistory = async () => {
    setAttendanceLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/attendances/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setAttendanceLogs(res.data);
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      Alert.alert('កំហុស', 'មិនអាចទាញយកទិន្នន័យវត្តមានបានទេ។');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchLeaveHistory = async () => {
    setLeavesLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/leaves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setLeaves(res.data);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
      Alert.alert('កំហុស', 'មិនអាចទាញយកទិន្នន័យច្បាប់សម្រាកបានទេ។');
    } finally {
      setLeavesLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(`${apiUrl}/leave-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setLeaveTypes(res.data);
        if (res.data.length > 0) {
          setNewLeaveType(res.data[0].nameEn || res.data[0].nameKh || 'Annual Leave');
        }
      }
    } catch (err) {
      console.error('Error fetching leave types:', err);
    }
  };

  // Submit leave request
  const handleRequestLeaveSubmit = async () => {
    if (!newLeaveStartDate || !newLeaveEndDate || !newLeaveType || !newLeaveDurationType) {
      Alert.alert('បញ្ចូលព័ត៌មាន', 'សូមបញ្ចូលថ្ងៃខែចាប់ផ្តើម បញ្ចប់ និងប្រភេទច្បាប់សម្រាក។');
      return;
    }
    setSubmittingLeave(true);
    try {
      await axios.post(`${apiUrl}/leaves`, {
        staffId: user.staffId,
        startDate: newLeaveStartDate,
        endDate: newLeaveEndDate,
        durationType: newLeaveDurationType,
        leaveType: newLeaveType,
        reason: newLeaveReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('ជោគជ័យ', 'ការស្នើសុំច្បាប់សម្រាកត្រូវបានផ្ញើ!');
      setShowAddLeaveModal(false);
      setNewLeaveStartDate('');
      setNewLeaveEndDate('');
      setNewLeaveReason('');
      fetchLeaveHistory();
    } catch (err) {
      console.error('Error submitting leave:', err);
      Alert.alert('បរាជ័យ', err.response?.data?.message || 'មិនអាចផ្ញើសំណើសុំច្បាប់បានទេ។');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Time comparison helper (returns t1_mins - t2_mins)
  const compareTime = (t1, t2) => {
    if (!t1 || !t2) return 0;
    const [h1, m1] = t1.split(':').map(Number);
    const [h2, m2] = t2.split(':').map(Number);
    return (h1 * 60 + m1) - (h2 * 60 + m2);
  };

  const handleCheckPress = () => {
    if (nextAction === 'completed') {
      Alert.alert('រួចរាល់', 'អ្នកបានបំពេញវត្តមានថ្ងៃនេះរួចរាល់ហើយ!');
      return;
    }

    // Get current Cambodia time
    const now = new Date();
    const cambodiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" }));
    const currentHours = String(cambodiaTime.getHours()).padStart(2, '0');
    const currentMinutes = String(cambodiaTime.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    let isEarly = false;

    if (nextAction === 'checkout_1' && user?.shift1End) {
      if (compareTime(currentTimeStr, user.shift1End) < 0) {
        isEarly = true;
      }
    } else if (nextAction === 'checkout_2' && user?.shift2End) {
      if (compareTime(currentTimeStr, user.shift2End) < 0) {
        isEarly = true;
      }
    }

    if (isEarly) {
      setEarlyCheckoutReason('');
      setShowEarlyCheckoutModal(true);
    } else {
      setIsScanUnlocked(true);
      Alert.alert(
        'ផ្ទៀងផ្ទាត់រួចរាល់',
        'សូមធ្វើការស្កេន QR Code ឬ ស្កេនមុខ ដើម្បីចុះវត្តមាន។',
        [{ text: 'យល់ព្រម' }]
      );
    }
  };

  const handleSubmitEarlyReason = () => {
    if (!earlyCheckoutReason.trim()) {
      Alert.alert('បញ្ចូលព័ត៌មាន', 'សូមបញ្ចូលមូលហេតុនៃការចាកចេញមុនម៉ោងកំណត់។');
      return;
    }
    setShowEarlyCheckoutModal(false);
    setIsScanUnlocked(true);
    Alert.alert(
      'បានរក្សាទុកមូលហេតុ',
      'សូមធ្វើការស្កេន QR Code ឬ ស្កេនមុខ ដើម្បីចុះវត្តមាន។',
      [{ text: 'យល់ព្រម' }]
    );
  };

  const handleFaceScanSimulate = async () => {
    setIsSimulatingFaceScan(true);
    setFaceScanMessage('កំពុងស្វែងរកទម្រង់មុខ... (Detecting face...)');

    // Simulate 2 second scanning
    setTimeout(async () => {
      setFaceScanMessage('កំពុងផ្ទៀងផ្ទាត់ទិន្នន័យ... (Verifying face...)');
      try {
        const response = await axios.post(
          `${apiUrl}/attendances/log`,
          {
            staffId: user.staffId,
            action: nextAction,
            note: earlyCheckoutReason ? `Face Scan: ${earlyCheckoutReason}` : 'Face Scan'
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.data) {
          Alert.alert('ជោគជ័យ', 'ស្កេនទម្រង់មុខជោគជ័យ!');
          setIsScanUnlocked(false);
          setEarlyCheckoutReason('');
          fetchTodayStatus();
        } else {
          Alert.alert('បរាជ័យ', 'មិនអាចផ្ទៀងផ្ទាត់ទម្រង់មុខបានឡើយ។');
        }
      } catch (err) {
        console.error('Face scan error:', err);
        Alert.alert('បរាជ័យ', err.response?.data?.message || 'មានបញ្ហាពេលផ្ញើវត្តមានទៅកាន់ Server។');
      } finally {
        setIsSimulatingFaceScan(false);
        setFaceScanMessage('');
      }
    }, 2000);
  };

  // Login execution
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('បញ្ចូលព័ត៌មាន', 'សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់របស់អ្នក។');
      return;
    }

    setCurrentScreen('loading');
    try {
      await SecureStore.setItemAsync('apiUrl', apiUrl);

      const res = await axios.post(`${apiUrl}/auth/login`, {
        email: email.trim(),
        password
      });

      if (res.data && res.data.token) {
        const userToken = res.data.token;
        const userData = JSON.stringify(res.data.user);

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
    Alert.alert(
      'ចាកចេញ',
      'តើអ្នកចង់ចាកចេញពីគណនីមែនទេ?',
      [
        { text: 'បោះបង់', style: 'cancel' },
        {
          text: 'ចាកចេញ',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('userToken');
              await SecureStore.deleteItemAsync('userData');
              setToken(null);
              setUser(null);
              setCurrentScreen('login');
            } catch (err) {
              console.error('Error logging out:', err);
            }
          }
        }
      ]
    );
  };

  // QR Code scanned handler
  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setScanLoading(true);
    setScanResult(null);

    try {
      let locationRes = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = locationRes.coords;

      const cleanData = (data || '').trim();
      const endpoint = cleanData.startsWith('branch_qr:')
        ? `${apiUrl}/qrcode/scan-branch`
        : `${apiUrl}/qrcode/scan`;

      const response = await axios.post(
        endpoint,
        {
          qrToken: cleanData,
          deviceInfo: 'Expo Mobile App',
          location: 'Mobile Geofence App',
          latitude,
          longitude,
          note: earlyCheckoutReason,
          action: nextAction
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
        setIsScanUnlocked(false);
        setEarlyCheckoutReason('');
        fetchTodayStatus(); // Refresh dashboard states immediately
      } else {
        setScanResult({
          success: false,
          message: response.data.message || 'មិនអាចចុះវត្តមានបានឡើយ។'
        });
      }
    } catch (error) {
      console.error("Scan Error Response:", error.response?.data);
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

  const handleOpenMyQr = async () => {
    setShowMyQrModal(true);
    setMyQrLoading(true);
    setMyQrImage('');
    try {
      const res = await axios.get(`${apiUrl}/qrcode/generate/${user.staffId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.qrImage) {
        setMyQrImage(res.data.qrImage);
      }
    } catch (err) {
      console.error('Error fetching personal QR:', err);
      Alert.alert('កំហុស', 'មិនអាចទាញយក QR Code ផ្ទាល់ខ្លួនបានទេ។');
    } finally {
      setMyQrLoading(false);
    }
  };

  // Navigations
  const handleNavAttendance = () => {
    setCurrentScreen('attendance_history');
    fetchAttendanceHistory();
  };

  const handleNavLeave = () => {
    setCurrentScreen('leave_history');
    fetchLeaveHistory();
    fetchLeaveTypes();
    // Preset new request date
    const todayStr = new Date().toISOString().split('T')[0];
    setNewLeaveStartDate(todayStr);
    setNewLeaveEndDate(todayStr);
    setNewLeaveDurationType('Full Day');
  };

  // Rendering screen branches
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
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>🕐</Text>
            </View>
            <Text style={styles.brandTitle}>CheckinMe</Text>
            <Text style={styles.brandSubtitle}>ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិក</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeader}>ចូលប្រើប្រាស់គណនី</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>អ៊ីមែល / Email</Text>
              <TextInput
                style={styles.input}
                placeholder="example@attendance.com"
                placeholderTextColor="#94a3b8"
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
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API Server URL (សម្រាប់ LAN Wifi)</Text>
              <TextInput
                style={styles.input}
                placeholder="http://10.145.48.140:5050/api"
                placeholderTextColor="#94a3b8"
                value={apiUrl}
                onChangeText={setApiUrl}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>ចូលគណនី (Login)</Text>
            </TouchableOpacity>

            {/* Quick Login Grid */}
            <View style={styles.quickSection}>
              <Text style={styles.quickHeader}>សាកល្បងគណនីគំរូ / Quick Accounts</Text>
              <View style={styles.quickGrid}>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => { setEmail('admin@attendance.com'); setPassword('admin123'); }}
                >
                  <Text style={styles.quickRoleText}>Admin</Text>
                  <Text style={styles.quickEmailText} numberOfLines={1}>admin@attendance.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => { setEmail('hr@attendance.com'); setPassword('hr123'); }}
                >
                  <Text style={styles.quickRoleText}>HR</Text>
                  <Text style={styles.quickEmailText} numberOfLines={1}>hr@attendance.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => { setEmail('manager@attendance.com'); setPassword('manager123'); }}
                >
                  <Text style={styles.quickRoleText}>Manager</Text>
                  <Text style={styles.quickEmailText} numberOfLines={1}>manager@attendance.com</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => { setEmail('rath@attendance.com'); setPassword('emp123'); }}
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
      <SafeAreaView style={styles.dashboardContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        {/* Header matching image exactly */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CheckinMe</Text>
          <TouchableOpacity style={styles.headerChatBtn} onPress={handleLogout}>
            {/* Styled Blue chat icon placeholder */}
            <Text style={styles.headerChatEmoji}>💬</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.dashboardScroll}>
          {/* Dismissable Birthday alert banner */}
          {showBirthdayAlert && (
            <View style={styles.birthdayAlert}>
              <View style={styles.birthdayContent}>
                <Text style={styles.birthdayTitle}>Check your Birthday! 🎂</Text>
                <Text style={styles.birthdaySubtitle}>Please confirm your birthday.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBirthdayAlert(false)} style={styles.dismissAlertBtn}>
                <Text style={styles.dismissAlertText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Golden/Black Premium Card (KS Resident style) */}
          <View style={styles.premiumCard}>
            <View style={styles.premiumCardBody}>
              <View style={styles.goldLogoCircle}>
                <Text style={styles.goldLogoLetters}>KS</Text>
              </View>
              <Text style={styles.premiumBrandName}>KS RESIDENT</Text>
            </View>

            {/* Card Footer inside */}
            <View style={styles.premiumCardFooter}>
              <View style={styles.footerBrandRow}>
                <View style={styles.miniLogoBadge}>
                  <Text style={styles.miniLogoText}>KS</Text>
                </View>
                <View style={styles.cardDetailsColumn}>
                  <Text style={styles.footerBrandTitle}>{user?.nameKh || user?.nameEn || 'KS Resident'}</Text>
                  <Text style={styles.footerBrandSubtitle}>Staff ID: {user?.staffId || 'N/A'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.myCardBtn} onPress={handleOpenMyQr}>
                <Text style={styles.myCardBtnText}>My Card</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Styled List Menus Panel */}
          <View style={styles.menuPanel}>
            {/* Attendance Menu */}
            <TouchableOpacity style={styles.menuRow} onPress={handleNavAttendance}>
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: '#ffedd5' }]}>
                  <Text style={styles.menuEmojiText}>📅</Text>
                </View>
                <Text style={styles.menuRowText}>Attendance</Text>
              </View>
              <View style={styles.menuRowRight}>
                <ChevronRight />
              </View>
            </TouchableOpacity>

            {/* Leave Menu */}
            <TouchableOpacity style={styles.menuRow} onPress={handleNavLeave}>
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: '#dbeafe' }]}>
                  <Text style={styles.menuEmojiText}>📝</Text>
                </View>
                <Text style={styles.menuRowText}>Leave</Text>
              </View>
              <View style={styles.menuRowRight}>
                <ChevronRight />
              </View>
            </TouchableOpacity>

            {/* Overtime Menu */}
            <TouchableOpacity style={styles.menuRow} onPress={() => Alert.alert('Overtime', 'មុខងារនេះនឹងមកដល់ឆាប់ៗនេះ (Overtime feature is coming soon!)')}>
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: '#dcfce7' }]}>
                  <Text style={styles.menuEmojiText}>⏱️</Text>
                </View>
                <Text style={styles.menuRowText}>Overtime</Text>
              </View>
              <View style={styles.menuRowRight}>
                <ChevronRight />
              </View>
            </TouchableOpacity>

            {/* My Calendar Menu */}
            <TouchableOpacity style={styles.menuRow} onPress={() => Alert.alert('Calendar', 'បង្ហាញប្រតិទិនសង្ខេប (Show calendar schedule)')}>
              <View style={styles.menuRowLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: '#f3e8ff' }]}>
                  <Text style={styles.menuEmojiText}>🗓️</Text>
                </View>
                <Text style={styles.menuRowText}>My Calendar</Text>
              </View>
              <View style={styles.menuRowRight}>
                <ChevronRight />
              </View>
            </TouchableOpacity>
          </View>

          {/* Section Header: Dashboard */}
          <Text style={styles.sectionHeaderTitle}>Dashboard</Text>

          {/* Work Hours & Attendance Control Panel */}
          <View style={styles.attendanceControlPanel}>
            <Text style={styles.panelTitle}>ម៉ោងធ្វើការ និងវត្តមានថ្ងៃនេះ / Shift & Attendance</Text>
            
            {/* Shifts table */}
            <View style={styles.shiftsRow}>
              <View style={styles.shiftCard}>
                <Text style={styles.shiftCardTitle}>☀️ វេនព្រឹក / Shift 1</Text>
                <Text style={styles.shiftCardTime}>ម៉ោងកំណត់៖ {user?.shift1Start || '08:00'} - {user?.shift1End || '12:00'}</Text>
                <View style={styles.shiftStatusLine}>
                  <Text style={styles.shiftStatusLabel}>ចូល (In)៖ </Text>
                  <Text style={[styles.shiftStatusVal, todayRecord?.checkin1 ? styles.statusSuccessText : null]}>
                    {formatTime12Hour(todayRecord?.checkin1)}
                  </Text>
                </View>
                <View style={styles.shiftStatusLine}>
                  <Text style={styles.shiftStatusLabel}>ចេញ (Out)៖ </Text>
                  <Text style={[styles.shiftStatusVal, todayRecord?.checkout1 ? styles.statusSuccessText : null]}>
                    {formatTime12Hour(todayRecord?.checkout1)}
                  </Text>
                </View>
              </View>

              <View style={styles.shiftCard}>
                <Text style={styles.shiftCardTitle}>⛅ វេនល្ងាច / Shift 2</Text>
                <Text style={styles.shiftCardTime}>ម៉ោងកំណត់៖ {user?.shift2Start || '13:00'} - {user?.shift2End || '17:00'}</Text>
                <View style={styles.shiftStatusLine}>
                  <Text style={styles.shiftStatusLabel}>ចូល (In)៖ </Text>
                  <Text style={[styles.shiftStatusVal, todayRecord?.checkin2 ? styles.statusSuccessText : null]}>
                    {formatTime12Hour(todayRecord?.checkin2)}
                  </Text>
                </View>
                <View style={styles.shiftStatusLine}>
                  <Text style={styles.shiftStatusLabel}>ចេញ (Out)៖ </Text>
                  <Text style={[styles.shiftStatusVal, todayRecord?.checkout2 ? styles.statusSuccessText : null]}>
                    {formatTime12Hour(todayRecord?.checkout2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Check Button */}
            <TouchableOpacity 
              style={[
                styles.checkBtn,
                nextAction === 'completed' ? styles.checkBtnCompleted : styles.checkBtnActive
              ]} 
              onPress={handleCheckPress}
            >
              <Text style={styles.checkBtnText}>
                {nextAction === 'checkin_1' && '👉 ចុច Check-In វេនព្រឹក'}
                {nextAction === 'checkout_1' && '👉 ចុច Check-Out វេនព្រឹក'}
                {nextAction === 'checkin_2' && '👉 ចុច Check-In វេនល្ងាច'}
                {nextAction === 'checkout_2' && '👉 ចុច Check-Out វេនល្ងាច'}
                {nextAction === 'completed' && '🎉 វត្តមានថ្ងៃនេះពេញលេញរួចរាល់'}
              </Text>
            </TouchableOpacity>

            {/* Unlock Status Message */}
            {!isScanUnlocked && nextAction !== 'completed' && (
              <Text style={styles.lockHintText}>🔒 សូមចុចប៊ូតុង Check ខាងលើដើម្បីបើកដំណើរការស្កេន</Text>
            )}
            {isScanUnlocked && (
              <Text style={styles.unlockHintText}>🔓 បានបើកដំណើរការស្កេនវត្តមានហើយ! សូមជ្រើសរើស៖</Text>
            )}

            {/* Scanner buttons */}
            <View style={styles.scanButtonsRow}>
              {/* Face Scan Button */}
              <TouchableOpacity
                style={[
                  styles.scanActionOptionBtn,
                  isScanUnlocked ? styles.scanOptionEnabled : styles.scanOptionDisabled
                ]}
                disabled={!isScanUnlocked}
                onPress={handleFaceScanSimulate}
              >
                <Text style={styles.scanOptionEmoji}>👤</Text>
                <Text style={styles.scanOptionTitle}>ស្កេនទម្រង់មុខ</Text>
                <Text style={styles.scanOptionSubtitle}>Face Scan</Text>
              </TouchableOpacity>

              {/* QR Scan Button */}
              <TouchableOpacity
                style={[
                  styles.scanActionOptionBtn,
                  isScanUnlocked ? styles.scanOptionEnabled : styles.scanOptionDisabled
                ]}
                disabled={!isScanUnlocked}
                onPress={handleOpenScanner}
              >
                <Text style={styles.scanOptionEmoji}>📷</Text>
                <Text style={styles.scanOptionTitle}>ស្កេន QR Code</Text>
                <Text style={styles.scanOptionSubtitle}>QR Scanner</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Early Checkout Modal */}
          <Modal
            visible={showEarlyCheckoutModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowEarlyCheckoutModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.earlyCheckoutModalContent}>
                <Text style={styles.earlyCheckoutModalTitle}>⚠️ ចាកចេញមុនម៉ោងកំណត់ (Early Check-out)</Text>
                <Text style={styles.earlyCheckoutModalDesc}>
                  ម៉ោងចាកចេញរបស់អ្នកគឺលឿនជាងម៉ោងកំណត់។ សូមបំពេញមូលហេតុនៃការចាកចេញមុនម៉ោងកំណត់៖
                </Text>
                
                <TextInput
                  style={styles.earlyCheckoutInput}
                  placeholder="សរសេរមូលហេតុនៅទីនេះ..."
                  placeholderTextColor="#94a3b8"
                  value={earlyCheckoutReason}
                  onChangeText={setEarlyCheckoutReason}
                  multiline={true}
                />

                <View style={styles.formButtonRow}>
                  <TouchableOpacity
                    style={[styles.formBtn, styles.formBtnCancel]}
                    onPress={() => setShowEarlyCheckoutModal(false)}
                  >
                    <Text style={styles.formBtnCancelText}>បោះបង់</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.formBtn, styles.formBtnSubmit]}
                    onPress={handleSubmitEarlyReason}
                  >
                    <Text style={styles.formBtnSubmitText}>យល់ព្រម (Submit)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Face Scan Simulator Modal */}
          <Modal
            visible={isSimulatingFaceScan}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {}}
          >
            <View style={styles.faceScanOverlay}>
              <View style={styles.faceScanContainer}>
                <View style={styles.faceScannerOutline}>
                  <Text style={styles.faceScanEmoji}>👤</Text>
                  <ActivityIndicator size="large" color="#3b82f6" style={styles.faceScanSpinner} />
                </View>
                <Text style={styles.faceScanTitle}>ស្កេនទម្រង់មុខ (Face Scanner)</Text>
                <Text style={styles.faceScanSubtitle}>{faceScanMessage}</Text>
              </View>
            </View>
          </Modal>
        </ScrollView>

        {/* Bottom Tab Bar matching design image */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentScreen('dashboard')}>
            <Text style={[styles.tabIcon, { color: '#3b82f6' }]}>🏠</Text>
            <Text style={[styles.tabText, { color: '#3b82f6' }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => Alert.alert('Benefits', 'អត្ថប្រយោជន៍របស់បុគ្គលិក (Employee Benefits)')}>
            <Text style={styles.tabIcon}>🔳</Text>
            <Text style={styles.tabText}>Benefit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => Alert.alert('Notifications', 'គ្មានសារដំណឹងថ្មីទេ (No new notifications)')}>
            <View style={styles.tabBadgeContainer}>
              <Text style={styles.tabIcon}>🔔</Text>
              <View style={styles.tabRedDot} />
            </View>
            <Text style={styles.tabText}>Notify</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={handleLogout}>
            <Text style={styles.tabIcon}>👤</Text>
            <Text style={styles.tabText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Personal QR Modal */}
        <Modal
          visible={showMyQrModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMyQrModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>QR Code ផ្ទាល់ខ្លួន / My QR</Text>
              <Text style={styles.modalSubtitle}>{user?.nameKh || user?.nameEn}</Text>

              <View style={styles.qrContainer}>
                {myQrLoading ? (
                  <ActivityIndicator size="large" color="#6366f1" />
                ) : myQrImage ? (
                  <Image source={{ uri: myQrImage }} style={styles.qrImage} />
                ) : (
                  <Text style={styles.qrErrorText}>Error loading QR</Text>
                )}
              </View>

              <Text style={styles.qrUsageHint}>
                ប្រើសម្រាប់ស្កេនឡុកចូលប្រព័ន្ធតាមរយៈ Website
              </Text>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setShowMyQrModal(false)}
              >
                <Text style={styles.closeModalBtnText}>បិទ (Close)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'attendance_history') {
    return (
      <SafeAreaView style={styles.dashboardContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        {/* Screen Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')} style={styles.backBtn}>
            <ChevronLeft />
            <Text style={styles.backBtnText}> ត្រឡប់</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>វត្តមាន (Attendance)</Text>
          <TouchableOpacity onPress={() => setCurrentScreen('attendance_report')} style={styles.headerReportBtn}>
            <Text style={styles.headerReportBtnText}>Report</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.attendanceTodayContainer}>
          {/* Current Date Display */}
          <View style={styles.todayDatePanel}>
            <Text style={styles.todayDateTextKh}>📅 វត្តមានថ្ងៃនេះ</Text>
            <Text style={styles.todayDateTextEn}>{formatDateString(new Date().toISOString())}</Text>
          </View>

          {/* Today's Card */}
          <View style={styles.todayDetailedCard}>
            <Text style={styles.cardStatusHeader}>សង្ខេបវត្តមានប្រចាំថ្ងៃ / Today's Summary</Text>
            
            {/* Shift 1 Details */}
            <View style={styles.todayDetailShiftBox}>
              <Text style={styles.shiftBoxTitle}>☀️ វេនទី ១ (Shift 1)៖ {user?.shift1Start || '08:00'} - {user?.shift1End || '12:00'}</Text>
              <View style={styles.shiftDetailGrid}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Check In 1</Text>
                  <Text style={[styles.detailValue, todayRecord?.checkin1 ? styles.statusSuccessText : null]}>
                    {formatTime12Hour(todayRecord?.checkin1)}
                  </Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Check Out 1</Text>
                  <Text style={[styles.detailValue, todayRecord?.checkout1 ? styles.statusSuccessText : null]}>
                    {formatTime12Hour(todayRecord?.checkout1)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Shift 2 Details */}
            <View style={styles.todayDetailShiftBox}>
              <Text style={styles.shiftBoxTitle}>⛅ វេនទី ២ (Shift 2)៖ {user?.shift2Start || '13:00'} - {user?.shift2End || '17:00'}</Text>
              <View style={styles.shiftDetailGrid}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Check In 2</Text>
                  <Text style={[styles.detailValue, todayRecord?.checkin2 ? styles.statusSuccessText : null]}>
                    {formatTime12Hour(todayRecord?.checkin2)}
                  </Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Check Out 2</Text>
                  <Text style={[styles.detailValue, todayRecord?.checkout2 ? styles.statusSuccessText : null]}>
                    {formatTime12Hour(todayRecord?.checkout2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Notes if any */}
            {todayRecord?.note ? (
              <View style={styles.todayNoteBox}>
                <Text style={styles.todayNoteLabel}>📝 មូលហេតុ/កំណត់សម្គាល់៖</Text>
                <Text style={styles.todayNoteVal}>{todayRecord.note}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'attendance_report') {
    // Filter 2 months data (last 60 days)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const reportLogs = attendanceLogs.filter(item => {
      if (!item.attendanceDate) return false;
      const recordDate = new Date(item.attendanceDate);
      return recordDate >= twoMonthsAgo;
    });

    return (
      <SafeAreaView style={styles.dashboardContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        {/* Screen Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('attendance_history')} style={styles.backBtn}>
            <ChevronLeft />
            <Text style={styles.backBtnText}> ត្រឡប់</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>របាយការណ៍ ២ខែ</Text>
          <View style={{ width: 60 }} />
        </View>

        {attendanceLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loaderText}>កំពុងទាញយកទិន្នន័យ...</Text>
          </View>
        ) : (
          <FlatList
            data={reportLogs}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            style={{ flex: 1 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>មិនមានកំណត់ត្រាវត្តមាន ២ខែចុងក្រោយនេះទេ។</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <Text style={styles.logCardDate}>📅 {formatDateString(item.attendanceDate)}</Text>

                  {/* Status Badges */}
                  <View style={{ flexDirection: 'row' }}>
                    {item.isLate && (
                      <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.badgeText, { color: '#d97706' }]}>យឺត (Late)</Text>
                      </View>
                    )}
                    {item.isEarlyLeave && (
                      <View style={[styles.badge, { backgroundColor: '#fee2e2', marginLeft: 4 }]}>
                        <Text style={[styles.badgeText, { color: '#dc2626' }]}>ចេញមុន (Early)</Text>
                      </View>
                    )}
                    {!item.isLate && !item.isEarlyLeave && (
                      <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                        <Text style={[styles.badgeText, { color: '#059669' }]}>ទាន់ពេល</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Details layout */}
                <View style={styles.logCardBody}>
                  <View style={styles.logColumn}>
                    <Text style={styles.logLabel}>Check In 1</Text>
                    <Text style={styles.logValue}>{formatTime12Hour(item.checkin1)}</Text>
                  </View>
                  <View style={styles.logColumn}>
                    <Text style={styles.logLabel}>Check Out 1</Text>
                    <Text style={styles.logValue}>{formatTime12Hour(item.checkout1)}</Text>
                  </View>
                  <View style={styles.logColumn}>
                    <Text style={styles.logLabel}>Check In 2</Text>
                    <Text style={styles.logValue}>{formatTime12Hour(item.checkin2)}</Text>
                  </View>
                  <View style={styles.logColumn}>
                    <Text style={styles.logLabel}>Check Out 2</Text>
                    <Text style={styles.logValue}>{formatTime12Hour(item.checkout2)}</Text>
                  </View>
                </View>

                {item.note ? (
                  <Text style={styles.logNote}>📝 ហេតុផល៖ {item.note}</Text>
                ) : null}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  if (currentScreen === 'leave_history') {
    return (
      <SafeAreaView style={styles.dashboardContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        {/* Screen Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')} style={styles.backBtn}>
            <ChevronLeft />
            <Text style={styles.backBtnText}> ត្រឡប់</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ច្បាប់សម្រាក (Leaves)</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Action Button: Request Leave */}
        <TouchableOpacity style={styles.requestLeaveBtn} onPress={() => setShowAddLeaveModal(true)}>
          <Text style={styles.requestLeaveBtnText}>+ ស្នើសុំច្បាប់សម្រាក (Request Leave)</Text>
        </TouchableOpacity>

        {leavesLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loaderText}>កំពុងទាញយកទិន្នន័យ...</Text>
          </View>
        ) : (
          <FlatList
            data={leaves}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            style={{ flex: 1 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>មិនទាន់មានសំណើសុំច្បាប់សម្រាកនៅឡើយ។</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <Text style={styles.leaveCardType}>📝 {item.leaveType}</Text>

                  {/* Status Pills */}
                  <View style={[
                    styles.badge,
                    item.status === 'Approved' ? { backgroundColor: '#d1fae5' } :
                      item.status === 'Rejected' ? { backgroundColor: '#fee2e2' } :
                        { backgroundColor: '#e0f2fe' }
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      item.status === 'Approved' ? { color: '#059669' } :
                        item.status === 'Rejected' ? { color: '#dc2626' } :
                          { color: '#0284c7' }
                    ]}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.leaveCardBody}>
                  <Text style={styles.leaveInfoText}>📅 ថ្ងៃសុំច្បាប់៖ {formatDateString(item.leaveDate)}</Text>
                  <Text style={styles.leaveInfoText}>⏱️ រយៈពេល៖ {item.amountDays} ថ្ងៃ</Text>
                  {item.reason ? (
                    <Text style={styles.leaveReasonText}>💬 មូលហេតុ៖ {item.reason}</Text>
                  ) : null}
                  {item.managerName ? (
                    <Text style={styles.leaveManagerText}>👤 អនុម័តដោយ៖ {item.managerName}</Text>
                  ) : null}
                </View>
              </View>
            )}
          />
        )}

        {/* Request Leave Form Modal */}
        <Modal
          visible={showAddLeaveModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddLeaveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.formModalContent}>
              <Text style={styles.formModalTitle}>ស្នើសុំច្បាប់សម្រាក (New Leave)</Text>

              {/* Leave Type picker simulated */}
              <Text style={styles.formLabel}>ប្រភេទច្បាប់ (Leave Type)</Text>
              <View style={styles.pickerSelectorContainer}>
                {['Annual Leave', 'Sick Leave', 'Personal Leave'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pickerOption, newLeaveType === type ? styles.pickerOptionActive : null]}
                    onPress={() => setNewLeaveType(type)}
                  >
                    <Text style={[styles.pickerOptionText, newLeaveType === type ? styles.pickerOptionTextActive : null]}>
                      {type === 'Annual Leave' ? '🌴 Annual' : type === 'Sick Leave' ? '🤒 Sick' : '👤 Personal'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date Inputs Range */}
              <Text style={styles.formLabel}>ថ្ងៃចាប់ផ្ដើម (Start Date: YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2026-07-01"
                placeholderTextColor="#94a3b8"
                value={newLeaveStartDate}
                onChangeText={setNewLeaveStartDate}
              />

              <Text style={styles.formLabel}>ថ្ងៃបញ្ចប់ (End Date: YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2026-07-03"
                placeholderTextColor="#94a3b8"
                value={newLeaveEndDate}
                onChangeText={setNewLeaveEndDate}
              />

              {/* Duration Selection (Full Day / Morning / Afternoon) */}
              <Text style={styles.formLabel}>រយៈពេលក្នុងមួយថ្ងៃ (Duration Per Day)</Text>
              <View style={styles.pickerSelectorContainer}>
                {['Full Day', 'Morning', 'Afternoon'].map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[styles.pickerOption, newLeaveDurationType === dur ? styles.pickerOptionActive : null]}
                    onPress={() => setNewLeaveDurationType(dur)}
                  >
                    <Text style={[styles.pickerOptionText, newLeaveDurationType === dur ? styles.pickerOptionTextActive : null]}>
                      {dur === 'Full Day' ? '☀️ Full Day' : dur === 'Morning' ? '🌅 Morning' : '🌆 Afternoon'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reason Input */}
              <Text style={styles.formLabel}>មូលហេតុ (Reason)</Text>
              <TextInput
                style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="មូលហេតុនៃការសុំច្បាប់..."
                placeholderTextColor="#94a3b8"
                value={newLeaveReason}
                onChangeText={setNewLeaveReason}
                multiline={true}
              />

              {/* Buttons */}
              <View style={styles.formButtonRow}>
                <TouchableOpacity
                  style={[styles.formBtn, styles.formBtnCancel]}
                  onPress={() => setShowAddLeaveModal(false)}
                >
                  <Text style={styles.formBtnCancelText}>បោះបង់</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formBtn, styles.formBtnSubmit]}
                  onPress={handleRequestLeaveSubmit}
                  disabled={submittingLeave}
                >
                  {submittingLeave ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.formBtnSubmitText}>ផ្ញើសំណើ</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  // Global colors matching clean light mode
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingScreenText: {
    color: '#64748b',
    marginTop: 15,
    fontSize: 14,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 16,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  quickSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 20,
  },
  quickHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  quickRoleText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  quickEmailText: {
    color: '#64748b',
    fontSize: 10,
  },

  // Dashboard Styles (Matching Screenshot)
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerChatEmoji: {
    fontSize: 20,
    color: '#fff',
  },
  dashboardScroll: {
    padding: 20,
    paddingBottom: 100,
  },
  birthdayAlert: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fffdf5',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  birthdayContent: {
    flex: 1,
  },
  birthdayTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d97706',
  },
  birthdaySubtitle: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 2,
  },
  dismissAlertBtn: {
    padding: 4,
  },
  dismissAlertText: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: 'bold',
  },

  // Premium KS Resident Card (Dark with Gold details)
  premiumCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  premiumCardBody: {
    padding: 24,
    alignItems: 'center',
  },
  goldLogoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: '#e5c158',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  goldLogoLetters: {
    color: '#e5c158',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  premiumBrandName: {
    color: '#e5c158',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginTop: 4,
  },
  premiumCardFooter: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#fafafb',
    borderWidth: 1,
    borderColor: '#e5c158',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniLogoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#e5c158',
  },
  cardDetailsColumn: {
    marginLeft: 10,
  },
  footerBrandTitle: {
    color: '#171717',
    fontSize: 13,
    fontWeight: 'bold',
  },
  footerBrandSubtitle: {
    color: '#737373',
    fontSize: 10.5,
    marginTop: 1,
  },
  myCardBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  myCardBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Menu Panel (White Card)
  menuPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuEmojiText: {
    fontSize: 20,
  },
  menuRowText: {
    marginLeft: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuRowRight: {
    backgroundColor: '#f1f5f9',
    width: 32,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Custom rotated chevrons
  chevronContainer: {
    width: 6,
    height: 6,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#3b82f6',
    transform: [{ rotate: '45deg' }],
  },
  chevronLeftContainer: {
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#3b82f6',
    transform: [{ rotate: '45deg' }],
  },

  // Other components
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 24,
    marginBottom: 12,
  },
  quickScanPanelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  quickScanEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  quickScanTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  quickScanSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  // Bottom Tab Bar
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    color: '#94a3b8',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 4,
  },
  tabBadgeContainer: {
    position: 'relative',
  },
  tabRedDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
  },

  // Back Button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // History Lists
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 10,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 40,
  },
  logCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    paddingBottom: 10,
    marginBottom: 10,
  },
  logCardDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  logCardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  logColumn: {
    width: '48%',
    marginBottom: 10,
  },
  logLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  logValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  logNote: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 6,
  },

  // Leaves
  requestLeaveBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  requestLeaveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  leaveCardType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  leaveCardBody: {
    paddingTop: 4,
  },
  leaveInfoText: {
    fontSize: 12.5,
    color: '#1e293b',
    marginVertical: 3,
  },
  leaveReasonText: {
    fontSize: 12.5,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
  leaveManagerText: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },

  // Leave Form inside Modal
  formModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  formModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  formLabel: {
    color: '#64748b',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0f172a',
    fontSize: 13,
  },
  pickerSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pickerOption: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  pickerOptionActive: {
    backgroundColor: '#3b82f6',
  },
  pickerOptionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  pickerOptionTextActive: {
    color: '#ffffff',
  },
  formButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  formBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  formBtnCancel: {
    backgroundColor: '#f1f5f9',
  },
  formBtnCancelText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: 'bold',
  },
  formBtnSubmit: {
    backgroundColor: '#3b82f6',
  },
  formBtnSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // QR Code Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  qrContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrImage: {
    width: 176,
    height: 176,
  },
  qrErrorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  qrUsageHint: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20,
  },
  closeModalBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Scanner Screen
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

  // Attendance Control styles
  attendanceControlPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  panelTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  shiftsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  shiftCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shiftCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  shiftCardTime: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 10,
  },
  shiftStatusLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  shiftStatusLabel: {
    fontSize: 10,
    color: '#475569',
  },
  shiftStatusVal: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  statusSuccessText: {
    color: '#10b981',
    fontWeight: '700',
  },
  checkBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  checkBtnActive: {
    backgroundColor: '#3b82f6',
  },
  checkBtnCompleted: {
    backgroundColor: '#10b981',
  },
  checkBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  lockHintText: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  unlockHintText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  scanButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  scanActionOptionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scanOptionEnabled: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  scanOptionDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.6,
  },
  scanOptionEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  scanOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  scanOptionSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  
  // Early Checkout Modal styles
  earlyCheckoutModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  earlyCheckoutModalTitle: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  earlyCheckoutModalDesc: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  earlyCheckoutInput: {
    height: 90,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 12,
    color: '#0f172a',
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  // Face Scan Simulator Modal styles
  faceScanOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceScanContainer: {
    alignItems: 'center',
    padding: 24,
  },
  faceScannerOutline: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    marginBottom: 32,
  },
  faceScanSpinner: {
    position: 'absolute',
  },
  faceScanEmoji: {
    fontSize: 72,
    color: '#3b82f6',
    opacity: 0.8,
  },
  faceScanTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  faceScanSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },

  // Today Highlight inside Attendance History Screen
  todayAttendanceHeaderCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  todayHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 12,
  },
  todayGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  todayGridCol: {
    alignItems: 'center',
    flex: 1,
  },
  todayGridLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  todayGridValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  todayNoteText: {
    marginTop: 10,
    fontSize: 11,
    color: '#475569',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 10,
    marginTop: 4,
  },

  // Attendance Today Detailed screen styles
  headerReportBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  headerReportBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  attendanceTodayContainer: {
    padding: 20,
  },
  todayDatePanel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  todayDateTextKh: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4,
  },
  todayDateTextEn: {
    fontSize: 12,
    color: '#64748b',
  },
  todayDetailedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardStatusHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  todayDetailShiftBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shiftBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },
  shiftDetailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailCol: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  todayNoteBox: {
    marginTop: 8,
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  todayNoteLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#be123c',
    marginBottom: 4,
  },
  todayNoteVal: {
    fontSize: 11,
    color: '#9f1239',
  },
});
